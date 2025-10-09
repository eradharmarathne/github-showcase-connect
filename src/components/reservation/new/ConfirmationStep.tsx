import { Calendar, CheckCircle, CreditCard, User } from "lucide-react";
import { type RoomSelection } from "@/components/reservation/multi-room-selector";
import { type GuestData } from "./GuestInformationStep";
import { type PaymentData } from "./PaymentStep";

interface ConfirmationStepProps {
	guestData: GuestData;
	roomSelections: RoomSelection[];
	paymentData: PaymentData;
	convertedTotal: number;
}

export function ConfirmationStep({
	guestData,
	roomSelections,
	paymentData,
	convertedTotal,
}: ConfirmationStepProps) {
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

	return (
		<div className="space-y-6">
			<h3 className="text-base md:text-lg lg:text-xl font-semibold flex items-center gap-2">
				<CheckCircle className="h-5 w-5" />
				Confirmation
			</h3>

			{/* Guest Information Summary */}
			<div className="bg-gray-50 p-4 rounded-md border">
				<h4 className="font-semibold flex items-center gap-2 mb-3">
					<User className="h-4 w-4" />
					Guest Information
				</h4>
				<div className="space-y-2 text-sm">
					<div className="flex justify-between">
						<span className="font-medium">Name:</span>
						<span>{guestData.guest_name}</span>
					</div>
					{guestData.guest_email && (
						<div className="flex justify-between">
							<span className="font-medium">Email:</span>
							<span>{guestData.guest_email}</span>
						</div>
					)}
					{guestData.guest_phone && (
						<div className="flex justify-between">
							<span className="font-medium">Phone:</span>
							<span>{guestData.guest_phone}</span>
						</div>
					)}
					{guestData.guest_nationality && (
						<div className="flex justify-between">
							<span className="font-medium">Nationality:</span>
							<span>{guestData.guest_nationality}</span>
						</div>
					)}
					<div className="flex justify-between">
						<span className="font-medium">Booking Source:</span>
						<span className="capitalize">
							{guestData.booking_source.replace("_", " ")}
						</span>
					</div>
				</div>
			</div>

			{/* Room Selections Summary */}
			<div className="bg-gray-50 p-4 rounded-md border">
				<h4 className="font-semibold flex items-center gap-2 mb-3">
					<Calendar className="h-4 w-4" />
					Room Selections
				</h4>
				<div className="space-y-3">
					{roomSelections.map((selection, index) => (
						<div key={index} className="bg-white p-3 rounded border">
							<div className="flex justify-between items-start mb-2">
								<div>
									<p className="font-medium">Room Selection {index + 1}</p>
									<p className="text-sm text-muted-foreground">
										{selection.nights} night{selection.nights > 1 ? "s" : ""} •{" "}
										{selection.adults} adult{selection.adults > 1 ? "s" : ""}
										{selection.children > 0 &&
											`, ${selection.children} child${selection.children > 1 ? "ren" : ""}`}
									</p>
									<p className="text-sm text-muted-foreground">
										{new Date(selection.check_in_date).toLocaleDateString()} -{" "}
										{new Date(selection.check_out_date).toLocaleDateString()}
									</p>
								</div>
								<div className="text-right">
									<p className="font-semibold">
										{getCurrencySymbol(selection.currency)}
										{selection.total_amount.toFixed(2)}
									</p>
									<p className="text-sm text-muted-foreground">
										{getCurrencySymbol(selection.currency)}
										{selection.room_rate.toFixed(2)}/night
									</p>
								</div>
							</div>
						</div>
					))}
				</div>
			</div>

			{/* Payment Summary */}
			<div className="bg-gray-50 p-4 rounded-md border">
				<h4 className="font-semibold flex items-center gap-2 mb-3">
					<CreditCard className="h-4 w-4" />
					Payment Summary
				</h4>
				<div className="space-y-2">
					<div className="flex justify-between items-center">
						<span className="font-medium">Total Amount:</span>
						<span className="text-lg font-bold">
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
							<div className="flex justify-between items-center text-sm font-medium">
								<span>Balance Amount:</span>
								<span>
									{getCurrencySymbol(paymentData.currency)}
									{(convertedTotal - paymentData.advance_amount).toFixed(2)}
								</span>
							</div>
						</>
					)}
				</div>
			</div>

			{guestData.special_requests && (
				<div className="bg-yellow-50 p-4 rounded-md border border-yellow-200">
					<h4 className="font-semibold mb-2">Special Requests</h4>
					<p className="text-sm">{guestData.special_requests}</p>
				</div>
			)}

			<div className="bg-blue-50 p-4 rounded-md border border-blue-200">
				<p className="text-sm text-blue-700">
					Please review all information above before confirming your
					reservation. Once confirmed, reservation numbers will be generated
					automatically.
				</p>
			</div>
		</div>
	);
}
