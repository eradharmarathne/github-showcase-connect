import { Calendar, Eye } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { UpcomingBookingsSkeleton } from "@/components/skeleton/upcoming-bookings-skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/context/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";

type Reservation = Tables<"reservations"> & {
	locations: Tables<"locations">;
	rooms: Tables<"rooms">;
};

interface UpcomingBookingsProps {
	selectedLocation: string;
	hasCalendarPermission: boolean;
}

export function UpcomingBookings({
	selectedLocation,
	hasCalendarPermission,
}: UpcomingBookingsProps) {
	const [loading, setLoading] = useState(true);
	const [upcomingReservations, setUpcomingReservations] = useState<
		Reservation[]
	>([]);
	const { tenant } = useAuth();
	const { t } = useTranslation();

	useEffect(() => {
		const fetchReservationsData = async () => {
			if (!tenant?.id) {
				setLoading(false);
				return;
			}

			try {
				// Get locations for the tenant first to filter by tenant
				const { data: tenantLocations } = await supabase
					.from("locations")
					.select("id")
					.eq("tenant_id", tenant.id)
					.eq("is_active", true);

				const tenantLocationIds = tenantLocations?.map((loc) => loc.id) || [];

				if (tenantLocationIds.length === 0) {
					setUpcomingReservations([]);
					setLoading(false);
					return;
				}

				const { data: reservationsData } = await supabase
					.from("reservations")
					.select("*, locations(*), rooms(*)")
					.in("location_id", tenantLocationIds)
					.match(!selectedLocation ? {} : { location_id: selectedLocation })
					.gte("check_in_date", new Date().toISOString().split("T")[0]) // Only future/today check-ins
					.neq("status", "cancelled") // Exclude cancelled reservations
					.order("check_in_date", { ascending: true })
					.limit(5);

				setUpcomingReservations(reservationsData || []);
			} catch (error) {
				console.error("Error fetching reservations data:", error);
			} finally {
				setLoading(false);
			}
		};

		fetchReservationsData();
	}, [selectedLocation, tenant?.id]);

	if (loading) {
		return (
			<UpcomingBookingsSkeleton hasCalendarPermission={hasCalendarPermission} />
		);
	}
	return (
		<Card className="bg-card border">
			<CardHeader className="flex flex-row items-center justify-between">
				<CardTitle className="flex items-center gap-2">
					<Calendar className="size-5 text-primary" />
					{t("dashboard.upcomingBookings.title")}
				</CardTitle>
				{hasCalendarPermission && (
					<Button asChild variant="outline" size="sm">
						<Link to="/calendar">
							<Eye className="size-4" />
							{t("dashboard.upcomingBookings.viewAll")}
						</Link>
					</Button>
				)}
			</CardHeader>
			<CardContent className="space-y-3 lg:space-y-4 p-4 sm:p-6">
				{upcomingReservations.length > 0 ? (
					upcomingReservations.map((reservation) => (
						<div
							key={reservation.id}
							className="p-3 lg:p-4 rounded-lg bg-background/50 border border-border/50"
						>
							<div className="flex flex-col space-y-2">
								<div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
									<div className="min-w-0 flex-1">
										<p className="font-medium text-foreground truncate">
											{reservation.guest_name}
										</p>
										<p className="text-sm text-muted-foreground">
											{new Date(reservation.check_in_date).toLocaleDateString()}{" "}
											{t("dashboard.upcomingBookings.to")}{" "}
											{new Date(
												reservation.check_out_date,
											).toLocaleDateString()}
										</p>
										<p className="text-xs text-muted-foreground">
											{reservation.locations?.name} • Room{" "}
											{reservation.rooms?.room_number}
										</p>
									</div>
									<div className="flex flex-wrap items-center gap-2">
										<Badge
											variant={
												reservation.status === "confirmed"
													? "default"
													: "secondary"
											}
											className="capitalize text-xs"
										>
											{reservation.status}
										</Badge>
										{reservation.booking_source && (
											<Badge variant="outline" className="text-xs">
												{reservation.booking_source.replace("_", ".")}
											</Badge>
										)}
									</div>
								</div>
								<div className="flex justify-between items-center">
									<span className="text-xs text-muted-foreground">
										{reservation.reservation_number}
									</span>
									<span className="font-bold text-success">
										{reservation.currency}{" "}
										{reservation.total_amount.toLocaleString()}
									</span>
								</div>
							</div>
						</div>
					))
				) : (
					<div className="text-center py-6 lg:py-8">
						<p className="text-muted-foreground">
							{t("dashboard.upcomingBookings.noBookings")}
						</p>
					</div>
				)}
			</CardContent>
		</Card>
	);
}
