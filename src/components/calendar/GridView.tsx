import { useQuery } from "@tanstack/react-query";
import { isSameMonth, parseISO } from "date-fns";
import { CalendarIcon, Plus } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router";
import { NewReservationDialog } from "@/components/NewReservationDialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useLocationContext } from "@/context/LocationContext";
import { useTenant } from "@/hooks/useTenant";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { BookingCard } from "./BookingCard";

type Reservation = Database["public"]["Tables"]["reservations"]["Row"] & {
	rooms: { room_number: string; room_type: string } | null;
	locations: { name: string } | null;
};

interface GridViewProps {
	currentDate: Date;
	searchTerm: string;
	statusFilter: string;
	roomFilter: string;
	getCurrencySymbol: (currency: string) => string;
	getStatusColor: (status: string) => string;
	getStatusBorderColor: (status: string) => string;
}

export function GridView({
	currentDate,
	searchTerm,
	statusFilter,
	roomFilter,
	getCurrencySymbol,
	getStatusColor,
	getStatusBorderColor,
}: GridViewProps) {
	const navigate = useNavigate();
	const { selectedLocation } = useLocationContext();
	const { tenant } = useTenant();
	const [isNewReservationDialogOpen, setIsNewReservationDialogOpen] =
		useState(false);

	// Fetch reservations
	const { data: reservations = [], isLoading } = useQuery({
		queryKey: ["reservations", selectedLocation, tenant?.id, currentDate],
		queryFn: async () => {
			if (!selectedLocation || !tenant?.id) return [];

			const { data, error } = await supabase
				.from("reservations")
				.select(`
					*,
					rooms(room_number, room_type),
					locations(name)
				`)
				.eq("tenant_id", tenant.id)
				.eq("location_id", selectedLocation)
				.order("check_in_date", { ascending: true });

			if (error) throw error;
			return data || [];
		},
		enabled: !!selectedLocation && !!tenant?.id,
	});

	// Apply filters
	const filteredReservations = reservations.filter((reservation) => {
		// Search filter
		if (searchTerm.trim()) {
			const searchLower = searchTerm.toLowerCase();
			const matchesSearch =
				reservation.guest_name.toLowerCase().includes(searchLower) ||
				reservation.reservation_number.toLowerCase().includes(searchLower) ||
				reservation.rooms?.room_number.toLowerCase().includes(searchLower) ||
				reservation.rooms?.room_type.toLowerCase().includes(searchLower);

			if (!matchesSearch) return false;
		}

		// Status filter
		if (statusFilter !== "all" && reservation.status !== statusFilter) {
			return false;
		}

		// Room filter
		if (roomFilter !== "all" && reservation.room_id !== roomFilter) {
			return false;
		}

		return true;
	});

	// Filter by current month
	const monthlyReservations = filteredReservations.filter((reservation) => {
		const checkIn = parseISO(reservation.check_in_date);
		return isSameMonth(checkIn, currentDate);
	});

	if (isLoading) {
		return (
			<div className="space-y-3">
				{Array.from({ length: 5 }, (_, i) => (
					<Card key={i} className="p-4">
						<div className="animate-pulse space-y-3">
							<div className="h-4 bg-gray-200 rounded w-3/4"></div>
							<div className="h-3 bg-gray-200 rounded w-1/2"></div>
							<div className="h-3 bg-gray-200 rounded w-2/3"></div>
						</div>
					</Card>
				))}
			</div>
		);
	}

	if (monthlyReservations.length === 0) {
		return (
			<Card className="p-8 text-center">
				<CalendarIcon className="h-16 w-16 mx-auto mb-4 text-gray-300" />
				<h3 className="text-base md:text-lg lg:text-xl font-semibold text-gray-600 mb-2">
					No Reservations Found
				</h3>
				<p className="text-gray-500 mb-4">
					No reservations for the selected location and time period.
				</p>
				<Button
					onClick={() => setIsNewReservationDialogOpen(true)}
					className="gap-2"
				>
					<Plus className="size-4" />
					Create First Reservation
				</Button>
			</Card>
		);
	}

	return (
		<div className="space-y-3">
			{monthlyReservations.map((reservation) => (
				<BookingCard
					key={reservation.id}
					reservation={reservation}
					getCurrencySymbol={getCurrencySymbol}
					getStatusColor={getStatusColor}
					getStatusBorderColor={getStatusBorderColor}
				/>
			))}
		</div>
	);
}
