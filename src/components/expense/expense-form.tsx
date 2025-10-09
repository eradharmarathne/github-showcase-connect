import { format } from "date-fns";
import { Minus } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLocationContext } from "@/context/location-context";
import { useProfile } from "@/hooks/use-profile";
import { useTenant } from "@/hooks/use-tenant";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import { convertCurrency, getCurrencySymbol } from "@/utils/currency";
import { ExpenseCategories } from "./expense-categories";
import { ExpenseDetails } from "./expense-details";
import { ExpenseReceipt } from "./expense-receipt";

type Account = Tables<"accounts">;
type ExpenseType = Tables<"expense_types">;

interface ReceiptFile {
	file: File;
	preview: string;
	id: string;
}

interface ExpenseFormProps {
	accounts: Account[];
	expenseTypes: ExpenseType[];
	onSuccess: () => void;
}

export function ExpenseForm({
	accounts,
	expenseTypes,
	onSuccess,
}: ExpenseFormProps) {
	const { t } = useTranslation();
	const { toast } = useToast();
	const { profile } = useProfile();
	const { selectedLocation } = useLocationContext();
	const { tenant } = useTenant();
	const [isSubmitting, setIsSubmitting] = useState(false);

	const [formData, setFormData] = useState({
		mainCategory: "",
		subCategory: "",
		amount: "",
		accountId: "",
		date: format(new Date(), "yyyy-MM-dd"),
		note: "",
		currency: "LKR" as "LKR" | "USD" | "EUR" | "GBP",
	});

	const [receipts, setReceipts] = useState<ReceiptFile[]>([]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (isSubmitting) return;
		setIsSubmitting(true);

		if (!selectedLocation) {
			toast({
				title: t("expense.form.messages.error"),
				description: "Please select a location first",
				variant: "destructive",
			});
			setIsSubmitting(false);
			return;
		}

		try {
			const { data: expenseData, error } = await supabase
				.from("expenses")
				.insert([
					{
						main_type: formData.mainCategory,
						sub_type: formData.subCategory,
						amount: parseFloat(formData.amount),
						currency: formData.currency,
						account_id: formData.accountId,
						location_id: selectedLocation,
						date: formData.date,
						note: formData.note || null,
						tenant_id: tenant?.id,
					},
				])
				.select()
				.single();

			if (error) throw error;

			// Log currency conversion if expense involved currency conversion
			const selectedAccount = accounts.find(
				(acc) => acc.id === formData.accountId,
			);
			if (
				expenseData &&
				selectedAccount &&
				formData.currency !== selectedAccount.currency &&
				tenant?.id
			) {
				const convertedAmount = await convertCurrency(
					parseFloat(formData.amount),
					formData.currency,
					selectedAccount.currency,
					tenant.id,
					selectedLocation!,
				);

				const { error: conversionLogError } = await supabase
					.from("currency_conversion_log")
					.insert({
						transaction_type: "expense",
						transaction_id: expenseData.id,
						from_currency: formData.currency,
						to_currency: selectedAccount.currency,
						from_amount: parseFloat(formData.amount),
						to_amount: convertedAmount,
						exchange_rate: convertedAmount / parseFloat(formData.amount),
						rate_source: "system",
						tenant_id: tenant.id,
						created_by: profile?.id,
						notes: `${formData.mainCategory} - ${formData.subCategory}`,
					});

				if (conversionLogError) {
					console.error(
						"Failed to log currency conversion:",
						conversionLogError,
					);
				}
			}

			// Fetch updated account balance (automatically updated by database trigger)
			const { data: updatedAccount } = await supabase
				.from("accounts")
				.select("current_balance, currency, name")
				.eq("id", formData.accountId)
				.single();

			const currentBalance = updatedAccount?.current_balance || 0;
			const currencySymbol = getCurrencySymbol(
				updatedAccount?.currency || formData.currency,
			);

			// Send SMS notification for expense
			try {
				await supabase.functions.invoke("send-sms-notification", {
					body: {
						type: "expense",
						amount: parseFloat(formData.amount),
						currency: formData.currency,
						category: `${formData.mainCategory} - ${formData.subCategory}`,
						account: updatedAccount?.name,
						locationId: selectedLocation,
						date: format(new Date(formData.date), "MMM dd, yyyy"),
						note: formData.note,
						accountBalance: currentBalance,
					},
				});
			} catch (smsError) {
				console.error("SMS notification failed:", smsError);
			}

			toast({
				title: t("expense.form.messages.success"),
				description: `${t("expense.form.messages.successDetails")}
${updatedAccount?.name} - ${currencySymbol}${currentBalance.toLocaleString()}`,
			});

			// Reset form
			setFormData({
				mainCategory: "",
				subCategory: "",
				amount: "",
				accountId: "",
				date: format(new Date(), "yyyy-MM-dd"),
				note: "",
				currency: "LKR",
			});
			setReceipts([]);

			onSuccess();
		} catch (error) {
			console.error("Error adding expense:", error);
			toast({
				title: t("expense.form.messages.error"),
				description: t("expense.form.messages.errorDetails"),
				variant: "destructive",
			});
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<Card>
			<CardHeader>
				<CardTitle>{t("expense.form.title")}</CardTitle>
			</CardHeader>
			<CardContent className="space-y-4">
				<form onSubmit={handleSubmit} className="space-y-4">
					{/* Categories Section */}
					<ExpenseCategories
						expenseTypes={expenseTypes}
						formData={formData}
						onFormDataChange={(data) =>
							setFormData((prev) => ({ ...prev, ...data }))
						}
					/>

					{/* Details Section */}
					<ExpenseDetails
						formData={formData}
						accounts={accounts}
						selectedLocation={selectedLocation}
						onFormDataChange={(data) =>
							setFormData((prev) => ({ ...prev, ...data }))
						}
					/>

					{/* Receipt Section */}
					<ExpenseReceipt receipts={receipts} onReceiptsChange={setReceipts} />

					{/* Submit button */}
					<Button type="submit" disabled={!selectedLocation || isSubmitting}>
						<Minus className="size-4 mr-2" />
						{isSubmitting
							? t("expense.form.buttons.adding")
							: t("expense.form.buttons.add")}
					</Button>
				</form>
			</CardContent>
		</Card>
	);
}
