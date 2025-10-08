import { type RoomSelection } from "@/components/reservation/MultiRoomSelector";

interface PricingStepProps {
	roomSelections: RoomSelection[];
	convertedTotal: number;
	paymentCurrency: string;
}

export function PricingStep({
	roomSelections,
	convertedTotal,
	paymentCurrency,
}: PricingStepProps) {
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

	if (roomSelections.length === 0) {
		return (
			<div className="space-y-4">
				<h3 className="text-base md:text-lg lg:text-xl font-semibold">
					Pricing Summary
				</h3>
				<p className="text-muted-foreground">
					Please select rooms to see pricing information.
				</p>
			</div>
		);
	}

	return (
		<div className="space-y-4">
			<h3 className="text-base md:text-lg lg:text-xl font-semibold">
				Pricing Summary
			</h3>

			{/* Individual room breakdown */}
			<div className="space-y-3">
				{roomSelections.map((selection, index) => (
					<div key={index} className="bg-gray-50 p-4 rounded-md border">
						<div className="flex justify-between items-start mb-2">
							<div>
								<h4 className="font-medium">Room Selection {index + 1}</h4>
								<p className="text-sm text-muted-foreground">
									{selection.nights} night{selection.nights > 1 ? "s" : ""} •{" "}
									{selection.adults} adult{selection.adults > 1 ? "s" : ""}
									{selection.children > 0 &&
										`, ${selection.children} child${selection.children > 1 ? "ren" : ""}`}
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

			{/* Total Summary */}
			<div className="bg-blue-50 p-4 sm:p-6 rounded-md border border-blue-200">
				<div className="flex justify-between items-center">
					<span className="font-semibold">
						Grand Total ({roomSelections.length} room
						{roomSelections.length > 1 ? "s" : ""}):
					</span>
					<span className="text-xl font-bold text-blue-700">
						{getCurrencySymbol(paymentCurrency)}
						{convertedTotal.toFixed(2)}
					</span>
				</div>
			</div>
		</div>
	);
}
