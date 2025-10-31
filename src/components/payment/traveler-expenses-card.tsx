import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface IncomeRecord {
	id: string;
	type: string;
	amount: number;
	currency: string;
	note?: string;
	payment_method: string;
	created_at: string;
	income_types?: {
		type_name: string;
	};
	accounts?: {
		name: string;
	};
}

interface TravelerExpensesCardProps {
	incomeRecords: IncomeRecord[];
	currency: string;
}

export function TravelerExpensesCard({
	incomeRecords,
	currency,
}: TravelerExpensesCardProps) {
	if (incomeRecords.length === 0) return null;

	const totalExpenses = incomeRecords.reduce(
		(sum, inc) => sum + Number(inc.amount),
		0,
	);
	const paidExpenses = incomeRecords
		.filter((inc) => inc.payment_method !== "pending")
		.reduce((sum, inc) => sum + Number(inc.amount), 0);
	const pendingExpenses = incomeRecords
		.filter((inc) => inc.payment_method === "pending")
		.reduce((sum, inc) => sum + Number(inc.amount), 0);

	return (
		<Card>
			<CardHeader>
				<CardTitle>Traveler Expenses</CardTitle>
			</CardHeader>
			<CardContent className="space-y-4">
				<div className="space-y-2">
					<div className="flex justify-between font-semibold border-b pb-2">
						<span>Expense Type</span>
						<span>Amount</span>
						<span>Status</span>
					</div>
					{incomeRecords.map((income) => (
						<div
							key={income.id}
							className="flex justify-between items-center py-2 border-b"
						>
							<div className="flex-1">
								<p className="font-medium">
									{income.income_types?.type_name || income.type}
								</p>
								{income.note && (
									<p className="text-sm text-muted-foreground">{income.note}</p>
								)}
								<p className="text-xs text-muted-foreground">
									{format(new Date(income.created_at), "MMM dd, yyyy")}
								</p>
							</div>
							<div className="flex-1 text-right">
								<p className="font-semibold">
									{income.currency} {income.amount.toLocaleString()}
								</p>
								{income.accounts && (
									<p className="text-xs text-muted-foreground">
										via {income.accounts.name}
									</p>
								)}
							</div>
							<div className="flex-1 text-right">
								{income.payment_method === "pending" ? (
									<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
										Pending
									</span>
								) : (
									<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
										Paid
									</span>
								)}
							</div>
						</div>
					))}
				</div>
				<div className="pt-4 border-t space-y-2">
					<div className="flex justify-between text-sm">
						<span className="text-muted-foreground">Total Expenses:</span>
						<span className="font-semibold">
							{currency} {totalExpenses.toLocaleString()}
						</span>
					</div>
					<div className="flex justify-between text-sm">
						<span className="text-muted-foreground">Paid Expenses:</span>
						<span className="font-semibold text-green-600">
							{currency} {paidExpenses.toLocaleString()}
						</span>
					</div>
					<div className="flex justify-between text-sm">
						<span className="text-muted-foreground">Pending Expenses:</span>
						<span className="font-semibold text-yellow-600">
							{currency} {pendingExpenses.toLocaleString()}
						</span>
					</div>
				</div>
			</CardContent>
		</Card>
	);
}
