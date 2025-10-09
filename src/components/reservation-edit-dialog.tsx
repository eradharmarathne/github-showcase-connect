import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PhoneInput } from "@/components/ui/phone-input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useLocationContext } from "@/context/LocationContext";
import { useToast } from "@/hooks/use-toast";
import { useProfile } from "@/hooks/useProfile";
import { supabase } from "@/integrations/supabase/client";
import { convertCurrency } from "@/utils/currency";
import { OTPVerification } from "./OTPVerification";

interface Reservation {
	id: string;
	reservation_number: string;
	guest_name: string;
	guest_email?: string;
	guest_phone?: string;
	guest_address?: string;
	guest_id_number?: string;
	guest_nationality?: string;
	adults: number;
	children: number;
	check_in_date: string;
	check_out_date: string;
	nights: number;
	room_rate: number;
	total_amount: number;
	advance_amount?: number;
	paid_amount?: number;
	balance_amount?: number;
	currency: "USD" | "LKR" | "EUR" | "GBP";
	status:
		| "pending"
		| "confirmed"
		| "checked_in"
		| "checked_out"
		| "cancelled"
		| "tentative";
	special_requests?: string;
	arrival_time?: string;
	room_id: string;
	location_id: string;
	tenant_id?: string;
	agent_id?: string;
	guide_id?: string;
	agent_commission?: number;
	guide_commission?: number;
	booking_source?: string;
}

interface ReservationEditDialogProps {
	reservation: Reservation | null;
	isOpen: boolean;
	onClose: () => void;
	onUpdate: () => void;
}

