import { useTranslation } from "react-i18next";
import { CurrencySelector } from "@/components/currency-selector";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { convertCurrency } from "@/utils/currency";

interface AmountInputProps {
	amount: number;
	currency: string;
	onAmountChange: (amount: number) => void;
	onCurrencyChange: (currency: string, convertedAmount: number) => void;
	tenantId?: string;
	locationId?: string;
	baseAmount?: number;
	baseCurrency?: string;
	onDisplayedReservationAmountChange?: (amount: number) => void;
}

export function AmountInput({
	amount,
	currency,
	onAmountChange,
	onCurrencyChange,
	tenantId,
	locationId,
	baseAmount,
	baseCurrency,
	onDisplayedReservationAmountChange,
}: AmountInputProps) {
	const { t } = useTranslation();
	const { toast } = useToast();

	const handleCurrencyChange = async (newCurrency: string) => {
		if (currency === newCurrency) return;

		// Validate required context before proceeding
		if (!tenantId || !locationId) {
			console.error("Missing tenant_id or location_id for currency conversion");
			// Just change currency without conversion if context is missing
			onCurrencyChange(newCurrency, amount);
			toast({
				title: "Warning",
				description: "Could not convert amount. Please verify the value.",
				variant: "destructive",
			});
			return;
		}

		try {
			// Convert the current amount from the old currency to the new currency
			const convertedAmount = await convertCurrency(
				amount,
				currency,
				newCurrency,
				tenantId,
				locationId,
			);

			// Also convert the reservation total amount for display if provided
			if (baseAmount && baseCurrency && onDisplayedReservationAmountChange) {
				const convertedReservationAmount = await convertCurrency(
					baseAmount,
					baseCurrency,
					newCurrency,
					tenantId,
					locationId,
				);
				onDisplayedReservationAmountChange(
					Number(convertedReservationAmount.toFixed(2)),
				);
			}

			onCurrencyChange(newCurrency, Number(convertedAmount.toFixed(2)));
		} catch (error) {
			console.error("Error converting currency:", error);
			// If conversion fails, just change the currency without converting amount
			onCurrencyChange(newCurrency, amount);
			toast({
				title: "Warning",
				description: "Could not convert amount. Please verify the value.",
				variant: "destructive",
			});
		}
	};

	return (
		<div className="space-y-4">
			<div>
				<Label htmlFor="amount">{t("income.addDialog.form.amount")}</Label>
				<Input
					id="amount"
					type="number"
					step="0.01"
					value={amount}
					onChange={(e) => onAmountChange(Number.parseFloat(e.target.value))}
					required
				/>
			</div>
			<div>
				<Label htmlFor="currency">Currency</Label>
				<CurrencySelector
					currency={currency}
					onCurrencyChange={handleCurrencyChange}
					label=""
					showGoogleSearchLink={false}
				/>
			</div>
		</div>
	);
}
