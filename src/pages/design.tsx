import { IncomeExpenseChart } from "@/components/design/income-expese-chart";

export default function Design() {
	return (
		<div className="min-h-screen bg-background px-8 py-6">
			<div className="p-4 space-y-4">
				<p>Income vs Expense Chart</p>
				<IncomeExpenseChart />
			</div>
		</div>
	);
}
