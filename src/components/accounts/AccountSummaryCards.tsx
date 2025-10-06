import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tables } from "@/integrations/supabase/types";

type Account = Tables<"accounts">;
type AccountWithBalance = Account & { currentBalance: number };

interface AccountSummaryCardsProps {
	accounts: AccountWithBalance[];
}

export function AccountSummaryCards({ accounts }: AccountSummaryCardsProps) {
	const { t } = useTranslation("common");
	// Use the calculated current balance for totals
	const totalLKRBalance = accounts
		.filter((account) => account.currency === "LKR")
		.reduce((sum, account) => sum + account.currentBalance, 0);

	const totalUSDBalance = accounts
		.filter((account) => account.currency === "USD")
		.reduce((sum, account) => sum + account.currentBalance, 0);

	return (
		<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
			<Card>
				<CardHeader className="pb-2">
					<CardTitle className="text-sm font-medium text-muted-foreground">
						{t("accounts.summary.totalAccounts")}
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="text-2xl font-bold">{accounts.length}</div>
				</CardContent>
			</Card>
			<Card>
				<CardHeader className="pb-2">
					<CardTitle className="text-sm font-medium text-muted-foreground">
						{t("accounts.summary.totalBalanceLKR")}
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="text-2xl font-bold">
						Rs. {totalLKRBalance.toLocaleString()}
					</div>
				</CardContent>
			</Card>
			<Card>
				<CardHeader className="pb-2">
					<CardTitle className="text-sm font-medium text-muted-foreground">
						{t("accounts.summary.totalBalanceUSD")}
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="text-2xl font-bold">
						$ {totalUSDBalance.toLocaleString()}
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
