import { addDays, differenceInDays, format, parseISO } from "date-fns";
import { Calendar, CalendarDays, Save, User, X } from "lucide-react";
import { useEffect, useState } from "react";
import { CurrencySelector } from "@/components/common/currency-selector";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useLocationContext } from "@/context/location-context";
import { useFormFieldPreferences } from "@/hooks/use-form-field-preferences";
import { usePermissions } from "@/hooks/use-permissions";
import { useProfile } from "@/hooks/use-profile";
import { useRoomAvailability } from "@/hooks/use-room-availability";
import { useTenant } from "@/hooks/use-tenant";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import { convertCurrency } from "@/utils/currency";
import { cn } from "@/lib/utils";

type Room = Tables<"rooms">;
type Currency = "LKR" | "USD" | "EUR" | "GBP";

interface CompactReservationDialogProps {
	isOpen: boolean;
	onClose: () => void;
	onReservationCreated: () => void;
	defaultCheckIn?: Date;
	defaultCheckOut?: Date;
	preSelectedRoomId?: string;
}

interface ReservationFormData {
	// Guest Information
	guest_name: string;
	guest_email: string;
	guest_phone: string;
	guest_address: string;
	guest_nationality: string;
	guest_passport_number: string;
	guest_id_number: string;

	// Booking Details
	room_id: string;
	check_in_date: string;
	check_out_date: string;
	adults: number;
	children: number;
	arrival_time: string;
	special_requests: string;
	booking_source: string;

	// Pricing
	room_rate: number;
	currency: Currency;
	advance_amount: number;

	// Additional
	guide_id: string;
	agent_id: string;
}

