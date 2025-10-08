import { Calendar } from "lucide-react";
import { useTranslation } from "react-i18next";
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
import { Tables } from "@/integrations/supabase/types";
import { getCurrencySymbol } from "@/utils/currency";

type Account = Tables<"accounts">;

interface ExpenseFormData {
	mainCategory: string;
	subCategory: string;
	amount: string;
	accountId: string;
	date: string;
	note: string;
	currency: "LKR" | "USD" | "EUR" | "GBP";
}

interface ExpenseDetailsProps {
	formData: ExpenseFormData;
	accounts: Account[];
	selectedLocation: string | null;
	onFormDataChange: (data: Partial<ExpenseFormData>) => void;
}

export function ExpenseDetails({
	formData,
	accounts,
	selectedLocation,
	onFormDataChange,
}: ExpenseDetailsProps) {
	const { t } = useTranslation();
	const currencySymbol = getCurrencySymbol(formData.currency);

	return (
		<div className="space-y-4">
			{/* Form Grid */}
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
				{/* Amount Field */}
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
							onChange={(e) => onFormDataChange({ amount: e.target.value })}
							className="pl-10"
							required
						/>
					</div>
				</div>

				{/* Currency Field */}
				<div className="space-y-2">
					<Label htmlFor="currency">{t("expense.form.fields.currency")}</Label>
					<Select
						value={formData.currency}
						onValueChange={(value: "LKR" | "USD" | "EUR" | "GBP") =>
							onFormDataChange({ currency: value })
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

				{/* Account Field */}
				<div className="space-y-2">
					<Label htmlFor="accountId">{t("expense.form.fields.account")}</Label>
					<Select
						key={`account-${formData.accountId}`}
						value={formData.accountId}
						onValueChange={(value) => onFormDataChange({ accountId: value })}
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
										account.location_access.includes(selectedLocation || ""),
								)
								.map((account) => (
									<SelectItem key={account.id} value={account.id}>
										{account.name} ({account.currency})
									</SelectItem>
								))}
						</SelectContent>
					</Select>
				</div>

				{/* Date Field */}
				<div className="space-y-2">
					<Label htmlFor="date">{t("expense.form.fields.date")}</Label>
					<div className="relative">
						<Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 size-4 text-muted-foreground" />
						<Input
							id="date"
							type="date"
							value={formData.date}
							onChange={(e) => onFormDataChange({ date: e.target.value })}
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
					onChange={(e) => onFormDataChange({ note: e.target.value })}
					rows={3}
				/>
			</div>
		</div>
	);
}
