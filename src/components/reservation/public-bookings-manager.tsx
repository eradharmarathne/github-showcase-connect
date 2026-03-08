import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { CheckCircle, Clock, ExternalLink, XCircle } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/context/auth-context";
import { useLocationContext } from "@/context/location-context";
import { useToast } from "@/hooks/use-toast";
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
	assigned_room_id: string | null;
	converted_reservation_id: string | null;
	created_at: string;
	location_id: string;
	tenant_id: string;
	locations?: {
		name: string;
	};
	rooms?: {
		room_number: string;
		room_type: string;
	};
}

interface Room {
	id: string;
	room_number: string;
	room_type: string;
	base_price: number;
}

export function PublicBookingsManager() {
	const { t } = useTranslation();
	const { toast } = useToast();
	const { tenant } = useAuth();
	const { selectedLocation } = useLocationContext();
	const [selectedBooking, setSelectedBooking] = useState<PublicBooking | null>(
		null,
	);
	const [isDialogOpen, setIsDialogOpen] = useState(false);
	const [selectedRoomId, setSelectedRoomId] = useState<string>("");
	const [isConfirming, setIsConfirming] = useState(false);

	// Fetch public bookings
	const {
		data: bookings = [],
		isLoading,
		refetch,
	} = useQuery({
		queryKey: ["public-bookings", tenant?.id, selectedLocation],
		queryFn: async () => {
			if (!tenant?.id || !selectedLocation) return [];

			const { data, error } = await supabase
				.from("public_bookings")
				.select(`
					*,
					locations(name),
					assigned_room:rooms!public_bookings_assigned_room_id_fkey(room_number, room_type)
				`)
				.eq("tenant_id", tenant.id)
				.eq("location_id", selectedLocation)
				.order("created_at", { ascending: false });

			if (error) throw error;
			return data as any[];
		},
		enabled: !!tenant?.id && !!selectedLocation,
	});

	// Fetch available rooms for the selected location
	const { data: rooms = [] } = useQuery({
		queryKey: ["rooms", tenant?.id, selectedLocation],
		queryFn: async () => {
			if (!tenant?.id || !selectedLocation) return [];

			const { data, error } = await supabase
				.from("rooms")
				.select("id, room_number, room_type, base_price")
				.eq("tenant_id", tenant.id)
				.eq("location_id", selectedLocation)
				.eq("is_active", true)
				.order("room_number");

			if (error) throw error;
			return data as Room[];
		},
		enabled: !!tenant?.id && !!selectedLocation,
	});

	const handleUpdateStatus = async (
		bookingId: string,
		status: "confirmed" | "rejected",
	) => {
		try {
			// Prepare update data
			const updateData: any = { status };

			// If confirming and a room is selected, save the room assignment
			if (
				status === "confirmed" &&
				selectedRoomId &&
				selectedRoomId !== "none"
			) {
				updateData.assigned_room_id = selectedRoomId;
			}

			const { error } = await supabase
				.from("public_bookings")
				.update(updateData)
				.eq("id", bookingId)
				.eq("tenant_id", tenant?.id);

			if (error) throw error;

			const roomInfo =
				selectedRoomId && selectedRoomId !== "none"
					? rooms.find((r) => r.id === selectedRoomId)
					: null;

			toast({
				title: t("publicBookings.toast.statusUpdated.title"),
				description: t("publicBookings.toast.statusUpdated.description", {
					status:
						status === "confirmed"
							? t("publicBookings.status.confirmed")
							: t("publicBookings.status.rejected"),
					room: roomInfo
						? ` ${t("publicBookings.toast.statusUpdated.roomAssigned", { room: roomInfo.room_number })}`
						: "",
				}),
			});

			refetch();
			setIsDialogOpen(false);
			setSelectedRoomId("");
			setIsConfirming(false);
		} catch (error) {
			console.error("Error updating status:", error);
			toast({
				title: t("common.error"),
				description: t("publicBookings.toast.statusUpdateFailed"),
				variant: "destructive",
			});
			setIsConfirming(false);
		}
	};

	const handleConvertToReservation = async (booking: PublicBooking) => {
		if (!booking.assigned_room_id) {
			toast({
				title: t("publicBookings.toast.roomNotAssigned.title"),
				description: t("publicBookings.toast.roomNotAssigned.description"),
				variant: "destructive",
			});
			return;
		}

		try {
			setIsConfirming(true);

			// Calculate nights
			const nights = calculateNights(
				booking.check_in_date,
				booking.check_out_date,
			);

			// Create a reservation from the public booking
			const { data: reservation, error: reservationError } = await supabase
				.from("reservations")
				.insert({
					tenant_id: booking.tenant_id,
					location_id: booking.location_id,
					room_id: booking.assigned_room_id,
					guest_name: booking.guest_name,
					guest_email: booking.guest_email,
					guest_phone: booking.guest_phone,
					guest_address: booking.guest_address,
					guest_nationality: booking.guest_nationality,
					check_in_date: booking.check_in_date,
					check_out_date: booking.check_out_date,
					adults: booking.adults,
					children: booking.children,
					nights: nights,
					total_amount: 0, // Admin can update this later
					special_requests: booking.special_requests,
					status: "confirmed",
					booking_source: "public_form",
				})
				.select()
				.single();

			if (reservationError) throw reservationError;

			// Update public booking status to converted and link to reservation
			const { error: updateError } = await supabase
				.from("public_bookings")
				.update({
					status: "converted",
					converted_reservation_id: reservation.id,
				})
				.eq("id", booking.id);

			if (updateError) throw updateError;

			toast({
				title: t("publicBookings.toast.reservationCreated.title"),
				description: t("publicBookings.toast.reservationCreated.description", {
					id: reservation.id?.substring(0, 8),
				}),
			});

			refetch();
			setIsDialogOpen(false);
			setIsConfirming(false);
		} catch (error) {
			console.error("Error converting to reservation:", error);
			toast({
				title: t("common.error"),
				description: t("publicBookings.toast.conversionFailed"),
				variant: "destructive",
			});
			setIsConfirming(false);
		}
	};

	const getStatusBadge = (status: string) => {
		const badges = {
			pending: (
				<Badge variant="outline" className="bg-yellow-50">
					<Clock className="h-3 w-3 mr-1" />
					{t("publicBookings.status.pending")}
				</Badge>
			),
			confirmed: (
				<Badge variant="outline" className="bg-green-50">
					<CheckCircle className="h-3 w-3 mr-1" />
					{t("publicBookings.status.confirmed")}
				</Badge>
			),
			rejected: (
				<Badge variant="outline" className="bg-red-50">
					<XCircle className="h-3 w-3 mr-1" />
					{t("publicBookings.status.rejected")}
				</Badge>
			),
			converted: (
				<Badge variant="outline" className="bg-blue-50">
					<CheckCircle className="h-3 w-3 mr-1" />
					{t("publicBookings.status.converted")}
				</Badge>
			),
		};
		return badges[status as keyof typeof badges] || status;
	};

	const calculateNights = (checkIn: string, checkOut: string) => {
		const nights = Math.ceil(
			(new Date(checkOut).getTime() - new Date(checkIn).getTime()) /
				(1000 * 60 * 60 * 24),
		);
		return nights;
	};

	return (
		<Card>
			<CardHeader>
				<CardTitle>{t("publicBookings.title")}</CardTitle>
				<CardDescription>{t("publicBookings.description")}</CardDescription>
			</CardHeader>
			<CardContent>
				{isLoading ? (
					<div className="text-center py-8">
						<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
						<p className="text-muted-foreground mt-2">
							{t("publicBookings.loading")}
						</p>
					</div>
				) : bookings.length === 0 ? (
					<div className="text-center py-8">
						<p className="text-muted-foreground">
							{t("publicBookings.noRequests")}
						</p>
						<p className="text-sm text-muted-foreground mt-2">
							{t("publicBookings.shareLink")}{" "}
							<code className="bg-muted px-2 py-1 rounded">
								/booking/your-hotel/your-location
							</code>
						</p>
					</div>
				) : (
					<div className="border rounded-lg">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>{t("publicBookings.table.guestName")}</TableHead>
									<TableHead>{t("publicBookings.table.contact")}</TableHead>
									<TableHead>{t("publicBookings.table.checkIn")}</TableHead>
									<TableHead>{t("publicBookings.table.checkOut")}</TableHead>
									<TableHead>{t("publicBookings.table.guests")}</TableHead>
									<TableHead>{t("publicBookings.table.room")}</TableHead>
									<TableHead>{t("publicBookings.table.status")}</TableHead>
									<TableHead>{t("publicBookings.table.submitted")}</TableHead>
									<TableHead>{t("publicBookings.table.actions")}</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{bookings.map((booking) => (
									<TableRow key={booking.id}>
										<TableCell className="font-medium">
											{booking.guest_name}
										</TableCell>
										<TableCell>
											<div className="text-sm">
												<div>{booking.guest_email}</div>
												{booking.guest_phone && (
													<div className="text-muted-foreground">
														{booking.guest_phone}
													</div>
												)}
											</div>
										</TableCell>
										<TableCell>
											{format(new Date(booking.check_in_date), "MMM dd, yyyy")}
										</TableCell>
										<TableCell>
											{format(new Date(booking.check_out_date), "MMM dd, yyyy")}
										</TableCell>
										<TableCell>
											{t("publicBookings.guests.adults", {
												count: booking.adults,
											})}
											{booking.children > 0 &&
												`, ${t("publicBookings.guests.children", { count: booking.children })}`}
											<div className="text-xs text-muted-foreground">
												{t("publicBookings.nights", {
													count: calculateNights(
														booking.check_in_date,
														booking.check_out_date,
													),
												})}
											</div>
										</TableCell>
										<TableCell>
											{(booking as any).assigned_room ? (
												<div className="text-sm">
													<div className="font-medium">
														{(booking as any).assigned_room.room_number}
													</div>
													<div className="text-xs text-muted-foreground">
														{(booking as any).assigned_room.room_type}
													</div>
												</div>
											) : (
												<span className="text-xs text-muted-foreground">
													{t("publicBookings.notAssigned")}
												</span>
											)}
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
						<DialogTitle>{t("publicBookings.dialog.title")}</DialogTitle>
						<DialogDescription>
							{t("publicBookings.dialog.description")}
						</DialogDescription>
					</DialogHeader>

					{selectedBooking && (
						<div className="space-y-4">
							{/* Guest Information */}
							<div>
								<h3 className="font-semibold mb-2">
									{t("publicBookings.dialog.guestInformation")}
								</h3>
								<div className="grid grid-cols-2 gap-4 text-sm">
									<div>
										<p className="text-muted-foreground">
											{t("publicBookings.dialog.name")}
										</p>
										<p className="font-medium">{selectedBooking.guest_name}</p>
									</div>
									<div>
										<p className="text-muted-foreground">
											{t("publicBookings.dialog.email")}
										</p>
										<p className="font-medium">{selectedBooking.guest_email}</p>
									</div>
									{selectedBooking.guest_phone && (
										<div>
											<p className="text-muted-foreground">
												{t("publicBookings.dialog.phone")}
											</p>
											<p className="font-medium">
												{selectedBooking.guest_phone}
											</p>
										</div>
									)}
									{selectedBooking.guest_nationality && (
										<div>
											<p className="text-muted-foreground">
												{t("publicBookings.dialog.nationality")}
											</p>
											<p className="font-medium">
												{selectedBooking.guest_nationality}
											</p>
										</div>
									)}
									{selectedBooking.guest_address && (
										<div className="col-span-2">
											<p className="text-muted-foreground">
												{t("publicBookings.dialog.address")}
											</p>
											<p className="font-medium">
												{selectedBooking.guest_address}
											</p>
										</div>
									)}
								</div>
							</div>

							{/* Booking Details */}
							<div>
								<h3 className="font-semibold mb-2">
									{t("publicBookings.dialog.bookingDetails")}
								</h3>
								<div className="grid grid-cols-2 gap-4 text-sm">
									<div>
										<p className="text-muted-foreground">
											{t("publicBookings.dialog.checkIn")}
										</p>
										<p className="font-medium">
											{format(
												new Date(selectedBooking.check_in_date),
												"EEEE, MMMM dd, yyyy",
											)}
										</p>
									</div>
									<div>
										<p className="text-muted-foreground">
											{t("publicBookings.dialog.checkOut")}
										</p>
										<p className="font-medium">
											{format(
												new Date(selectedBooking.check_out_date),
												"EEEE, MMMM dd, yyyy",
											)}
										</p>
									</div>
									<div>
										<p className="text-muted-foreground">
											{t("publicBookings.dialog.guests")}
										</p>
										<p className="font-medium">
											{t("publicBookings.dialog.adults", {
												count: selectedBooking.adults,
											})}
											{selectedBooking.children > 0 &&
												`, ${t("publicBookings.dialog.children", { count: selectedBooking.children })}`}
										</p>
									</div>
									<div>
										<p className="text-muted-foreground">
											{t("publicBookings.dialog.nights")}
										</p>
										<p className="font-medium">
											{t("publicBookings.nights", {
												count: calculateNights(
													selectedBooking.check_in_date,
													selectedBooking.check_out_date,
												),
											})}
										</p>
									</div>
									{selectedBooking.room_type_preference && (
										<div className="col-span-2">
											<p className="text-muted-foreground">
												{t("publicBookings.dialog.roomPreference")}
											</p>
											<p className="font-medium">
												{selectedBooking.room_type_preference}
											</p>
										</div>
									)}
								</div>
							</div>

							{/* Special Requests */}
							{selectedBooking.special_requests && (
								<div>
									<h3 className="font-semibold mb-2">
										{t("publicBookings.dialog.specialRequests")}
									</h3>
									<p className="text-sm bg-muted p-3 rounded-md">
										{selectedBooking.special_requests}
									</p>
								</div>
							)}

							{/* Status */}
							<div>
								<h3 className="font-semibold mb-2">
									{t("publicBookings.dialog.status")}
								</h3>
								{getStatusBadge(selectedBooking.status)}
							</div>

							{/* Assigned Room - Show for confirmed bookings */}
							{selectedBooking.status !== "pending" &&
								(selectedBooking as any).assigned_room && (
									<div>
										<h3 className="font-semibold mb-2">
											{t("publicBookings.dialog.assignedRoom")}
										</h3>
										<div className="flex items-center gap-2">
											<Badge variant="outline" className="bg-blue-50">
												{t("publicBookings.dialog.roomInfo", {
													room_number: (selectedBooking as any).assigned_room
														.room_number,
													room_type: (selectedBooking as any).assigned_room
														.room_type,
												})}
											</Badge>
										</div>
									</div>
								)}

							{/* Room Assignment - Only show for pending bookings */}
							{selectedBooking.status === "pending" && (
								<div>
									<h3 className="font-semibold mb-2">
										{t("publicBookings.dialog.assignRoomOptional")}
									</h3>
									<p className="text-sm text-muted-foreground mb-3">
										{t("publicBookings.dialog.assignRoomDescription")}
									</p>
									<div className="space-y-2">
										<Label htmlFor="room-select">
											{t("publicBookings.dialog.selectRoom")}
										</Label>
										<Select
											value={selectedRoomId}
											onValueChange={setSelectedRoomId}
										>
											<SelectTrigger id="room-select">
												<SelectValue
													placeholder={t(
														"publicBookings.dialog.chooseRoomOptional",
													)}
												/>
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="none">
													{t("publicBookings.dialog.noRoomAssigned")}
												</SelectItem>
												{rooms
													.filter(
														(room) =>
															!selectedBooking.room_type_preference ||
															room.room_type ===
																selectedBooking.room_type_preference,
													)
													.map((room) => (
														<SelectItem key={room.id} value={room.id}>
															{room.room_number} - {room.room_type}
														</SelectItem>
													))}
												{selectedBooking.room_type_preference &&
													rooms.filter(
														(r) =>
															r.room_type !==
															selectedBooking.room_type_preference,
													).length > 0 && (
														<>
															<SelectItem value="divider" disabled>
																{t("publicBookings.dialog.otherRoomTypes")}
															</SelectItem>
															{rooms
																.filter(
																	(room) =>
																		room.room_type !==
																		selectedBooking.room_type_preference,
																)
																.map((room) => (
																	<SelectItem key={room.id} value={room.id}>
																		{room.room_number} - {room.room_type}
																	</SelectItem>
																))}
														</>
													)}
											</SelectContent>
										</Select>
										{selectedRoomId && selectedRoomId !== "none" && (
											<p className="text-sm text-muted-foreground">
												{t("publicBookings.dialog.roomWillBeAssigned", {
													room: rooms.find((r) => r.id === selectedRoomId)
														?.room_number,
												})}
											</p>
										)}
									</div>
								</div>
							)}
						</div>
					)}

					<DialogFooter>
						{selectedBooking?.status === "pending" && (
							<>
								<Button
									variant="outline"
									onClick={() =>
										handleUpdateStatus(selectedBooking.id, "rejected")
									}
									disabled={isConfirming}
								>
									<XCircle className="h-4 w-4 mr-2" />
									{t("publicBookings.dialog.reject")}
								</Button>
								<Button
									onClick={() => {
										setIsConfirming(true);
										handleUpdateStatus(selectedBooking.id, "confirmed");
									}}
									disabled={isConfirming}
								>
									<CheckCircle className="h-4 w-4 mr-2" />
									{isConfirming
										? t("publicBookings.dialog.confirming")
										: t("publicBookings.dialog.confirmBooking")}
								</Button>
							</>
						)}
						{selectedBooking?.status === "confirmed" && (
							<Button
								onClick={() => handleConvertToReservation(selectedBooking)}
								disabled={isConfirming || !selectedBooking.assigned_room_id}
							>
								<CheckCircle className="h-4 w-4 mr-2" />
								{isConfirming
									? t("publicBookings.dialog.converting")
									: t("publicBookings.dialog.convertToReservation")}
							</Button>
						)}
						{selectedBooking?.status === "converted" && (
							<div className="text-sm text-muted-foreground">
								{t("publicBookings.dialog.convertedToReservation")}
							</div>
						)}
						<Button
							variant="ghost"
							onClick={() => {
								setIsDialogOpen(false);
								setSelectedRoomId("");
								setIsConfirming(false);
							}}
						>
							{t("common.close")}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</Card>
	);
}
