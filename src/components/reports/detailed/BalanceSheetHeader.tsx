import { CreditCard, Download } from "lucide-react";
import { CurrencySelector } from "@/components/common/currency-selector";
import { Button } from "@/components/ui/button";
import { type Currency } from "@/utils/currency";
import { type AccountDetail } from "./AccountDetailsList";

type BalanceSheetHeaderProps = {
	baseCurrency: Currency;
	onCurrencyChange: (currency: Currency) => void;
	onExport: () => void;
};

export function BalanceSheetHeader({
	baseCurrency,
	onCurrencyChange,
	onExport,
}: BalanceSheetHeaderProps) {
	return (
		<div className="flex flex-col sm:flex-row gap-y-2 justify-between items-start sm:items-center">
			<div>
				<h2 className="text-lg md:text-xl lg:text-2xl font-bold text-foreground flex items-center gap-2">
					<CreditCard className="size-6" />
					Detailed Balance Sheet
				</h2>
				<p className="text-muted-foreground">
					Account balances with transaction history and running balances
				</p>
			</div>
			<div className="flex gap-2">
				<CurrencySelector
					currency={baseCurrency}
					onCurrencyChange={onCurrencyChange}
					label=""
				/>
				<Button onClick={onExport} variant="outline">
					<Download className="size-4 mr-2" />
					Export CSV
				</Button>
			</div>
		</div>
	);
}

export function exportBalanceSheetToCSV(accounts: AccountDetail[]) {
	const csvContent = [
		[
			"Account",
			"Currency",
			"Initial Balance",
			"Current Balance",
			"Total Income",
			"Total Expenses",
			"Net Transfers",
			"Transactions",
		],
		...accounts.map((acc) => [
			acc.name,
			acc.currency,
			acc.initial_balance,
			acc.current_balance,
			acc.total_income,
			acc.total_expenses,
			acc.total_transfers,
			acc.transaction_count,
		]),
	]
		.map((row) => row.join(","))
		.join("\n");

	const blob = new Blob([csvContent], { type: "text/csv" });
	const url = window.URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	a.download = `balance-sheet-${new Date().toISOString().split("T")[0]}.csv`;
	a.click();
	window.URL.revokeObjectURL(url);
}
