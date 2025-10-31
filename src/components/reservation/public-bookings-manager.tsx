import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { CheckCircle, Clock, ExternalLink, XCircle } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/auth-context";
import { useLocationContext } from "@/context/location-context";
import { supabase } from "@/integrations/supabase/client";

interface PublicBooking {
	id: string;
	guest_name: string;
	guest_email: string;
	guest_phone: string | null;
	guest_address: string | null;
	guest_nationality: string | null;
	check_in_date: string;
	check_out_date: string;
	adults: number;
	children: number;
	room_type_preference: string | null;
	special_requests: string | null;
	status: "pending" | "confirmed" | "rejected" | "converted";
	created_at: string;
	location_id: string;
	locations?: {
		name: string;
	};
}

export function PublicBookingsManager() {
	const { toast } = useToast();
	const { tenant } = useAuth();
	const { selectedLocation } = useLocationContext();
	const [selectedBooking, setSelectedBooking] = useState<PublicBooking | null>(null);
	const [isDialogOpen, setIsDialogOpen] = useState(false);

	// Fetch public bookings
	const { data: bookings = [], isLoading, refetch } = useQuery({
		queryKey: ["public-bookings", tenant?.id, selectedLocation],
		queryFn: async () => {
			if (!tenant?.id || !selectedLocation) return [];

			const { data, error } = await supabase
				.from("public_bookings")
				.select(`
					*,
					locations(name)
				`)
				.eq("tenant_id", tenant.id)
				.eq("location_id", selectedLocation)
				.order("created_at", { ascending: false });

			if (error) throw error;
			return data as PublicBooking[];
		},
		enabled: !!tenant?.id && !!selectedLocation,
	});

	const handleUpdateStatus = async (bookingId: string, status: "confirmed" | "rejected") => {
		try {
			const { error } = await supabase
				.from("public_bookings")
				.update({ status })
				.eq("id", bookingId)
				.eq("tenant_id", tenant?.id);

			if (error) throw error;

			toast({
				title: "Status Updated",
				description: `Booking request ${status === "confirmed" ? "confirmed" : "rejected"} successfully.`,
			});

			refetch();
			setIsDialogOpen(false);
		} catch (error) {
			console.error("Error updating status:", error);
			toast({
				title: "Error",
				description: "Failed to update booking status.",
				variant: "destructive",
			});
		}
	};

	const getStatusBadge = (status: string) => {
		const badges = {
			pending: <Badge variant="outline" className="bg-yellow-50"><Clock className="h-3 w-3 mr-1" />Pending</Badge>,
			confirmed: <Badge variant="outline" className="bg-green-50"><CheckCircle className="h-3 w-3 mr-1" />Confirmed</Badge>,
			rejected: <Badge variant="outline" className="bg-red-50"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>,
			converted: <Badge variant="outline" className="bg-blue-50"><CheckCircle className="h-3 w-3 mr-1" />Converted</Badge>,
		};
		return badges[status as keyof typeof badges] || status;
	};

	const calculateNights = (checkIn: string, checkOut: string) => {
		const nights = Math.ceil(
			(new Date(checkOut).getTime() - new Date(checkIn).getTime()) / (1000 * 60 * 60 * 24)
		);
		return nights;
	};

	return (
		<Card>
			<CardHeader>
				<CardTitle>Public Booking Requests</CardTitle>
				<CardDescription>
					Manage booking requests submitted through your public booking page
				</CardDescription>
			</CardHeader>
			<CardContent>
				{isLoading ? (
					<div className="text-center py-8">
						<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
						<p className="text-muted-foreground mt-2">Loading bookings...</p>
					</div>
				) : bookings.length === 0 ? (
					<div className="text-center py-8">
						<p className="text-muted-foreground">No booking requests yet.</p>
						<p className="text-sm text-muted-foreground mt-2">
							Share your booking link: <code className="bg-muted px-2 py-1 rounded">/booking/your-hotel/your-location</code>
						</p>
					</div>
				) : (
					<div className="border rounded-lg">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Guest Name</TableHead>
									<TableHead>Contact</TableHead>
									<TableHead>Check-in</TableHead>
									<TableHead>Check-out</TableHead>
									<TableHead>Guests</TableHead>
									<TableHead>Status</TableHead>
									<TableHead>Submitted</TableHead>
									<TableHead>Actions</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{bookings.map((booking) => (
									<TableRow key={booking.id}>
										<TableCell className="font-medium">{booking.guest_name}</TableCell>
										<TableCell>
											<div className="text-sm">
												<div>{booking.guest_email}</div>
												{booking.guest_phone && (
													<div className="text-muted-foreground">{booking.guest_phone}</div>
												)}
											</div>
										</TableCell>
										<TableCell>{format(new Date(booking.check_in_date), "MMM dd, yyyy")}</TableCell>
										<TableCell>{format(new Date(booking.check_out_date), "MMM dd, yyyy")}</TableCell>
										<TableCell>
											{booking.adults}A
											{booking.children > 0 && `, ${booking.children}C`}
											<div className="text-xs text-muted-foreground">
												{calculateNights(booking.check_in_date, booking.check_out_date)} nights
											</div>
										</TableCell>
										<TableCell>{getStatusBadge(booking.status)}</TableCell>
										<TableCell className="text-sm text-muted-foreground">
											{format(new Date(booking.created_at), "MMM dd, HH:mm")}
										</TableCell>
										<TableCell>
											<Button
												variant="ghost"
												size="sm"
												onClick={() => {
													setSelectedBooking(booking);
													setIsDialogOpen(true);
												}}
											>
												<ExternalLink className="h-4 w-4" />
											</Button>
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</div>
				)}
			</CardContent>

			{/* Booking Details Dialog */}
			<Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
				<DialogContent className="max-w-2xl">
					<DialogHeader>
						<DialogTitle>Booking Request Details</DialogTitle>
						<DialogDescription>
							Review and manage this booking request
						</DialogDescription>
					</DialogHeader>

					{selectedBooking && (
						<div className="space-y-4">
							{/* Guest Information */}
							<div>
								<h3 className="font-semibold mb-2">Guest Information</h3>
								<div className="grid grid-cols-2 gap-4 text-sm">
									<div>
										<p className="text-muted-foreground">Name</p>
										<p className="font-medium">{selectedBooking.guest_name}</p>
									</div>
									<div>
										<p className="text-muted-foreground">Email</p>
										<p className="font-medium">{selectedBooking.guest_email}</p>
									</div>
									{selectedBooking.guest_phone && (
										<div>
											<p className="text-muted-foreground">Phone</p>
											<p className="font-medium">{selectedBooking.guest_phone}</p>
										</div>
									)}
									{selectedBooking.guest_nationality && (
										<div>
											<p className="text-muted-foreground">Nationality</p>
											<p className="font-medium">{selectedBooking.guest_nationality}</p>
										</div>
									)}
									{selectedBooking.guest_address && (
										<div className="col-span-2">
											<p className="text-muted-foreground">Address</p>
											<p className="font-medium">{selectedBooking.guest_address}</p>
										</div>
									)}
								</div>
							</div>

							{/* Booking Details */}
							<div>
								<h3 className="font-semibold mb-2">Booking Details</h3>
								<div className="grid grid-cols-2 gap-4 text-sm">
									<div>
										<p className="text-muted-foreground">Check-in</p>
										<p className="font-medium">{format(new Date(selectedBooking.check_in_date), "EEEE, MMMM dd, yyyy")}</p>
									</div>
									<div>
										<p className="text-muted-foreground">Check-out</p>
										<p className="font-medium">{format(new Date(selectedBooking.check_out_date), "EEEE, MMMM dd, yyyy")}</p>
									</div>
									<div>
										<p className="text-muted-foreground">Guests</p>
										<p className="font-medium">
											{selectedBooking.adults} {selectedBooking.adults === 1 ? "Adult" : "Adults"}
											{selectedBooking.children > 0 && `, ${selectedBooking.children} ${selectedBooking.children === 1 ? "Child" : "Children"}`}
										</p>
									</div>
									<div>
										<p className="text-muted-foreground">Nights</p>
										<p className="font-medium">
											{calculateNights(selectedBooking.check_in_date, selectedBooking.check_out_date)} nights
										</p>
									</div>
									{selectedBooking.room_type_preference && (
										<div className="col-span-2">
											<p className="text-muted-foreground">Room Preference</p>
											<p className="font-medium">{selectedBooking.room_type_preference}</p>
										</div>
									)}
								</div>
							</div>

							{/* Special Requests */}
							{selectedBooking.special_requests && (
								<div>
									<h3 className="font-semibold mb-2">Special Requests</h3>
									<p className="text-sm bg-muted p-3 rounded-md">{selectedBooking.special_requests}</p>
								</div>
							)}

							{/* Status */}
							<div>
								<h3 className="font-semibold mb-2">Status</h3>
								{getStatusBadge(selectedBooking.status)}
							</div>
						</div>
					)}

					<DialogFooter>
						{selectedBooking?.status === "pending" && (
							<>
								<Button
									variant="outline"
									onClick={() => handleUpdateStatus(selectedBooking.id, "rejected")}
								>
									<XCircle className="h-4 w-4 mr-2" />
									Reject
								</Button>
								<Button
									onClick={() => handleUpdateStatus(selectedBooking.id, "confirmed")}
								>
									<CheckCircle className="h-4 w-4 mr-2" />
									Confirm
								</Button>
							</>
						)}
						<Button variant="ghost" onClick={() => setIsDialogOpen(false)}>
							Close
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</Card>
	);
}
