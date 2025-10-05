import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { type Currency, formatCurrency } from "@/utils/currency";

type AccountSummaryProps = {
	totalInitialBalance: number;
	totalIncome: number;
	totalExpenses: number;
	totalCurrentBalance: number;
	baseCurrency: Currency;
};

export function AccountSummaryCard({
	totalInitialBalance,
	totalIncome,
	totalExpenses,
	totalCurrentBalance,
	baseCurrency,
}: AccountSummaryProps) {
	return (
		<Card className="bg-muted/20">
			<CardHeader>
				<CardTitle>Account Summary</CardTitle>
			</CardHeader>
			<CardContent>
				<div className="grid grid-cols-2 md:grid-cols-4 gap-6">
					<div>
						<p className="text-sm text-muted-foreground">Initial Balance:</p>
						<p className="text-xl font-semibold">
							{formatCurrency(totalInitialBalance, baseCurrency)}
						</p>
					</div>
					<div>
						<p className="text-sm text-muted-foreground">Total Income:</p>
						<p className="text-xl font-semibold text-green-600">
							{formatCurrency(totalIncome, baseCurrency)}
						</p>
					</div>
					<div>
						<p className="text-sm text-muted-foreground">Total Expenses:</p>
						<p className="text-xl font-semibold text-red-600">
							{formatCurrency(totalExpenses, baseCurrency)}
						</p>
					</div>
					<div>
						<p className="text-sm text-muted-foreground">Current Balance:</p>
						<p className="text-xl font-semibold text-primary">
							{formatCurrency(totalCurrentBalance, baseCurrency)}
						</p>
					</div>
				</div>
			</CardContent>
		</Card>
	);
}
