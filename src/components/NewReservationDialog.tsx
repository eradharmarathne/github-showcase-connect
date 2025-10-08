import { Calendar, ChevronLeft, ChevronRight, Save, X } from "lucide-react";
import { lazy, Suspense, useCallback, useEffect, useState } from "react";
import { type RoomSelection } from "@/components/reservation/MultiRoomSelector";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { useLocationContext } from "@/context/LocationContext";
import { useToast } from "@/hooks/use-toast";
import { useProfile } from "@/hooks/useProfile";
import { useRoomAvailability } from "@/hooks/useRoomAvailability";
import { useTenant } from "@/hooks/useTenant";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import { convertCurrency } from "@/utils/currency";
import { ConfirmationStep } from "./reservation/new/ConfirmationStep";
import {
	GuestData,
	GuestInformationStep,
} from "./reservation/new/GuestInformationStep";
import { PaymentData, PaymentStep } from "./reservation/new/PaymentStep";
import { PricingStep } from "./reservation/new/PricingStep";
import { RoomSelectionStep } from "./reservation/new/RoomSelectionStep";

type Room = Tables<"rooms">;

interface NewReservationDialogProps {
	isOpen: boolean;
	onClose: () => void;
	onReservationCreated: () => void;
}

const STEPS = [
	{ id: "guest", title: "Guest Information", icon: Calendar },
	{ id: "rooms", title: "Room Selection", icon: Calendar },
	{ id: "pricing", title: "Pricing", icon: Calendar },
	{ id: "payment", title: "Payment", icon: Calendar },
	{ id: "confirmation", title: "Confirmation", icon: Calendar },
] as const;

type StepId = (typeof STEPS)[number]["id"];

