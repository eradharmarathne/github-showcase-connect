import { Edit, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tables } from "@/integrations/supabase/types";

type Account = Tables<"accounts">;

interface AccountCardProps {
	account: Account;
	balance: number;
	onEdit: (account: Account) => void;
	onDelete: (accountId: string) => void;
}

export function AccountCard({
	account,
	balance,
	onEdit,
	onDelete,
}: AccountCardProps) {
	const { t } = useTranslation("common");
	return (
		<Card>
			<CardHeader className="pb-2">
				<div className="flex items-center justify-between">
					<CardTitle className="text-base md:text-lg lg:text-xl">{account.name}</CardTitle>
					<div className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-full">
						{account.currency}
					</div>
				</div>
			</CardHeader>
			<CardContent className="space-y-2">
				<div className="flex justify-between items-center">
					<span className="text-sm text-muted-foreground">
						{t("accounts.card.balance")}
					</span>
					<div className="text-lg font-bold">
						{account.currency === "LKR" ? "Rs." : "$"}
						{balance.toLocaleString()}
					</div>
				</div>
				<div className="flex gap-2 mt-3">
					<Button
						variant="outline"
						size="sm"
						onClick={() => onEdit(account)}
						className="h-8 w-8 p-0"
					>
						<Edit className="h-4 w-4" />
					</Button>
					<Button
						variant="outline"
						size="sm"
						onClick={() => onDelete(account.id)}
						className="h-8 w-8 p-0"
					>
						<Trash2 className="h-4 w-4" />
					</Button>
				</div>
			</CardContent>
		</Card>
	);
}