export function CompactReservationDialog({
	isOpen,
	onClose,
	onReservationCreated,
	defaultCheckIn,
	defaultCheckOut,
	preSelectedRoomId,
}: CompactReservationDialogProps) {
	const { toast } = useToast();
	const { profile } = useProfile();
	const { tenant } = useTenant();
	const { selectedLocation } = useLocationContext();
	const { preferences: fieldPreferences } = useFormFieldPreferences();
	const { hasAnyPermission } = usePermissions();
	const { isDateAvailable, isRangeAvailable } = useRoomAvailability();

	// Check permissions - user must have booking access
	const canCreateReservation = hasAnyPermission(["access_bookings", "access_calendar"]);

	const [submitting, setSubmitting] = useState(false);
	const [rooms, setRooms] = useState<Room[]>([]);
	const [agents, setAgents] = useState<Array<{ id: string; name: string; tenant_id: string }>>([]);
	const [guides, setGuides] = useState<Array<{ id: string; name: string; tenant_id: string }>>([]);
	const [loadingData, setLoadingData] = useState(false);

	// Form state
	const [formData, setFormData] = useState<ReservationFormData>({
		guest_name: "",
		guest_email: "",
		guest_phone: "",
		guest_address: "",
		guest_nationality: "",
		guest_passport_number: "",
		guest_id_number: "",
		room_id: preSelectedRoomId || "",
		check_in_date: defaultCheckIn ? format(defaultCheckIn, "yyyy-MM-dd") : "",
		check_out_date: defaultCheckOut ? format(defaultCheckOut, "yyyy-MM-dd") : "",
		adults: 1,
		children: 0,
		arrival_time: "",
		special_requests: "",
		booking_source: "direct",
		room_rate: 0,
		currency: "LKR",
		advance_amount: 0,
		guide_id: "",
		agent_id: "",
	});

	// Calendar state
	const [selectedDate, setSelectedDate] = useState<Date | undefined>(
		defaultCheckIn || undefined
	);
	const [isSelectingCheckOut, setIsSelectingCheckOut] = useState(false);

	const checkInDate = formData.check_in_date ? parseISO(formData.check_in_date) : undefined;
	const checkOutDate = formData.check_out_date ? parseISO(formData.check_out_date) : undefined;
	const nights = checkInDate && checkOutDate ? differenceInDays(checkOutDate, checkInDate) : 0;
	const totalAmount = formData.room_rate * nights;

	// Load required data
	useEffect(() => {
		if (!isOpen || !selectedLocation) return;

		const loadData = async () => {
			setLoadingData(true);
			try {
				// Load rooms
				const { data: roomsData, error: roomsError } = await supabase
					.from("rooms")
					.select("*")
					.eq("location_id", selectedLocation)
					.eq("tenant_id", tenant?.id)
					.order("room_number");

				if (roomsError) throw roomsError;
				setRooms(roomsData || []);

				// Load agents if enabled
				if (fieldPreferences?.show_agent !== false) {
					const { data: agentsData } = await supabase
						.from("agents")
						.select("id, name, tenant_id")
						.eq("tenant_id", tenant?.id)
						.order("name");
					setAgents(agentsData || []);
				}

				// Load guides if enabled
				if (fieldPreferences?.show_guide !== false) {
					const { data: guidesData } = await supabase
						.from("guides")
						.select("id, name, tenant_id")
						.eq("tenant_id", tenant?.id)
						.order("name");
					setGuides(guidesData || []);
				}
			} catch (error) {
				console.error("Error loading data:", error);
				toast({
					title: "Error",
					description: "Failed to load required data",
					variant: "destructive",
				});
			} finally {
				setLoadingData(false);
			}
		};

		loadData();
	}, [isOpen, selectedLocation, tenant?.id, fieldPreferences, toast]);

	// Update room rate when room changes
	useEffect(() => {
		if (formData.room_id) {
			const selectedRoom = rooms.find(room => room.id === formData.room_id);
			if (selectedRoom) {
				setFormData(prev => ({
					...prev,
					room_rate: selectedRoom.base_price || 0,
					currency: selectedRoom.currency as Currency || "LKR",
				}));
			}
		}
	}, [formData.room_id, rooms]);

	const handleFieldChange = (field: keyof ReservationFormData, value: any) => {
		setFormData(prev => ({ ...prev, [field]: value }));
	};

	const handleCalendarSelect = (date: Date | undefined) => {
		if (!date) return;

		if (!isSelectingCheckOut) {
			// Selecting check-in date
			setFormData(prev => ({
				...prev,
				check_in_date: format(date, "yyyy-MM-dd"),
				check_out_date: "", // Clear check-out when check-in changes
			}));
			setSelectedDate(date);
			setIsSelectingCheckOut(true);
		} else {
			// Selecting check-out date
			if (checkInDate && date > checkInDate) {
				setFormData(prev => ({
					...prev,
					check_out_date: format(date, "yyyy-MM-dd"),
				}));
				setIsSelectingCheckOut(false);
			} else {
				toast({
					title: "Invalid Date",
					description: "Check-out date must be after check-in date",
					variant: "destructive",
				});
			}
		}
	};

	const resetCalendarSelection = () => {
		setIsSelectingCheckOut(false);
		setSelectedDate(checkInDate);
	};

	const isCalendarDateDisabled = (date: Date) => {
		const today = new Date();
		today.setHours(0, 0, 0, 0);
		
		// Disable past dates
		if (date < today) return true;

		// If selecting check-out, must be after check-in
		if (isSelectingCheckOut && checkInDate) {
			if (date <= checkInDate) return true;
		}

		// Check room availability if room is selected
		if (formData.room_id) {
			if (isSelectingCheckOut && checkInDate) {
				// Check if the entire range is available
				return !isRangeAvailable(checkInDate, date, formData.room_id);
			} else {
				// Check if the date is available for check-in
				return !isDateAvailable(date, formData.room_id);
			}
		}

		return false;
	};

	const validateForm = (): boolean => {
		if (!formData.guest_name.trim()) {
			toast({
				title: "Validation Error",
				description: "Guest name is required",
				variant: "destructive",
			});
			return false;
		}

		if (!formData.room_id) {
			toast({
				title: "Validation Error",
				description: "Please select a room",
				variant: "destructive",
			});
			return false;
		}

		if (!formData.check_in_date || !formData.check_out_date) {
			toast({
				title: "Validation Error",
				description: "Please select check-in and check-out dates",
				variant: "destructive",
			});
			return false;
		}

		if (nights <= 0) {
			toast({
				title: "Validation Error",
				description: "Check-out date must be after check-in date",
				variant: "destructive",
			});
			return false;
		}

		return true;
	};

	const generateReservationNumber = async (): Promise<string> => {
		try {
			const { data, error } = await supabase.rpc("generate_reservation_number", {
				p_tenant_id: tenant?.id,
			});

			if (error) throw error;
			return data || `RES${Date.now()}`;
		} catch (error) {
			console.error("Error generating reservation number:", error);
			return `RES${Date.now()}`;
		}
	};

	const handleSubmit = async () => {
		if (!validateForm() || !tenant?.id || !profile?.id || !selectedLocation) return;

		setSubmitting(true);

		try {
			const reservationNumber = await generateReservationNumber();

			const reservationData = {
				reservation_number: reservationNumber,
				location_id: selectedLocation,
				room_id: formData.room_id,
				guest_name: formData.guest_name,
				guest_email: formData.guest_email || null,
				guest_phone: formData.guest_phone || null,
				guest_address: formData.guest_address || null,
				guest_nationality: formData.guest_nationality || null,
				guest_passport_number: formData.guest_passport_number || null,
				guest_id_number: formData.guest_id_number || null,
				adults: formData.adults,
				children: formData.children,
				check_in_date: formData.check_in_date,
				check_out_date: formData.check_out_date,
				nights,
				room_rate: formData.room_rate,
				total_amount: totalAmount,
				advance_amount: formData.advance_amount,
				paid_amount: 0,
				balance_amount: totalAmount,
				currency: formData.currency,
				status: "tentative" as const,
				arrival_time: formData.arrival_time || null,
				special_requests: formData.special_requests || null,
				booking_source: formData.booking_source,
				guide_id: formData.guide_id || null,
				agent_id: formData.agent_id || null,
				created_by: profile.id,
				tenant_id: tenant.id,
			};

			const { error } = await supabase
				.from("reservations")
				.insert([reservationData]);

			if (error) throw error;

			toast({
				title: "Success",
				description: `Reservation ${reservationNumber} created successfully`,
			});

			onReservationCreated();
			onClose();
			resetForm();
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

	const resetForm = () => {
		setFormData({
			guest_name: "",
			guest_email: "",
			guest_phone: "",
			guest_address: "",
			guest_nationality: "",
			guest_passport_number: "",
			guest_id_number: "",
			room_id: preSelectedRoomId || "",
			check_in_date: defaultCheckIn ? format(defaultCheckIn, "yyyy-MM-dd") : "",
			check_out_date: defaultCheckOut ? format(defaultCheckOut, "yyyy-MM-dd") : "",
			adults: 1,
			children: 0,
			arrival_time: "",
			special_requests: "",
			booking_source: "direct",
			room_rate: 0,
			currency: "LKR",
			advance_amount: 0,
			guide_id: "",
			agent_id: "",
		});
		setSelectedDate(defaultCheckIn);
		setIsSelectingCheckOut(false);
	};

	if (!canCreateReservation) {
		return (
			<Dialog open={isOpen} onOpenChange={onClose}>
				<DialogContent className="max-w-md">
					<DialogHeader>
						<DialogTitle>Access Denied</DialogTitle>
						<DialogDescription>
							You don't have permission to create reservations.
						</DialogDescription>
					</DialogHeader>
					<div className="flex justify-end">
						<Button onClick={onClose}>Close</Button>
					</div>
				</DialogContent>
			</Dialog>
		);
	}

	return (
		<Dialog open={isOpen} onOpenChange={onClose} >
			<DialogContent className="w-full min-w-[90vw] max-h-[95vh] overflow-hidden flex flex-col">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<Calendar className="h-5 w-5" />
						Create New Reservation
					</DialogTitle>
					<DialogDescription>
						Complete reservation details in one compact form
					</DialogDescription>
				</DialogHeader>

				<div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 overflow-hidden">
					{/* Left Side - Form Fields */}
					<div className="lg:col-span-2 space-y-6 overflow-y-auto">
						<ScrollArea className="h-full pr-4 py-12">
							{loadingData ? (
								<div className="flex items-center justify-center p-8">
									<div className="text-muted-foreground">Loading...</div>
								</div>
							) : (
								<div className="space-y-6">
									{/* Guest Information */}
									<Card>
										<CardHeader>
											<CardTitle className="flex items-center gap-2 text-lg">
												<User className="h-4 w-4" />
												Guest Information
											</CardTitle>
										</CardHeader>
										<CardContent className="space-y-4">
											<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
												<div className="md:col-span-2">
													<Label>Guest Name *</Label>
													<Input
														value={formData.guest_name}
														onChange={(e) => handleFieldChange("guest_name", e.target.value)}
														placeholder="Enter guest name"
														required
													/>
												</div>

												{fieldPreferences?.show_guest_email !== false && (
													<div>
														<Label>Email</Label>
														<Input
															type="email"
															value={formData.guest_email}
															onChange={(e) => handleFieldChange("guest_email", e.target.value)}
															placeholder="Enter email"
														/>
													</div>
												)}

												{fieldPreferences?.show_guest_phone !== false && (
													<div>
														<Label>Phone</Label>
														<PhoneInput
															defaultCountry="LK"
															international
															value={formData.guest_phone}
															onChange={(value) => handleFieldChange("guest_phone", value || "")}
															placeholder="Enter phone number"
														/>
													</div>
												)}

												{fieldPreferences?.show_guest_nationality !== false && (
													<div>
														<Label>Nationality</Label>
														<Input
															value={formData.guest_nationality}
															onChange={(e) => handleFieldChange("guest_nationality", e.target.value)}
															placeholder="Enter nationality"
														/>
													</div>
												)}

												{fieldPreferences?.show_guest_passport_number !== false && (
													<div>
														<Label>Passport Number</Label>
														<Input
															value={formData.guest_passport_number}
															onChange={(e) => handleFieldChange("guest_passport_number", e.target.value)}
															placeholder="Enter passport number"
														/>
													</div>
												)}

												{fieldPreferences?.show_guest_id_number !== false && (
													<div>
														<Label>ID Number</Label>
														<Input
															value={formData.guest_id_number}
															onChange={(e) => handleFieldChange("guest_id_number", e.target.value)}
															placeholder="Enter ID number"
														/>
													</div>
												)}

												{fieldPreferences?.show_guest_address !== false && (
													<div className="md:col-span-2">
														<Label>Address</Label>
														<Textarea
															value={formData.guest_address}
															onChange={(e) => handleFieldChange("guest_address", e.target.value)}
															placeholder="Enter address"
															rows={2}
														/>
													</div>
												)}
											</div>
										</CardContent>
									</Card>

									{/* Booking Details */}
									<Card>
										<CardHeader>
											<CardTitle className="flex items-center gap-2 text-lg">
												<CalendarDays className="h-4 w-4" />
												Booking Details
											</CardTitle>
										</CardHeader>
										<CardContent className="space-y-4">
											<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
												<div className="md:col-span-2">
													<Label>Room *</Label>
													<Select
														value={formData.room_id}
														onValueChange={(value) => handleFieldChange("room_id", value)}
													>
														<SelectTrigger>
															<SelectValue placeholder="Select a room" />
														</SelectTrigger>
														<SelectContent>
															{rooms.map((room) => (
																<SelectItem key={room.id} value={room.id}>
																	{room.room_number} - {room.room_type} ({room.currency} {room.base_price})
																</SelectItem>
															))}
														</SelectContent>
													</Select>
												</div>

												<div>
													<Label>Check-in Date *</Label>
													<Input
														type="date"
														value={formData.check_in_date}
														onChange={(e) => handleFieldChange("check_in_date", e.target.value)}
														min={format(new Date(), "yyyy-MM-dd")}
													/>
												</div>

												<div>
													<Label>Check-out Date *</Label>
													<Input
														type="date"
														value={formData.check_out_date}
														onChange={(e) => handleFieldChange("check_out_date", e.target.value)}
														min={formData.check_in_date || format(addDays(new Date(), 1), "yyyy-MM-dd")}
													/>
												</div>

												{fieldPreferences?.show_adults !== false && (
													<div>
														<Label>Adults</Label>
														<Input
															type="number"
															min="1"
															value={formData.adults}
															onChange={(e) => handleFieldChange("adults", parseInt(e.target.value) || 1)}
														/>
													</div>
												)}

												{fieldPreferences?.show_children !== false && (
													<div>
														<Label>Children</Label>
														<Input
															type="number"
															min="0"
															value={formData.children}
															onChange={(e) => handleFieldChange("children", parseInt(e.target.value) || 0)}
														/>
													</div>
												)}

												{fieldPreferences?.show_arrival_time !== false && (
													<div>
														<Label>Arrival Time</Label>
														<Input
															type="time"
															value={formData.arrival_time}
															onChange={(e) => handleFieldChange("arrival_time", e.target.value)}
														/>
													</div>
												)}

												{fieldPreferences?.show_booking_source !== false && (
													<div>
														<Label>Booking Source</Label>
														<Select
															value={formData.booking_source}
															onValueChange={(value) => handleFieldChange("booking_source", value)}
														>
															<SelectTrigger>
																<SelectValue />
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
												)}

												{fieldPreferences?.show_guide !== false && guides.length > 0 && (
													<div>
														<Label>Guide</Label>
														<Select
															value={formData.guide_id}
															onValueChange={(value) => handleFieldChange("guide_id", value)}
														>
															<SelectTrigger>
																<SelectValue placeholder="Select guide" />
															</SelectTrigger>
															<SelectContent>
																{guides.map((guide) => (
																	<SelectItem key={guide.id} value={guide.id}>
																		{guide.name}
																	</SelectItem>
																))}
															</SelectContent>
														</Select>
													</div>
												)}

												{fieldPreferences?.show_agent !== false && agents.length > 0 && (
													<div>
														<Label>Agent</Label>
														<Select
															value={formData.agent_id}
															onValueChange={(value) => handleFieldChange("agent_id", value)}
														>
															<SelectTrigger>
																<SelectValue placeholder="Select agent" />
															</SelectTrigger>
															<SelectContent>
																{agents.map((agent) => (
																	<SelectItem key={agent.id} value={agent.id}>
																		{agent.name}
																	</SelectItem>
																))}
															</SelectContent>
														</Select>
													</div>
												)}
											</div>

											{fieldPreferences?.show_special_requests !== false && (
												<div>
													<Label>Special Requests</Label>
													<Textarea
														value={formData.special_requests}
														onChange={(e) => handleFieldChange("special_requests", e.target.value)}
														placeholder="Any special requests or notes"
														rows={2}
													/>
												</div>
											)}
										</CardContent>
									</Card>

									{/* Pricing */}
									<Card>
										<CardHeader>
											<CardTitle className="text-lg">Pricing Details</CardTitle>
										</CardHeader>
										<CardContent className="space-y-4">
											<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
												<div>
													<Label>Room Rate</Label>
													<Input
														type="number"
														min="0"
														step="0.01"
														value={formData.room_rate}
														onChange={(e) => handleFieldChange("room_rate", parseFloat(e.target.value) || 0)}
													/>
												</div>

												<div>
													<Label>Currency</Label>
													<CurrencySelector
														currency={formData.currency}
														onCurrencyChange={(value) => handleFieldChange("currency", value)}
													/>
												</div>

												{fieldPreferences?.show_advance_amount !== false && (
													<div>
														<Label>Advance Amount</Label>
														<Input
															type="number"
															min="0"
															step="0.01"
															value={formData.advance_amount}
															onChange={(e) => handleFieldChange("advance_amount", parseFloat(e.target.value) || 0)}
														/>
													</div>
												)}
											</div>

											{nights > 0 && (
												<div className="p-4 bg-muted rounded-lg">
													<div className="flex justify-between items-center text-sm">
														<span>Nights:</span>
														<span className="font-medium">{nights}</span>
													</div>
													<div className="flex justify-between items-center text-sm">
														<span>Rate per night:</span>
														<span className="font-medium">{formData.currency} {formData.room_rate}</span>
													</div>
													<div className="flex justify-between items-center font-semibold border-t pt-2 mt-2">
														<span>Total Amount:</span>
														<span>{formData.currency} {totalAmount.toFixed(2)}</span>
													</div>
													{formData.advance_amount > 0 && (
														<div className="flex justify-between items-center text-sm text-muted-foreground">
															<span>Balance:</span>
															<span>{formData.currency} {(totalAmount - formData.advance_amount).toFixed(2)}</span>
														</div>
													)}
												</div>
											)}
										</CardContent>
									</Card>
								</div>
							)}
						</ScrollArea>
					</div>

					{/* Right Side - Calendar */}
					<div className="space-y-4">
						<Card className="h-full">
							<CardHeader>
								<CardTitle className="text-lg">
									{!isSelectingCheckOut ? "Select Check-in Date" : "Select Check-out Date"}
								</CardTitle>
								{isSelectingCheckOut && checkInDate && (
									<div className="text-sm text-muted-foreground">
										Check-in: {format(checkInDate, "MMM dd, yyyy")}
									</div>
								)}
							</CardHeader>
							<CardContent>
								<CalendarComponent
									mode="single"
									selected={isSelectingCheckOut ? checkOutDate : checkInDate}
									onSelect={handleCalendarSelect}
									disabled={isCalendarDateDisabled}
									modifiers={{
										checkIn: checkInDate ? [checkInDate] : [],
										checkOut: checkOutDate ? [checkOutDate] : [],
										range: checkInDate && checkOutDate ? {
											from: checkInDate,
											to: checkOutDate,
										} : undefined,
									}}
									modifiersClassNames={{
										checkIn: "bg-blue-500 text-white",
										checkOut: "bg-green-500 text-white",
										range: "bg-blue-100 text-blue-900",
									}}
									className="w-full"
								/>

								{formData.room_id && (
									<div className="mt-4 space-y-2">
										<div className="text-xs text-muted-foreground">Legend:</div>
										<div className="flex flex-wrap gap-2 text-xs">
											<div className="flex items-center gap-1">
												<div className="w-3 h-3 bg-green-100 border border-green-300 rounded"></div>
												<span>Available</span>
											</div>
											<div className="flex items-center gap-1">
												<div className="w-3 h-3 bg-red-100 border border-red-300 rounded"></div>
												<span>Unavailable</span>
											</div>
											<div className="flex items-center gap-1">
												<div className="w-3 h-3 bg-blue-500 rounded"></div>
												<span>Check-in</span>
											</div>
											<div className="flex items-center gap-1">
												<div className="w-3 h-3 bg-green-500 rounded"></div>
												<span>Check-out</span>
											</div>
										</div>
									</div>
								)}

								{checkInDate && checkOutDate && (
									<div className="mt-4 p-3 bg-muted rounded-lg">
										<div className="text-sm font-medium mb-2">Selected Dates</div>
										<div className="space-y-1 text-xs">
											<div>Check-in: {format(checkInDate, "MMM dd, yyyy")}</div>
											<div>Check-out: {format(checkOutDate, "MMM dd, yyyy")}</div>
											<div className="font-medium">Nights: {nights}</div>
										</div>
										<Button
											variant="outline"
											size="sm"
											onClick={resetCalendarSelection}
											className="w-full mt-2"
										>
											Change Dates
										</Button>
									</div>
								)}
							</CardContent>
						</Card>
					</div>
				</div>

				{/* Footer */}
				<div className="flex items-center justify-between pt-4 border-t">
					<div className="text-sm text-muted-foreground">
						{nights > 0 && `${nights} night${nights > 1 ? 's' : ''} • Total: ${formData.currency} ${totalAmount.toFixed(2)}`}
					</div>
					<div className="flex gap-2">
						<Button variant="outline" onClick={onClose}>
							<X className="h-4 w-4 mr-2" />
							Cancel
						</Button>
						<Button onClick={handleSubmit} disabled={submitting}>
							<Save className="h-4 w-4 mr-2" />
							{submitting ? "Creating..." : "Create Reservation"}
						</Button>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}