export function ReservationEditDialog({
	reservation,
	isOpen,
	onClose,
	onUpdate,
}: ReservationEditDialogProps) {
	const { toast } = useToast();
	const [isOTPVerified, setIsOTPVerified] = useState(true);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [formData, setFormData] = useState<Partial<Reservation>>({});
	const [rooms, setRooms] = useState<any[]>([]);
	const [agents, setAgents] = useState<any[]>([]);
	const [guides, setGuides] = useState<any[]>([]);
	const [location, setLocation] = useState<any>(null);
	const { profile } = useProfile();
	const { selectedLocation } = useLocationContext();

	useEffect(() => {
		const fetchRooms = async () => {
			if (!selectedLocation) {
				console.log("No selected location, skipping room fetch");
				return;
			}

			try {
				const { data, error } = await supabase
					.from("rooms")
					.select(
						"id, room_number, room_type, location_id, base_price, currency",
					)
					.eq("is_active", true)
					.eq("location_id", selectedLocation);

				if (error) {
					console.error("Error fetching rooms:", error);
					toast({
						title: "Connection Error",
						description:
							"Unable to load rooms. Please check your internet connection.",
						variant: "destructive",
					});
					return;
				}

				console.log(
					"Fetched rooms for selected location:",
					selectedLocation,
					data,
				);
				setRooms(data || []);
			} catch (networkError) {
				console.error("Network error fetching rooms:", networkError);
				toast({
					title: "Network Error",
					description:
						"Unable to connect to the server. Please check your internet connection and try again.",
					variant: "destructive",
				});
			}
		};

		const fetchAgents = async () => {
			try {
				const { data, error } = await supabase
					.from("agents")
					.select("id, name, commission_rate")
					.eq("is_active", true);

				if (error) {
					console.error("Error fetching agents:", error);
					return;
				}

				setAgents(data || []);
			} catch (networkError) {
				console.error("Network error fetching agents:", networkError);
			}
		};

		const fetchGuides = async () => {
			try {
				const { data, error } = await supabase
					.from("guides")
					.select("id, name, commission_rate")
					.eq("is_active", true);

				if (error) {
					console.error("Error fetching guides:", error);
					return;
				}

				setGuides(data || []);
			} catch (networkError) {
				console.error("Network error fetching guides:", networkError);
			}
		};

		const fetchLocation = async () => {
			if (!reservation?.location_id) return;

			try {
				const { data, error } = await supabase
					.from("locations")
					.select("id, name, phone, email")
					.eq("id", reservation.location_id)
					.single();

				if (error) {
					console.error("Error fetching location:", error);
					return;
				}

				setLocation(data);
			} catch (networkError) {
				console.error("Network error fetching location:", networkError);
			}
		};

		if (reservation && isOpen) {
			console.log("Initializing form with reservation:", reservation);
			console.log("Selected location:", selectedLocation);

			// Initialize form data with reservation
			const initialFormData = { ...reservation };

			// If the reservation is for a different location than currently selected,
			// clear the room_id to force user to select a new room
			if (reservation.location_id !== selectedLocation) {
				console.log(
					"Reservation location differs from selected location, clearing room_id",
				);
				initialFormData.room_id = null;
			}

			setFormData(initialFormData);
			fetchRooms();
			fetchAgents();
			fetchGuides();
			fetchLocation();
		}
	}, [reservation, isOpen, selectedLocation, toast]);

	const handleOTPVerified = () => {
		setIsOTPVerified(true);
	};

	const handleSubmit = async () => {
		if (!isOTPVerified) {
			toast({
				title: "Verification Required",
				description: "Please verify OTP before saving changes.",
				variant: "destructive",
			});
			return;
		}

		setIsSubmitting(true);
		try {
			// Filter formData to only include valid database fields
			const updateData = {
				guest_name: formData.guest_name,
				guest_email: formData.guest_email,
				guest_phone: formData.guest_phone,
				guest_address: formData.guest_address,
				guest_id_number: formData.guest_id_number,
				guest_nationality: formData.guest_nationality,
				adults: formData.adults,
				children: formData.children,
				check_in_date: formData.check_in_date,
				check_out_date: formData.check_out_date,
				nights: formData.nights,
				room_rate: formData.room_rate,
				total_amount: formData.total_amount,
				advance_amount: formData.advance_amount,
				paid_amount: formData.paid_amount,
				balance_amount: formData.balance_amount,
				currency: formData.currency,
				status: formData.status,
				special_requests: formData.special_requests,
				arrival_time: formData.arrival_time,
				room_id: formData.room_id === "" ? null : formData.room_id,
				agent_id:
					formData.agent_id === "none" || formData.agent_id === ""
						? null
						: formData.agent_id,
				guide_id:
					formData.guide_id === "none" || formData.guide_id === ""
						? null
						: formData.guide_id,
				agent_commission: formData.agent_commission,
				guide_commission: formData.guide_commission,
				booking_source: formData.booking_source,
			};

			console.log("Updating reservation with data:", updateData);

			const { error } = await supabase
				.from("reservations")
				.update(updateData)
				.eq("id", reservation?.id);

			if (error) throw error;

			// Send SMS notification after successful update
			if (reservation.guest_phone) {
				try {
					// Get room details for SMS
					const { data: roomData } = await supabase
						.from("rooms")
						.select("room_number")
						.eq("id", formData.room_id || reservation.room_id)
						.single();

					// Send SMS notification about the update
					await supabase.functions.invoke("send-sms-notification", {
						body: {
							type: "reservation",
							phoneNumber: reservation.guest_phone,
							guestName: formData.guest_name || reservation.guest_name,
							reservationNumber: reservation.reservation_number,
							roomNumber: roomData?.room_number || "N/A",
							checkIn: formData.check_in_date || reservation.check_in_date,
							checkOut: formData.check_out_date || reservation.check_out_date,
							amount: formData.total_amount || reservation.total_amount,
							currency: formData.currency || reservation.currency,
							status: "UPDATED",
						},
					});

					console.log(
						"SMS notification sent successfully for reservation update",
					);
				} catch (smsError) {
					console.error("Error sending SMS notification:", smsError);
					// Don't show error to user as the main operation succeeded
				}
			}

			toast({
				title: "Success",
				description: "Reservation updated successfully",
			});

			onUpdate();
			onClose();
			setIsOTPVerified(false);
		} catch (error: any) {
			console.error("Error updating reservation:", error);
			toast({
				title: "Error",
				description: error.message || "Failed to update reservation",
				variant: "destructive",
			});
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleClose = () => {
		setIsOTPVerified(false);
		onClose();
	};

	if (!reservation) return null;

	return (
		<Dialog open={isOpen} onOpenChange={handleClose}>
			<DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>
						Edit Reservation - {reservation.reservation_number}
					</DialogTitle>
					<DialogDescription>
						Modify reservation details and update guest information
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-6">
					<div className="grid grid-cols-2 gap-4">
						<div>
							<Label>Guest Name</Label>
							<Input
								value={formData.guest_name || ""}
								onChange={(e) =>
									setFormData({ ...formData, guest_name: e.target.value })
								}
							/>
						</div>
						<div>
							<Label>Guest Email</Label>
							<Input
								type="email"
								value={formData.guest_email || ""}
								onChange={(e) =>
									setFormData({ ...formData, guest_email: e.target.value })
								}
							/>
						</div>
					</div>

					<div className="grid grid-cols-2 gap-4">
						<div>
							<Label>Guest Phone</Label>
							<PhoneInput
								defaultCountry="LK"
								international
								value={formData.guest_phone || ""}
								onChange={(value) =>
									setFormData({ ...formData, guest_phone: value || "" })
								}
							/>
						</div>
						<div>
							<Label>Guest Nationality</Label>
							<Input
								value={formData.guest_nationality || ""}
								onChange={(e) =>
									setFormData({
										...formData,
										guest_nationality: e.target.value,
									})
								}
							/>
						</div>
					</div>

					<div>
						<Label>Guest Address</Label>
						<Textarea
							value={formData.guest_address || ""}
							onChange={(e) =>
								setFormData({ ...formData, guest_address: e.target.value })
							}
						/>
					</div>

					<div>
						<Label>Booking Source</Label>
						<Select
							value={formData.booking_source || ""}
							onValueChange={(value) =>
								setFormData({ ...formData, booking_source: value })
							}
						>
							<SelectTrigger>
								<SelectValue placeholder="Select booking source" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="direct">Direct</SelectItem>
								<SelectItem value="airbnb">Airbnb</SelectItem>
								<SelectItem value="booking_com">Booking.com</SelectItem>
								<SelectItem value="expedia">Expedia</SelectItem>
								<SelectItem value="agoda">Agoda</SelectItem>
								<SelectItem value="beds24">Beds24</SelectItem>
								<SelectItem value="manual">Manual</SelectItem>
								<SelectItem value="online">Online</SelectItem>
								<SelectItem value="phone">Phone</SelectItem>
								<SelectItem value="email">Email</SelectItem>
								<SelectItem value="walk_in">Walk-in</SelectItem>
								<SelectItem value="ical">iCal</SelectItem>
							</SelectContent>
						</Select>
					</div>

					<div className="grid grid-cols-3 gap-4">
						<div>
							<Label>Adults</Label>
							<Input
								type="number"
								min="1"
								value={formData.adults || 1}
								onChange={(e) =>
									setFormData({ ...formData, adults: parseInt(e.target.value) })
								}
							/>
						</div>
						<div>
							<Label>Children</Label>
							<Input
								type="number"
								min="0"
								value={formData.children || 0}
								onChange={(e) =>
									setFormData({
										...formData,
										children: parseInt(e.target.value),
									})
								}
							/>
						</div>
						<div>
							<Label>Arrival Time</Label>
							<Input
								type="time"
								value={formData.arrival_time || ""}
								onChange={(e) =>
									setFormData({ ...formData, arrival_time: e.target.value })
								}
							/>
						</div>
					</div>

					<div className="grid grid-cols-2 gap-4">
						<div>
							<Label htmlFor="check_in_date">Check-in Date</Label>
							<DatePicker
								value={formData.check_in_date || ""}
								onChange={(value) => {
									// Parse dates as local dates to avoid timezone issues
									const parseLocalDate = (dateStr: string) => {
										const [year, month, day] = dateStr.split("-").map(Number);
										return new Date(year, month - 1, day);
									};

									const checkInDate = parseLocalDate(value);
									const checkOutDate = formData.check_out_date
										? parseLocalDate(formData.check_out_date)
										: null;
									let nights = 1;
									if (checkOutDate) {
										nights = Math.max(
											1,
											Math.ceil(
												(checkOutDate.getTime() - checkInDate.getTime()) /
													(1000 * 60 * 60 * 24),
											),
										);
									}
									setFormData({
										...formData,
										check_in_date: value,
										nights,
										total_amount: (formData.room_rate || 0) * nights,
									});
								}}
								placeholder="Select check-in date"
								min={(() => {
									const today = new Date();
									const year = today.getFullYear();
									const month = String(today.getMonth() + 1).padStart(2, "0");
									const day = String(today.getDate()).padStart(2, "0");
									return `${year}-${month}-${day}`;
								})()}
								className="w-full"
							/>
						</div>
						<div>
							<Label htmlFor="check_out_date">Check-out Date</Label>
							<DatePicker
								value={formData.check_out_date || ""}
								onChange={(value) => {
									// Parse dates as local dates to avoid timezone issues
									const parseLocalDate = (dateStr: string) => {
										const [year, month, day] = dateStr.split("-").map(Number);
										return new Date(year, month - 1, day);
									};

									const checkInDate = formData.check_in_date
										? parseLocalDate(formData.check_in_date)
										: new Date();
									const checkOutDate = parseLocalDate(value);
									const nights = Math.max(
										1,
										Math.ceil(
											(checkOutDate.getTime() - checkInDate.getTime()) /
												(1000 * 60 * 60 * 24),
										),
									);
									setFormData({
										...formData,
										check_out_date: value,
										nights,
										total_amount: (formData.room_rate || 0) * nights,
									});
								}}
								placeholder="Select check-out date"
								min={
									formData.check_in_date ||
									(() => {
										const today = new Date();
										const year = today.getFullYear();
										const month = String(today.getMonth() + 1).padStart(2, "0");
										const day = String(today.getDate()).padStart(2, "0");
										return `${year}-${month}-${day}`;
									})()
								}
								className="w-full"
							/>
						</div>
					</div>

					<div className="grid grid-cols-2 gap-4">
						<div>
							<Label>Room</Label>
							<Select
								value={formData.room_id || ""}
								onValueChange={(value) => {
									const selectedRoom = rooms.find((r) => r.id === value);
									if (selectedRoom) {
										// Convert room price from room's currency to reservation currency
										convertCurrency(
											selectedRoom.base_price,
											selectedRoom.currency,
											formData.currency || "USD",
											reservation?.tenant_id || "",
											selectedLocation || "",
										)
											.then((convertedPrice) => {
												setFormData({
													...formData,
													room_id: value,
													room_rate: convertedPrice,
													total_amount: convertedPrice * (formData.nights || 1),
												});
											})
											.catch((error) => {
												console.error("Currency conversion failed:", error);
												// Fallback to original price
												setFormData({
													...formData,
													room_id: value,
													room_rate: selectedRoom.base_price,
													total_amount:
														selectedRoom.base_price * (formData.nights || 1),
												});
											});
									} else {
										setFormData({ ...formData, room_id: value });
									}
								}}
							>
								<SelectTrigger>
									<SelectValue placeholder="Select room" />
								</SelectTrigger>
								<SelectContent>
									{rooms.map((room) => (
										<SelectItem key={room.id} value={room.id}>
											{room.room_number} - {room.room_type}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div>
							<Label>Room Rate</Label>
							<Input
								type="number"
								step="0.01"
								value={formData.room_rate || 0}
								onChange={(e) => {
									const rate = parseFloat(e.target.value);
									setFormData({
										...formData,
										room_rate: rate,
										total_amount: rate * (formData.nights || 1),
									});
								}}
							/>
						</div>
					</div>

					<div className="grid grid-cols-2 gap-4">
						<div>
							<Label>Agent</Label>
							<Select
								value={formData.agent_id || "none"}
								onValueChange={(value) => {
									const selectedAgent = agents.find((a) => a.id === value);
									setFormData({
										...formData,
										agent_id: value === "none" ? undefined : value,
										agent_commission: selectedAgent?.commission_rate || 0,
									});
								}}
							>
								<SelectTrigger>
									<SelectValue placeholder="Select agent (optional)" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="none">No Agent</SelectItem>
									{agents.map((agent) => (
										<SelectItem key={agent.id} value={agent.id}>
											{agent.name} ({agent.commission_rate}%)
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div>
							<Label>Guide</Label>
							<Select
								value={formData.guide_id || "none"}
								onValueChange={(value) => {
									const selectedGuide = guides.find((g) => g.id === value);
									setFormData({
										...formData,
										guide_id: value === "none" ? undefined : value,
										guide_commission: selectedGuide?.commission_rate || 0,
									});
								}}
							>
								<SelectTrigger>
									<SelectValue placeholder="Select guide (optional)" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="none">No Guide</SelectItem>
									{guides.map((guide) => (
										<SelectItem key={guide.id} value={guide.id}>
											{guide.name} ({guide.commission_rate}%)
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					</div>

					<div>
						<Label>Special Requests</Label>
						<Textarea
							value={formData.special_requests || ""}
							onChange={(e) =>
								setFormData({ ...formData, special_requests: e.target.value })
							}
							placeholder="Any special requests or notes..."
						/>
					</div>

					<div className="bg-muted p-4 rounded-lg">
						<div className="grid grid-cols-3 gap-4 text-xs sm:text-sm">
							<div>
								<span className="font-medium">Total Amount:</span>
								<div className="text-lg">
									{formData.currency} {formData.total_amount}
								</div>
							</div>
							<div>
								<span className="font-medium">Paid Amount:</span>
								<div className="text-lg">
									{formData.currency} {formData.paid_amount || 0}
								</div>
							</div>
							<div>
								<span className="font-medium">Balance:</span>
								<div className="text-lg">
									{formData.currency}{" "}
									{(formData.total_amount || 0) - (formData.paid_amount || 0)}
								</div>
							</div>
						</div>
					</div>

					<div className="flex justify-between pt-4">
						<Button variant="outline" onClick={handleClose}>
							Cancel
						</Button>

						<div className="flex gap-2">
							{!isOTPVerified ? (
								<OTPVerification
									onVerified={handleOTPVerified}
									phoneNumber={location?.phone || profile?.phone || ""}
									locationId={reservation?.location_id}
									triggerComponent={
										<Button variant="default">Verify & Enable Editing</Button>
									}
								/>
							) : (
								<Button onClick={handleSubmit} disabled={isSubmitting}>
									{isSubmitting ? "Saving..." : "Save Changes"}
								</Button>
							)}
						</div>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
