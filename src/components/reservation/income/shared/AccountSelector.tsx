import { useTranslation } from "react-i18next";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";

type Account = {
	id: string;
	name: string;
	currency: string;
};

interface AccountSelectorProps {
	accounts: Account[];
	selectedAccountId: string;
	onAccountChange: (accountId: string) => void;
	required?: boolean;
}

export function AccountSelector({
	accounts,
	selectedAccountId,
	onAccountChange,
	required = false,
}: AccountSelectorProps) {
	const { t } = useTranslation();

	return (
		<div>
			<Label htmlFor="account_id">
				{t("income.addDialog.form.accountRequired")}
			</Label>
			<Select
				value={selectedAccountId || ""}
				onValueChange={onAccountChange}
				required={required}
			>
				<SelectTrigger>
					<SelectValue
						placeholder={t("income.addDialog.form.accountPlaceholder")}
					/>
				</SelectTrigger>
				<SelectContent>
					{accounts &&
						accounts.map((account) => (
							<SelectItem key={account.id} value={account.id}>
								{account.name} ({account.currency})
							</SelectItem>
						))}
				</SelectContent>
			</Select>
			<p className="text-sm text-gray-600 mt-1">
				{t("income.addDialog.form.accountDescription")}
			</p>
		</div>
	);
}
