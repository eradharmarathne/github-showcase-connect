import { AlertTriangle } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { convertCurrency } from "@/utils/currency";
import { AccountSelector } from "./shared/AccountSelector";
import { AmountInput } from "./shared/AmountInput";

type Database = any;
type Reservation = Database["public"]["Tables"]["reservations"]["Row"];
type Account = Database["public"]["Tables"]["accounts"]["Row"];
type IncomeType = {
	id: string;
	type_name: string;
	created_at: string;
	tenant_id: string;
};

interface ImmediatePaymentFormData {
	amount: number;
	currency: string;
	note: string;
	account_id: string;
	income_type_id: string;
	payment_method: string;
}

interface ImmediatePaymentFormProps {
	reservation: Reservation;
	accounts: Account[];
	incomeTypes: IncomeType[];
	onSuccess: () => void;
	onCancel: () => void;
	profileId: string;
	tenantId: string;
	locationId: string;
	baseAmount: number;
	baseCurrency: string;
	displayedReservationAmount: number;
	onDisplayedReservationAmountChange: (amount: number) => void;
}

export function ImmediatePaymentForm({
	reservation,
	accounts,
	incomeTypes,
	onSuccess,
	onCancel,
	profileId,
	tenantId,
	locationId,
	baseAmount,
	baseCurrency,
	displayedReservationAmount,
	onDisplayedReservationAmountChange,
}: ImmediatePaymentFormProps) {
	const { t } = useTranslation();
	const { toast } = useToast();
	const [isSubmitting, setIsSubmitting] = useState(false);

	// Initialize form with account's currency to avoid unnecessary conversions
	const initialAccount = accounts && accounts.length > 0 ? accounts[0] : null;
	const initialCurrency = initialAccount?.currency || "LKR";
	const reservationBalance = Math.max(
		0,
		(reservation.total_amount || 0) - (reservation.paid_amount || 0),
	);

	const [formData, setFormData] = useState<ImmediatePaymentFormData>({
		amount: reservationBalance,
		currency: initialCurrency,
		note:
			t("income.addDialog.reservationInfo.reservation") +
			` ${reservation.reservation_number}`,
		account_id: initialAccount?.id || "",
		income_type_id:
			incomeTypes && incomeTypes.length > 0 ? incomeTypes[0].id : "",
		payment_method: "cash",
	});

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (!formData.account_id) {
			toast({
				title: "Error",
				description: "Please select an account for the payment.",
				variant: "destructive",
			});
			return;
		}

		setIsSubmitting(true);

		try {
			// General income (not added to bill): create income record WITHOUT additional_service_id
			// This marks it as general hotel income that won't reduce the reservation balance
			// The trigger only reduces balance for income with additional_service_id (paid service items)
			const selectedAccount = accounts.find(
				(acc) => acc.id === formData.account_id,
			);
			const accountCurrency = selectedAccount?.currency || "LKR";

			// Convert amount to account currency if needed
			let convertedAmount = formData.amount;
			if (formData.currency !== accountCurrency) {
				convertedAmount = await convertCurrency(
					formData.amount,
					formData.currency,
					accountCurrency,
					tenantId,
					locationId,
				);
			}

			const { data: incomeData, error: incomeError } = await supabase
				.from("income")
				.insert({
					booking_id: reservation.id, // Link to reservation for tracking
					amount: convertedAmount,
					currency: accountCurrency,
					payment_method: formData.payment_method, // Set as paid (not pending)
					account_id: formData.account_id,
					income_type_id: formData.income_type_id || null,
					type: "booking" as const,
					note:
						formData.note ||
						`General income for reservation ${reservation.reservation_number}`,
					date: new Date().toISOString().split("T")[0], // Date only (YYYY-MM-DD)
					is_advance: false,
					additional_service_id: null, // NULL = general income, NOT payment against a service
					tenant_id: tenantId,
					location_id: locationId,
				})
				.select()
				.single();

			if (incomeError) throw incomeError;

			// Log currency conversion if currencies differ
			if (incomeData && formData.currency !== accountCurrency) {
				const { error: conversionLogError } = await supabase
					.from("currency_conversion_log")
					.insert({
						transaction_type: "income",
						transaction_id: incomeData.id,
						from_currency: formData.currency,
						to_currency: accountCurrency,
						from_amount: formData.amount,
						to_amount: convertedAmount,
						exchange_rate: convertedAmount / formData.amount,
						rate_source: "system",
						tenant_id: tenantId,
						created_by: profileId,
						notes: `General income for reservation ${reservation.reservation_number}`,
					});

				if (conversionLogError) {
					console.error(
						"Failed to log currency conversion:",
						conversionLogError,
					);
					// Non-critical error, don't block transaction
				}
			}

			toast({
				title: "Success",
				description: "General income recorded successfully.",
			});

			onSuccess();
		} catch (error) {
			console.error("Error recording income:", error);
			toast({
				title: "Error",
				description: "Failed to record income. Please try again.",
				variant: "destructive",
			});
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleAmountChange = (amount: number) => {
		setFormData((prev) => ({ ...prev, amount }));
	};

	const handleCurrencyChange = (currency: string, convertedAmount: number) => {
		setFormData((prev) => ({ ...prev, currency, amount: convertedAmount }));
	};

	const handleAccountChange = (accountId: string) => {
		setFormData((prev) => ({ ...prev, account_id: accountId }));
	};

	return (
		<form onSubmit={handleSubmit} className="space-y-4">
			<div className="p-4 bg-gray-50 rounded-md">
				<p>
					<strong>{t("income.addDialog.reservationInfo.reservation")}</strong>{" "}
					{reservation.reservation_number}
				</p>
				<p>
					<strong>{t("income.addDialog.reservationInfo.guest")}</strong>{" "}
					{reservation.guest_name}
				</p>
				<p>
					<strong>{t("income.addDialog.reservationInfo.amount")}</strong>{" "}
					{formData.currency} {displayedReservationAmount.toLocaleString()}
				</p>
			</div>

			{incomeTypes ? (
				<div>
					<Label htmlFor="income_type_id">
						{t("income.addDialog.form.incomeType")}
					</Label>
					<Select
						value={formData.income_type_id || ""}
						onValueChange={(value) =>
							setFormData((prev) => ({ ...prev, income_type_id: value }))
						}
					>
						<SelectTrigger>
							<SelectValue
								placeholder={t("income.addDialog.form.incomeTypePlaceholder")}
							/>
						</SelectTrigger>
						<SelectContent>
							{incomeTypes &&
								incomeTypes.map((type) => (
									<SelectItem key={type.id} value={type.id}>
										{type.type_name}
									</SelectItem>
								))}
						</SelectContent>
					</Select>
				</div>
			) : (
				<Alert className="w-full">
					<AlertTriangle className="size-4" />
					<AlertDescription className="text-start">
						Add income types in{" "}
						<a href="/settings" className="text-blue-600">
							settings.
						</a>
					</AlertDescription>
				</Alert>
			)}

			<AmountInput
				amount={formData.amount}
				currency={formData.currency}
				onAmountChange={handleAmountChange}
				onCurrencyChange={handleCurrencyChange}
				tenantId={tenantId}
				locationId={locationId}
				baseAmount={baseAmount}
				baseCurrency={baseCurrency}
				onDisplayedReservationAmountChange={onDisplayedReservationAmountChange}
			/>

			<div>
				<Label htmlFor="note">{t("income.addDialog.form.note")}</Label>
				<Textarea
					id="note"
					value={formData.note}
					onChange={(e) =>
						setFormData((prev) => ({ ...prev, note: e.target.value }))
					}
					placeholder={t("income.addDialog.form.notePlaceholder")}
				/>
			</div>

			<AccountSelector
				accounts={accounts}
				selectedAccountId={formData.account_id}
				onAccountChange={handleAccountChange}
				required
			/>

			<div className="p-4 bg-green-50 rounded-md">
				<p className="text-sm font-medium">Immediate Payment</p>
				<p className="text-xs text-gray-600">
					This will be recorded as an immediate payment
				</p>
			</div>

			<div className="flex gap-2 justify-end">
				<Button
					type="button"
					variant="outline"
					onClick={onCancel}
					disabled={isSubmitting}
				>
					{t("income.addDialog.buttons.cancel")}
				</Button>
				<Button
					type="submit"
					disabled={!formData.amount || !formData.account_id || isSubmitting}
				>
					{t("income.addDialog.buttons.record")}
				</Button>
			</div>
		</form>
	);
}
