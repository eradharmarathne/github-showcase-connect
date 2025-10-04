import { addDays, format } from "date-fns";
import { Calendar, Save, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
	MultiRoomSelector,
	type RoomSelection,
} from "@/components/reservation/MultiRoomSelector";
import { Button } from "@/components/ui/button";
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
import { Textarea } from "@/components/ui/textarea";
import { useLocationContext } from "@/context/LocationContext";
import { useToast } from "@/hooks/use-toast";
import { useFormFieldPreferences } from "@/hooks/useFormFieldPreferences";
import { useProfile } from "@/hooks/useProfile";
import { useRoomAvailability } from "@/hooks/useRoomAvailability";
import { useTenant } from "@/hooks/useTenant";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import { convertCurrency } from "@/utils/currency";

type Room = Tables<"rooms">;

interface NewReservationDialogProps {
	isOpen: boolean;
	onClose: () => void;
	onReservationCreated: () => void;
}

export function NewReservationDialog({
	isOpen,
	onClose,
	onReservationCreated,
}: NewReservationDialogProps) {
	const { toast } = useToast();
	const { profile } = useProfile();
	const { tenant } = useTenant();
	const { selectedLocation } = useLocationContext();
	const { preferences: fieldPreferences } = useFormFieldPreferences();
	const { isRangeAvailable } = useRoomAvailability();

	const [rooms, setRooms] = useState<Room[]>([]);
	const [loading, setLoading] = useState(false);
	const [submitting, setSubmitting] = useState(false);
	const [roomSelections, setRoomSelections] = useState<RoomSelection[]>([]);

	const [guestData, setGuestData] = useState({
		guest_name: "",
		guest_email: "",
		guest_phone: "",
		guest_address: "",
		guest_nationality: "",
		guest_passport_number: "",
		guest_id_number: "",
		special_requests: "",
	});

	const [paymentData, setPaymentData] = useState({
		advance_amount: 0,
		currency: "LKR" as string,
	});

	// Sync payment currency with the first room selection's currency
	useEffect(() => {
		if (roomSelections.length > 0 && roomSelections[0].currency) {
			const newCurrency = roomSelections[0].currency;
			if (newCurrency !== paymentData.currency) {
				setPaymentData(prev => ({ ...prev, currency: newCurrency }));
			}
		}
	}, [roomSelections, paymentData.currency]);

	// Calculate total amount across all room selections in payment currency
	const calculateTotalAmount = useCallback(async () => {
		let total = 0;
		for (const selection of roomSelections) {
			if (selection.currency === paymentData.currency) {
				total += selection.total_amount;
			} else {
				try {
					const convertedAmount = await convertCurrency(
						selection.total_amount,
						selection.currency,
						paymentData.currency
					);
					total += convertedAmount;
				} catch (error) {
					console.error('Currency conversion error:', error);
					total += selection.total_amount; // Fallback to original amount
				}
			}
		}
		return total;
	}, [roomSelections, paymentData.currency]);

	// State to store converted total amount
	const [convertedTotal, setConvertedTotal] = useState(0);

	// Update converted total when room selections or payment currency changes
	useEffect(() => {
		const updateTotal = async () => {
			const total = await calculateTotalAmount();
			setConvertedTotal(total);
		};
		updateTotal();
	}, [calculateTotalAmount]);

	// Fetch rooms for selected location
	const fetchRooms = useCallback(async () => {
		if (!selectedLocation || !tenant?.id) return;

		try {
			const { data, error } = await supabase
				.from("rooms")
				.select("*")
				.eq("location_id", selectedLocation)
				.eq("tenant_id", tenant.id)
				.eq("is_active", true)
				.order("room_number");

			if (error) throw error;
			setRooms(data || []);
		} catch (error) {
			console.error("Error fetching rooms:", error);
			toast({
				title: "Error",
				description: "Failed to fetch rooms",
				variant: "destructive",
			});
		}
	}, [selectedLocation, tenant?.id, toast]);

	// Fetch rooms when dialog opens
	useEffect(() => {
		if (isOpen) {
			fetchRooms();
		}
	}, [isOpen, fetchRooms]);

	const handleGuestDataChange = (field: string, value: any) => {
		setGuestData((prev) => ({ ...prev, [field]: value }));
	};

	const handlePaymentDataChange = (field: string, value: any) => {
		setPaymentData((prev) => ({ ...prev, [field]: value }));
	};

	// Get currency symbol helper
	const getCurrencySymbol = (currency: string) => {
		switch (currency) {
			case "USD":
				return "$";
			case "EUR":
				return "€";
			case "GBP":
				return "£";
			case "LKR":
				return "Rs.";
			default:
				return "";
		}
	};

	const generateReservationNumber = async (): Promise<string> => {
		try {
			const { data, error } = await supabase.rpc(
				"generate_reservation_number",
				{
					p_tenant_id: tenant?.id,
				},
			);

			if (error) throw error;
			return data || `RES${Date.now()}`;
		} catch (error) {
			console.error("Error generating reservation number:", error);
			return `RES${Date.now()}`;
		}
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (!tenant?.id || !profile?.id) {
			toast({
				title: "Error",
				description: "Missing tenant or profile information",
				variant: "destructive",
			});
			return;
		}

		if (
			!selectedLocation ||
			!guestData.guest_name ||
			roomSelections.length === 0
		) {
			toast({
				title: "Error",
				description:
					"Please fill in all required fields and select at least one room",
				variant: "destructive",
			});
			return;
		}

		// Validate that all room selections have room_id
		const invalidSelections = roomSelections.filter(
			(selection) => !selection.room_id,
		);
		if (invalidSelections.length > 0) {
			toast({
				title: "Error",
				description: "Please select a room for all room selections",
				variant: "destructive",
			});
			return;
		}

		// Validate that all room selections have dates
		const missingDatesSelections = roomSelections.filter(
			(selection) => !selection.check_in_date || !selection.check_out_date,
		);
		if (missingDatesSelections.length > 0) {
			toast({
				title: "Error",
				description:
					"Please select check-in and check-out dates for all room selections",
				variant: "destructive",
			});
			return;
		}

		// Validate room availability for all selections
		const unavailableSelections = roomSelections.filter((selection) => {
			const checkIn = new Date(selection.check_in_date);
			const checkOut = new Date(selection.check_out_date);
			return !isRangeAvailable(checkIn, checkOut, selection.room_id);
		});

		if (unavailableSelections.length > 0) {
			toast({
				title: "Room Unavailable",
				description:
					"One or more selected rooms are not available for the chosen dates. Please adjust your selection.",
				variant: "destructive",
			});
			return;
		}

		setSubmitting(true);

		try {
			// Generate a group ID for multiple rooms
			const bookingGroupId = crypto.randomUUID();
			const reservations = [];

			// Create reservation data for each room
			for (const selection of roomSelections) {
				const reservationNumber = await generateReservationNumber();

				const reservationData = {
					reservation_number: reservationNumber,
					booking_group_id: roomSelections.length > 1 ? bookingGroupId : null,
					location_id: selectedLocation,
					room_id: selection.room_id,
					guest_name: guestData.guest_name,
					guest_email: guestData.guest_email || null,
					guest_phone: guestData.guest_phone || null,
					guest_address: guestData.guest_address || null,
					guest_nationality: guestData.guest_nationality || null,
					guest_passport_number: guestData.guest_passport_number || null,
					guest_id_number: guestData.guest_id_number || null,
					adults: selection.adults,
					children: selection.children,
					check_in_date: selection.check_in_date,
					check_out_date: selection.check_out_date,
					nights: selection.nights,
					room_rate: selection.room_rate,
					total_amount: selection.total_amount,
					advance_amount: paymentData.advance_amount / roomSelections.length, // Split advance across rooms
					paid_amount: paymentData.advance_amount / roomSelections.length,
					balance_amount:
						selection.total_amount -
						paymentData.advance_amount / roomSelections.length,
					currency: selection.currency as any,
					status: "tentative" as const,
					arrival_time: selection.arrival_time || null,
					special_requests: guestData.special_requests || null,
					booking_source: "direct",
					created_by: profile.id,
					tenant_id: tenant.id,
				};

				reservations.push(reservationData);
			}

			// Insert all reservations in a single transaction
			const { error } = await supabase
				.from("reservations")
				.insert(reservations);

			if (error) throw error;

			const reservationNumbers = reservations
				.map((r) => r.reservation_number)
				.join(", ");
			toast({
				title: "Success",
				description: `Reservation(s) ${reservationNumbers} created successfully`,
			});

			// Reset form and close dialog
			setRoomSelections([]);
			setGuestData({
				guest_name: "",
				guest_email: "",
				guest_phone: "",
				guest_address: "",
				guest_nationality: "",
				guest_passport_number: "",
				guest_id_number: "",
				special_requests: "",
			});
			setPaymentData({
				advance_amount: 0,
				currency: "LKR",
			});

			onReservationCreated();
			onClose();
		} catch (error) {
			console.error("Error creating reservation:", error);
			toast({
				title: "Error",
				description: "Failed to create reservation",
				variant: "destructive",
			});
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<Dialog open={isOpen} onOpenChange={onClose}>
			<DialogContent className="max-w-4xl sm:max-w-6xl md:max-w-7xl max-h-[90vh] sm:min-h-[95vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<Calendar className="h-5 w-5" />
						Create New Reservation
					</DialogTitle>
					<DialogDescription>
						Fill in the details to create a new reservation for one or more
						rooms
					</DialogDescription>
				</DialogHeader>

				<form onSubmit={handleSubmit} className="space-y-6 overflow-y-auto">
					{/* Guest Information */}
					<div className="space-y-4">
						<h3 className="text-lg font-semibold">Guest Information</h3>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div className="md:col-span-2 space-y-2">
								<Label htmlFor="guest_name">Guest Name *</Label>
								<Input
									id="guest_name"
									value={guestData.guest_name}
									onChange={(e) =>
										handleGuestDataChange("guest_name", e.target.value)
									}
									placeholder="Enter guest name"
									required
								/>
							</div>

							{fieldPreferences?.show_guest_email !== false && (
								<div className="space-y-2">
									<Label htmlFor="guest_email">Email</Label>
									<Input
										id="guest_email"
										type="email"
										value={guestData.guest_email}
										onChange={(e) =>
											handleGuestDataChange("guest_email", e.target.value)
										}
										placeholder="Enter email address"
									/>
								</div>
							)}

							{fieldPreferences?.show_guest_phone !== false && (
								<div className="space-y-2">
									<Label htmlFor="guest_phone">Phone</Label>
									<PhoneInput
										defaultCountry="LK"
										international
										value={guestData.guest_phone}
										onChange={(value) =>
											handleGuestDataChange("guest_phone", value || "")
										}
										placeholder="Enter phone number"
									/>
								</div>
							)}

							{fieldPreferences?.show_guest_nationality !== false && (
								<div className="space-y-2">
									<Label htmlFor="guest_nationality">Nationality</Label>
									<Input
										id="guest_nationality"
										value={guestData.guest_nationality}
										onChange={(e) =>
											handleGuestDataChange("guest_nationality", e.target.value)
										}
										placeholder="Enter nationality"
									/>
								</div>
							)}

							{fieldPreferences?.show_guest_passport_number !== false && (
								<div className="space-y-2">
									<Label htmlFor="guest_passport_number">Passport Number</Label>
									<Input
										id="guest_passport_number"
										value={guestData.guest_passport_number}
										onChange={(e) =>
											handleGuestDataChange(
												"guest_passport_number",
												e.target.value,
											)
										}
										placeholder="Enter passport number"
									/>
								</div>
							)}

							{fieldPreferences?.show_guest_id_number !== false && (
								<div className="space-y-2">
									<Label htmlFor="guest_id_number">ID Number</Label>
									<Input
										id="guest_id_number"
										value={guestData.guest_id_number}
										onChange={(e) =>
											handleGuestDataChange("guest_id_number", e.target.value)
										}
										placeholder="Enter ID number"
									/>
								</div>
							)}

							{fieldPreferences?.show_guest_address !== false && (
								<div className="md:col-span-2 space-y-2">
									<Label htmlFor="guest_address">Address</Label>
									<Textarea
										id="guest_address"
										value={guestData.guest_address}
										onChange={(e) =>
											handleGuestDataChange("guest_address", e.target.value)
										}
										placeholder="Enter address"
										rows={3}
									/>
								</div>
							)}
						</div>
					</div>

					{/* Room Selections */}
					<MultiRoomSelector
						rooms={rooms}
						roomSelections={roomSelections}
						onRoomSelectionsChange={setRoomSelections}
						defaultCurrency={paymentData.currency}
					/>

					{/* Special Requests */}
					{fieldPreferences?.show_special_requests !== false && (
						<div className="space-y-2">
							<Label htmlFor="special_requests">Special Requests</Label>
							<Textarea
								id="special_requests"
								value={guestData.special_requests}
								onChange={(e) =>
									handleGuestDataChange("special_requests", e.target.value)
								}
								placeholder="Any special requests or notes"
							/>
						</div>
					)}

					{/* Payment Information */}
					<div className="space-y-4">
						<h3 className="text-lg font-semibold">Payment Information</h3>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							{fieldPreferences?.show_advance_amount !== false && (
								<div className="space-y-2">
									<Label htmlFor="advance_amount">Advance Amount</Label>
									<Input
										id="advance_amount"
										type="number"
										step="0.01"
										value={paymentData.advance_amount}
										onChange={(e) =>
											handlePaymentDataChange(
												"advance_amount",
												Number(e.target.value),
											)
										}
										placeholder="Enter advance amount"
									/>
								</div>
							)}
						</div>

						{/* Total Summary */}
						{roomSelections.length > 0 && (
							<div className="bg-blue-50 p-4 rounded-md border border-blue-200">
								<div className="space-y-2">
									<div className="flex justify-between items-center">
										<span className="font-semibold">
											Grand Total ({roomSelections.length} room
											{roomSelections.length > 1 ? "s" : ""}):
										</span>
										<span className="text-xl font-bold text-blue-700">
											{getCurrencySymbol(paymentData.currency)}
											{convertedTotal.toFixed(2)}
										</span>
									</div>
									{paymentData.advance_amount > 0 && (
										<>
											<div className="flex justify-between items-center text-sm">
												<span>Advance Amount:</span>
												<span>
													{getCurrencySymbol(paymentData.currency)}
													{paymentData.advance_amount.toFixed(2)}
												</span>
											</div>
											<div className="flex justify-between items-center text-sm font-semibold">
												<span>Balance Amount:</span>
												<span>
													{getCurrencySymbol(paymentData.currency)}
													{(
														convertedTotal - paymentData.advance_amount
													).toFixed(2)}
												</span>
											</div>
										</>
									)}
								</div>
							</div>
						)}
					</div>

					{/* Action Buttons */}
					<div className="flex w-full items-center justify-end gap-3 py-4 border-t">
						<Button type="button" variant="outline" onClick={onClose}>
							<X className="h-4 w-4 mr-2" />
							Cancel
						</Button>
						<Button className="border" type="submit" disabled={submitting}>
							<Save className="h-4 w-4 mr-2" />
							{submitting
								? "Creating..."
								: `Create Reservation${roomSelections.length > 1 ? "s" : ""}`}
						</Button>
					</div>
				</form>
			</DialogContent>
		</Dialog>
	);
}
