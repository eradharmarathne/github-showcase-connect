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
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import { getCurrencySymbol } from "@/utils/currency";

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
	const { selectedLocation } = useLocationContext();
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
			currency: (data.currency as "LKR" | "USD" | "EUR" | "GBP") || formData.currency,
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
			const { error } = await supabase.from("expenses").insert([
				{
					main_type: formData.mainCategory,
					sub_type: formData.subCategory,
					amount: parseFloat(formData.amount),
					currency: formData.currency,
					account_id: formData.accountId,
					location_id: selectedLocation,
					date: formData.date,
					note: formData.note || null,
				},
			]);

			if (error) throw error;

			// Calculate new account balance
			const selectedAccount = accounts.find(
				(acc) => acc.id === formData.accountId,
			);
			if (selectedAccount) {
				// Fetch current account transactions to calculate balance
				const [
					incomesRes,
					expensesRes,
					outgoingTransfersRes,
					incomingTransfersRes,
				] = await Promise.all([
					supabase
						.from("income")
						.select("amount")
						.eq("account_id", formData.accountId),
					supabase
						.from("expenses")
						.select("amount")
						.eq("account_id", formData.accountId),
					supabase
						.from("account_transfers")
						.select("amount")
						.eq("from_account_id", formData.accountId),
					supabase
						.from("account_transfers")
						.select("amount, conversion_rate")
						.eq("to_account_id", formData.accountId),
				]);

				let currentBalance = selectedAccount.initial_balance;

				// Add all income
				const totalIncome = (incomesRes.data || []).reduce(
					(sum, item) => sum + parseFloat(item.amount.toString()),
					0,
				);
				currentBalance += totalIncome;

				// Subtract all expenses (including the new one we just added)
				const totalExpenses = (expensesRes.data || []).reduce(
					(sum, item) => sum + parseFloat(item.amount.toString()),
					0,
				);
				currentBalance -= totalExpenses;

				// Subtract outgoing transfers
				const totalOutgoingTransfers = (outgoingTransfersRes.data || []).reduce(
					(sum, item) => sum + parseFloat(item.amount.toString()),
					0,
				);
				currentBalance -= totalOutgoingTransfers;

				// Add incoming transfers (with conversion rate)
				const totalIncomingTransfers = (incomingTransfersRes.data || []).reduce(
					(sum, item) =>
						sum + parseFloat(item.amount.toString()) * item.conversion_rate,
					0,
				);
				currentBalance += totalIncomingTransfers;

				const currencySymbol = getCurrencySymbol(selectedAccount.currency);

				// Send SMS notification for expense
				try {
					await supabase.functions.invoke("send-sms-notification", {
						body: {
							type: "expense",
							amount: parseFloat(formData.amount),
							currency: formData.currency,
							category: `${formData.mainCategory} - ${formData.subCategory}`,
							account: selectedAccount.name,
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
${selectedAccount.name} - ${currencySymbol}${currentBalance.toLocaleString()}`,
				});
			} else {
				toast({
					title: t("expense.form.messages.success"),
					description: t("expense.form.messages.successGeneral"),
				});
			}

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
							<Label htmlFor="currency">{t("expense.form.fields.currency")}</Label>
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
