import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { type Currency, formatCurrency } from "@/utils/currency";

export type TransactionWithBalance = {
	id: string;
	date: string;
	type: "income" | "expense" | "transfer_in" | "transfer_out";
	description: string;
	amount: number;
	running_balance: number;
	currency: string;
	note?: string;
};

type TransactionHistoryCardProps = {
	transactions: TransactionWithBalance[];
	baseCurrency: Currency;
};

export function TransactionHistoryCard({
	transactions,
	baseCurrency,
}: TransactionHistoryCardProps) {
	return (
		<Card>
			<CardHeader>
				<CardTitle className="text-base md:text-lg lg:text-xl">
					Transaction History (Sorted by Date)
				</CardTitle>
			</CardHeader>
			<CardContent>
				<div className="space-y-2 max-h-96 overflow-y-auto">
					{transactions.length === 0 ? (
						<p className="text-center text-muted-foreground py-8">
							No transactions found
						</p>
					) : (
						transactions.map((txn) => (
							<div
								key={`${txn.id}-${txn.date}`}
								className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 sm:p-4 border rounded-lg hover:bg-muted/50 transition-colors"
							>
								<div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
									<Badge
										variant={
											txn.type === "income" || txn.type === "transfer_in"
												? "default"
												: "destructive"
										}
									>
										{txn.type === "income" || txn.type === "transfer_in"
											? "INCOME"
											: "EXPENSE"}
									</Badge>
									<div>
										<div className="text-sm text-muted-foreground">
											{new Date(txn.date).toLocaleDateString()}{" "}
											{new Date(txn.date).toLocaleTimeString()}
										</div>
										<p className="font-medium">{txn.description}</p>
										{txn.note && (
											<p className="text-sm text-muted-foreground">
												{txn.note}
											</p>
										)}
									</div>
								</div>
								<div className="text-left sm:text-right">
									<p
										className={`font-semibold ${
											txn.type === "income" || txn.type === "transfer_in"
												? "text-green-600"
												: "text-red-600"
										}`}
									>
										{txn.type === "income" || txn.type === "transfer_in"
											? "+"
											: ""}
										{formatCurrency(txn.amount, baseCurrency)}
									</p>
									<div className="text-sm">
										<span className="text-muted-foreground">Balance</span>
										<div className="text-left sm:text-right font-medium">
											{formatCurrency(txn.running_balance, baseCurrency)}
										</div>
									</div>
								</div>
							</div>
						))
					)}
				</div>
			</CardContent>
		</Card>
	);
}