export function NewReservationDialog({
	isOpen,
	onClose,
	onReservationCreated,
}: NewReservationDialogProps) {
	const { toast } = useToast();
	const { profile } = useProfile();
	const { tenant } = useTenant();
	const { selectedLocation } = useLocationContext();
	const { isRangeAvailable } = useRoomAvailability();

	const [currentStep, setCurrentStep] = useState<StepId>("guest");
	const [rooms, setRooms] = useState<Room[]>([]);
	const [loading, setLoading] = useState(false);
	const [submitting, setSubmitting] = useState(false);
	const [roomSelections, setRoomSelections] = useState<RoomSelection[]>([]);

	const [guestData, setGuestData] = useState<GuestData>({
		guest_name: "",
		guest_email: "",
		guest_phone: "",
		guest_address: "",
		guest_nationality: "",
		guest_passport_number: "",
		guest_id_number: "",
		special_requests: "",
		booking_source: "direct",
	});

	const [paymentData, setPaymentData] = useState<PaymentData>({
		advance_amount: 0,
		currency: "LKR",
	});

	// Sync payment currency with the first room selection's currency
	useEffect(() => {
		if (roomSelections.length > 0 && roomSelections[0].currency) {
			const newCurrency = roomSelections[0].currency;
			if (newCurrency !== paymentData.currency) {
				setPaymentData((prev) => ({ ...prev, currency: newCurrency }));
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
						paymentData.currency,
						tenant?.id!,
						selectedLocation!,
					);
					total += convertedAmount;
				} catch (error) {
					console.error("Currency conversion error:", error);
					total += selection.total_amount; // Fallback to original amount
				}
			}
		}
		return total;
	}, [roomSelections, paymentData.currency, tenant?.id, selectedLocation]);

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

		setLoading(true);
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
		} finally {
			setLoading(false);
		}
	}, [selectedLocation, tenant?.id, toast]);

	// Fetch rooms when dialog opens
	useEffect(() => {
		if (isOpen) {
			fetchRooms();
			setCurrentStep("guest"); // Reset to first step
		}
	}, [isOpen, fetchRooms]);

	const handleGuestDataChange = (field: string, value: any) => {
		setGuestData((prev) => ({ ...prev, [field]: value }));
	};

	const handlePaymentDataChange = (field: string, value: any) => {
		setPaymentData((prev) => ({ ...prev, [field]: value }));
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

	const validateCurrentStep = (): boolean => {
		switch (currentStep) {
			case "guest": {
				if (!guestData.guest_name.trim()) {
					toast({
						title: "Validation Error",
						description: "Guest name is required",
						variant: "destructive",
					});
					return false;
				}
				return true;
			}

			case "rooms": {
				if (roomSelections.length === 0) {
					toast({
						title: "Validation Error",
						description: "Please select at least one room",
						variant: "destructive",
					});
					return false;
				}
				// Validate that all room selections have room_id
				const invalidSelections = roomSelections.filter(
					(selection) => !selection.room_id,
				);
				if (invalidSelections.length > 0) {
					toast({
						title: "Validation Error",
						description: "Please select a room for all room selections",
						variant: "destructive",
					});
					return false;
				}
				// Validate that all room selections have dates
				const missingDatesSelections = roomSelections.filter(
					(selection) => !selection.check_in_date || !selection.check_out_date,
				);
				if (missingDatesSelections.length > 0) {
					toast({
						title: "Validation Error",
						description:
							"Please select check-in and check-out dates for all room selections",
						variant: "destructive",
					});
					return false;
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
					return false;
				}
				return true;
			}

			case "pricing":
			case "payment":
			case "confirmation":
				return true;

			default:
				return true;
		}
	};

	const handleNext = () => {
		if (!validateCurrentStep()) return;

		const currentIndex = STEPS.findIndex((step) => step.id === currentStep);
		if (currentIndex < STEPS.length - 1) {
			setCurrentStep(STEPS[currentIndex + 1].id);
		}
	};

	const handlePrevious = () => {
		const currentIndex = STEPS.findIndex((step) => step.id === currentStep);
		if (currentIndex > 0) {
			setCurrentStep(STEPS[currentIndex - 1].id);
		}
	};

	const handleSubmit = async () => {
		if (!validateCurrentStep()) return;

		if (!tenant?.id || !profile?.id || !selectedLocation) {
			toast({
				title: "Error",
				description: "Missing required information",
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
					paid_amount: 0, // Will be updated by trigger when payment is recorded
					balance_amount: selection.total_amount, // Full amount unpaid initially
					currency: selection.currency as any,
					status: "tentative" as const,
					arrival_time: selection.arrival_time || null,
					special_requests: guestData.special_requests || null,
					booking_source: guestData.booking_source,
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
			resetForm();
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

	const resetForm = () => {
		setCurrentStep("guest");
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
			booking_source: "direct",
		});
		setPaymentData({
			advance_amount: 0,
			currency: "LKR",
		});
	};

	const renderCurrentStep = () => {
		switch (currentStep) {
			case "guest":
				return (
					<GuestInformationStep
						key={currentStep}
						guestData={guestData}
						onGuestDataChange={handleGuestDataChange}
					/>
				);
			case "rooms":
				return (
					<RoomSelectionStep
						key={currentStep}
						rooms={rooms}
						roomSelections={roomSelections}
						onRoomSelectionsChange={setRoomSelections}
						defaultCurrency={paymentData.currency}
					/>
				);
			case "pricing":
				return (
					<PricingStep
						key={currentStep}
						roomSelections={roomSelections}
						convertedTotal={convertedTotal}
						paymentCurrency={paymentData.currency}
					/>
				);
			case "payment":
				return (
					<PaymentStep
						key={currentStep}
						paymentData={paymentData}
						onPaymentDataChange={handlePaymentDataChange}
						roomSelections={roomSelections}
						convertedTotal={convertedTotal}
					/>
				);
			case "confirmation":
				return (
					<ConfirmationStep
						key={currentStep}
						guestData={guestData}
						roomSelections={roomSelections}
						paymentData={paymentData}
						convertedTotal={convertedTotal}
					/>
				);
			default:
				return null;
		}
	};

	const currentStepIndex = STEPS.findIndex((step) => step.id === currentStep);
	const isFirstStep = currentStepIndex === 0;
	const isLastStep = currentStepIndex === STEPS.length - 1;

	return (
		<Dialog open={isOpen} onOpenChange={onClose}>
			<DialogContent className="max-w-4xl sm:max-w-6xl md:max-w-7xl max-h-[90vh] sm:min-h-[95vh] overflow-hidden flex flex-col">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<Calendar className="h-5 w-5" />
						Create New Reservation
					</DialogTitle>
					<DialogDescription>
						Step {currentStepIndex + 1} of {STEPS.length}:{" "}
						{STEPS[currentStepIndex].title}
					</DialogDescription>
				</DialogHeader>

				{/* Progress indicator */}
				<div className="flex items-center justify-between mb-6">
					{STEPS.map((step, index) => (
						<div key={step.id} className="flex items-center">
							<div
								className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
									index <= currentStepIndex
										? "bg-blue-600 text-white"
										: "bg-gray-200 text-gray-600"
								}`}
							>
								{index + 1}
							</div>
							<span
								className={`ml-2 text-sm hidden sm:inline ${
									index <= currentStepIndex
										? "text-blue-600 font-medium"
										: "text-gray-500"
								}`}
							>
								{step.title}
							</span>
							{index < STEPS.length - 1 && (
								<div
									className={`w-8 h-0.5 mx-2 ${
										index < currentStepIndex ? "bg-blue-600" : "bg-gray-200"
									}`}
								/>
							)}
						</div>
					))}
				</div>

				{/* Step content */}
				<div className="flex-1 overflow-y-auto">
					<Suspense
						fallback={
							<div className="flex items-center justify-center p-8">
								Loading...
							</div>
						}
					>
						{loading ? (
							<div className="flex items-center justify-center p-8">
								Loading rooms...
							</div>
						) : (
							renderCurrentStep()
						)}
					</Suspense>
				</div>

				{/* Navigation buttons */}
				<div className="flex w-full items-center justify-between gap-3 py-4 sm:py-6 border-t mt-6">
					<div className="flex gap-2">
						{!isFirstStep && (
							<Button type="button" variant="outline" onClick={handlePrevious}>
								<ChevronLeft className="h-4 w-4 mr-2" />
								Previous
							</Button>
						)}
					</div>

					<div className="flex gap-2">
						<Button type="button" variant="outline" onClick={onClose}>
							<X className="h-4 w-4 mr-2" />
							Cancel
						</Button>

						{isLastStep ? (
							<Button onClick={handleSubmit} disabled={submitting}>
								<Save className="h-4 w-4 mr-2" />
								{submitting
									? "Creating..."
									: `Create Reservation${roomSelections.length > 1 ? "s" : ""}`}
							</Button>
						) : (
							<Button onClick={handleNext}>
								Next
								<ChevronRight className="h-4 w-4 ml-2" />
							</Button>
						)}
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
