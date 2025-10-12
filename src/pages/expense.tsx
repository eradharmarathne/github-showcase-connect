import { AlertCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { ExpenseForm, ExpenseHistoryTable } from "@/components/expense";
import { ExpenseSkeleton } from "@/components/skeleton/expense-skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useLocationContext } from "@/context/location-context";
import { useExpenseData } from "@/hooks/use-expense-data";
import { usePermissions } from "@/hooks/use-permissions";

export default function Expense() {
	const { t } = useTranslation();
	const { hasAnyPermission } = usePermissions();
	const { selectedLocation } = useLocationContext();

	// Use the custom hook for data fetching
	const {
		locations,
		accounts,
		expenseTypes,
		recentExpenses,
		loading,
		refetch,
	} = useExpenseData();

	if (loading) {
		return <ExpenseSkeleton />;
	}

	if (!hasAnyPermission("access_expenses")) {
		return (
			<div className="container mx-auto p-4 sm:p-6">
				<Alert>
					<AlertCircle className="size-4" />
					<AlertDescription>{t("expense.permissionDenied")}</AlertDescription>
				</Alert>
			</div>
		);
	}

	return (
		<div className="p-6 space-y-6">
			{/* Header with back button */}
			<div className="flex items-center gap-4">
				<h1 className="text-xl md:text-2xl lg:text-3xl font-bold">
					{t("expense.title")}
				</h1>
				{hasAnyPermission("access_reports") && (
					<Button asChild variant="outline" className="ml-auto">
						<Link to="/reports?tab=comprehensive&type=expense">
							{t("expense.viewAllExpenses")}
						</Link>
					</Button>
				)}
			</div>

			{/* Expense Form */}
			<ExpenseForm
				accounts={accounts}
				expenseTypes={expenseTypes}
				onSuccess={refetch}
			/>

			{/* Recent Expenses */}
			<ExpenseHistoryTable expenses={recentExpenses} accounts={accounts} />
		</div>
	);
}
