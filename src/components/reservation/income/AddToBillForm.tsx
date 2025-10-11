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
import { AmountInput } from "./shared/AmountInput";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";

type Database = any;
type Reservation = Database["public"]["Tables"]["reservations"]["Row"];
type IncomeType = {
	id: string;
	type_name: string;
	created_at: string;
	tenant_id: string;
};

interface AddToBillFormData {
	amount: number;
	currency: string;
	note: string;
	income_type_id: string;
}

interface AddToBillFormProps {
	reservation: Reservation;
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

export function AddToBillForm({
	reservation,
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
}: AddToBillFormProps) {
	const { t } = useTranslation();
	const { toast } = useToast();
	const [isSubmitting, setIsSubmitting] = useState(false);

	const [formData, setFormData] = useState<AddToBillFormData>({
		amount: Math.max(
			0,
			(reservation.total_amount || 0) - (reservation.paid_amount || 0),
		),
		currency: reservation.currency || "LKR",
		note:
			t("income.addDialog.reservationInfo.reservation") +
			` ${reservation.reservation_number}`,
		income_type_id: incomeTypes && incomeTypes.length > 0 ? incomeTypes[0].id : "",
	});

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setIsSubmitting(true);

		try {
			// Add to bill: create income record with pending status
			// Database trigger will automatically update reservation total_amount and balance_amount
			const { error: incomeError } = await supabase.from("income").insert({
				booking_id: reservation.id,
				amount: formData.amount,
				currency: formData.currency as "LKR" | "USD" | "EUR" | "GBP",
				note:
					formData.note ||
					`Additional service for reservation ${reservation.reservation_number}`,
				income_type_id: formData.income_type_id || null,
				tenant_id: tenantId,
				location_id: locationId,
				account_id: null, // No account for pending items
				payment_method: "pending",
				type: "booking",
			});

			if (incomeError) throw incomeError;

			toast({
				title: "Success",
				description: "Item added to guest bill successfully",
			});

			onSuccess();
		} catch (error) {
			console.error("Error adding to bill:", error);
			toast({
				title: "Error",
				description: "Failed to add item to bill. Please try again.",
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
				{!incomeTypes ? (
					<Alert className="w-full">
						<AlertTriangle className="size-4" />
						<AlertDescription className="text-start">
							Add income types in <a href="/settings" className="text-blue-600">settings.</a>
						</AlertDescription>
					</Alert>
				) : (
					<Select
						value={formData.income_type_id || undefined}
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
							{incomeTypes && incomeTypes.map((type) => (
								<SelectItem key={type.id} value={type.id}>
									{type.type_name}
								</SelectItem>
							))}
						</SelectContent>
					</Select>)}
			</div>

			<div className="p-4 bg-blue-50 rounded-md">
				<p className="text-sm font-medium">Add to Guest Bill</p>
				<p className="text-xs text-gray-600">
					This item will be added to the guest's total bill to pay at checkout
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
				<Button type="submit" disabled={!formData.amount || isSubmitting}>
					Add to Bill
				</Button>
			</div>
		</form>
	);
}
