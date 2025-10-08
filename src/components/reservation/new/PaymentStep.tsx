import { type RoomSelection } from "@/components/reservation/MultiRoomSelector";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useFormFieldPreferences } from "@/hooks/useFormFieldPreferences";

interface PaymentData {
	advance_amount: number;
	currency: string;
}

interface PaymentStepProps {
	paymentData: PaymentData;
	onPaymentDataChange: (field: string, value: any) => void;
	roomSelections: RoomSelection[];
	convertedTotal: number;
}

export function PaymentStep({
	paymentData,
	onPaymentDataChange,
	roomSelections,
	convertedTotal,
}: PaymentStepProps) {
	const { preferences: fieldPreferences } = useFormFieldPreferences();

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
		<div className="space-y-4">
			<h3 className="text-base md:text-lg lg:text-xl font-semibold">
				Payment Information
			</h3>
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
								onPaymentDataChange("advance_amount", Number(e.target.value))
							}
							placeholder="Enter advance amount"
						/>
					</div>
				)}
			</div>

			{/* Total Summary */}
			{roomSelections.length > 0 && (
				<div className="bg-blue-50 p-4 sm:p-6 rounded-md border border-blue-200">
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
										{(convertedTotal - paymentData.advance_amount).toFixed(2)}
									</span>
								</div>
							</>
						)}
					</div>
				</div>
			)}
		</div>
	);
}

export type { PaymentData };
