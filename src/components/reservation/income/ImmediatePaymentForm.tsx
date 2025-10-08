import { useState } from "react";
import { useTranslation } from "react-i18next";
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

	const [formData, setFormData] = useState<ImmediatePaymentFormData>({
		amount: Math.max(
			0,
			(reservation.total_amount || 0) - (reservation.paid_amount || 0),
		),
		currency: reservation.currency || "LKR",
		note:
			t("income.addDialog.reservationInfo.reservation") +
			` ${reservation.reservation_number}`,
		account_id: "",
		income_type_id: "",
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
			// Immediate payment: create payment record
			// Database trigger will automatically update account balance and reservation amounts
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

			const { data: paymentData, error: paymentError } = await supabase
				.from("payments")
				.insert({
					reservation_id: reservation.id,
					amount: convertedAmount,
					currency: accountCurrency as "LKR" | "USD" | "EUR" | "GBP",
					payment_method: formData.payment_method,
					payment_type: "reservation",
					payment_number: `PAY-${Date.now()}`,
					account_id: formData.account_id,
					notes:
						formData.note ||
						`Payment for reservation ${reservation.reservation_number}`,
					tenant_id: tenantId,
					created_by: profileId,
				})
				.select()
				.single();

			if (paymentError) throw paymentError;

			// Log currency conversion if currencies differ
			if (paymentData && formData.currency !== accountCurrency) {
				const { error: conversionLogError } = await supabase
					.from("currency_conversion_log")
					.insert({
						transaction_type: "payment",
						transaction_id: paymentData.id,
						from_currency: formData.currency as "LKR" | "USD" | "EUR" | "GBP",
						to_currency: accountCurrency as "LKR" | "USD" | "EUR" | "GBP",
						from_amount: formData.amount,
						to_amount: convertedAmount,
						exchange_rate: convertedAmount / formData.amount,
						rate_source: "system",
						tenant_id: tenantId,
						created_by: profileId,
						notes: `Payment for reservation ${reservation.reservation_number}`,
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
				description: "Payment recorded successfully",
			});

			onSuccess();
		} catch (error) {
			console.error("Error recording payment:", error);
			toast({
				title: "Error",
				description: "Failed to record payment. Please try again.",
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

			<div>
				<Label htmlFor="income_type_id">
					{t("income.addDialog.form.incomeType")}
				</Label>
				<Select
					value={formData.income_type_id}
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
						{incomeTypes.map((type) => (
							<SelectItem key={type.id} value={type.id}>
								{type.type_name}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
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
