import { format } from "date-fns";
import { Calendar, Minus } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useLocationContext } from "@/context/LocationContext";
import { useToast } from "@/hooks/use-toast";
import { useProfile } from "@/hooks/useProfile";
import { useTenant } from "@/hooks/useTenant";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import { convertCurrency, getCurrencySymbol } from "@/utils/currency";

type Account = Tables<"accounts">;
type ExpenseType = Tables<"expense_types">;

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
		currency: "LKR" as "LKR" | "USD" | "EUR" | "GBP", // Add currency selection
	});

	const selectedAccount = accounts.find((a) => a.id === formData.accountId);
	const currencySymbol = getCurrencySymbol(formData.currency);

	const mainCategories = [...new Set(expenseTypes.map((et) => et.main_type))];
	const subCategories = expenseTypes
		.filter((et) => et.main_type === formData.mainCategory)
		.map((et) => et.sub_type);

	const handleQuickFill = (data: {
		mainCategory: string;
		subCategory: string;
		amount: string;
		accountId: string;
		date: string;
		note: string;
		currency?: string;
	}) => {
		setFormData({
			...formData,
			mainCategory: data.mainCategory,
			subCategory: data.subCategory,
			amount: data.amount,
			accountId: data.accountId,
			date: data.date,
			note: data.note,
			currency:
				(data.currency as "LKR" | "USD" | "EUR" | "GBP") || formData.currency,
		});
	};

	const handleMainCategoryChange = (value: string) => {
		const newSubCategory =
			formData.subCategory && subCategories.includes(formData.subCategory)
				? formData.subCategory
				: "";
		setFormData({
			...formData,
			mainCategory: value,
			subCategory: newSubCategory,
		});
	};

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
			const selectedAccount = accounts.find((acc) => acc.id === formData.accountId);
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
					console.error("Failed to log currency conversion:", conversionLogError);
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
					{/* Form Grid */}
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
						<div className="space-y-2">
							<Label htmlFor="mainCategory">
								{t("expense.form.fields.mainCategory")}
							</Label>
							<Select
								key={`main-${formData.mainCategory}`}
								value={formData.mainCategory}
								onValueChange={handleMainCategoryChange}
							>
								<SelectTrigger>
									<SelectValue
										placeholder={t("expense.form.placeholders.mainCategory")}
									/>
								</SelectTrigger>
								<SelectContent>
									{mainCategories.map((category) => (
										<SelectItem key={category} value={category}>
											{category}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						<div className="space-y-2">
							<Label htmlFor="subCategory">
								{t("expense.form.fields.subCategory")}
							</Label>
							<Select
								key={`sub-${formData.subCategory}`}
								value={formData.subCategory}
								onValueChange={(value) =>
									setFormData({ ...formData, subCategory: value })
								}
								disabled={!formData.mainCategory}
							>
								<SelectTrigger>
									<SelectValue
										placeholder={t("expense.form.placeholders.subCategory")}
									/>
								</SelectTrigger>
								<SelectContent>
									{subCategories.map((subCategory) => (
										<SelectItem key={subCategory} value={subCategory}>
											{subCategory}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						<div className="space-y-2">
							<Label htmlFor="amount">{t("expense.form.fields.amount")}</Label>
							<div className="relative">
								<span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-sm text-muted-foreground">
									{currencySymbol}
								</span>
								<Input
									id="amount"
									type="number"
									placeholder="0.00"
									value={formData.amount}
									onChange={(e) =>
										setFormData({ ...formData, amount: e.target.value })
									}
									className="pl-10"
									required
								/>
							</div>
						</div>

						<div className="space-y-2">
							<Label htmlFor="currency">
								{t("expense.form.fields.currency")}
							</Label>
							<Select
								value={formData.currency}
								onValueChange={(value: "LKR" | "USD" | "EUR" | "GBP") =>
									setFormData({ ...formData, currency: value })
								}
							>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="LKR">LKR - Sri Lankan Rupee</SelectItem>
									<SelectItem value="USD">USD - US Dollar</SelectItem>
									<SelectItem value="EUR">EUR - Euro</SelectItem>
									<SelectItem value="GBP">GBP - British Pound</SelectItem>
								</SelectContent>
							</Select>
						</div>

						<div className="space-y-2">
							<Label htmlFor="accountId">
								{t("expense.form.fields.account")}
							</Label>
							<Select
								key={`account-${formData.accountId}`}
								value={formData.accountId}
								onValueChange={(value) =>
									setFormData({ ...formData, accountId: value })
								}
							>
								<SelectTrigger>
									<SelectValue
										placeholder={t("expense.form.placeholders.account")}
									/>
								</SelectTrigger>
								<SelectContent>
									{accounts
										.filter(
											(account) =>
												account.location_access.length === 0 ||
												account.location_access.includes(
													selectedLocation || "",
												),
										)
										.map((account) => (
											<SelectItem key={account.id} value={account.id}>
												{account.name} ({account.currency})
											</SelectItem>
										))}
								</SelectContent>
							</Select>
						</div>

						<div className="space-y-2">
							<Label htmlFor="date">{t("expense.form.fields.date")}</Label>
							<div className="relative">
								<Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 size-4 text-muted-foreground" />
								<Input
									id="date"
									type="date"
									value={formData.date}
									onChange={(e) =>
										setFormData({ ...formData, date: e.target.value })
									}
									className="pl-10"
									required
								/>
							</div>
						</div>
					</div>

					{/* Note field */}
					<div className="space-y-2">
						<Label htmlFor="note">{t("expense.form.fields.note")}</Label>
						<Textarea
							id="note"
							placeholder={t("expense.form.placeholders.note")}
							value={formData.note}
							onChange={(e) =>
								setFormData({ ...formData, note: e.target.value })
							}
							rows={3}
						/>
					</div>

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
