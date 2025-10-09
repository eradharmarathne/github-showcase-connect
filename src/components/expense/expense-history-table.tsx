import { format } from "date-fns";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Tables } from "@/integrations/supabase/types";

type Account = Tables<"accounts">;
type Expense = Tables<"expenses"> & {
	locations?: Tables<"locations">;
	accounts?: Account;
};

interface ExpenseHistoryTableProps {
	expenses: Expense[];
	accounts: Account[];
}

export function ExpenseHistoryTable({
	expenses,
	accounts,
}: ExpenseHistoryTableProps) {
	const { t } = useTranslation();

	return (
		<Card>
			<CardHeader>
				<CardTitle>{t("expense.historyTable.title")}</CardTitle>
			</CardHeader>
			<CardContent>
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>{t("expense.historyTable.headers.date")}</TableHead>
							<TableHead>
								{t("expense.historyTable.headers.category")}
							</TableHead>
							<TableHead>{t("expense.historyTable.headers.amount")}</TableHead>
							<TableHead>{t("expense.historyTable.headers.account")}</TableHead>
							<TableHead>{t("expense.historyTable.headers.note")}</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{expenses.map((expense) => (
							<TableRow key={expense.id}>
								<TableCell>
									{format(new Date(expense.date), "MMM dd, yyyy")}
								</TableCell>
								<TableCell>
									{expense.main_type} - {expense.sub_type}
								</TableCell>
								<TableCell>
									{expense.currency === "LKR" ? "Rs." : "$"}
									{expense.amount.toLocaleString()}
								</TableCell>
								<TableCell>
									{accounts.find((a) => a.id === expense.account_id)?.name}(
									{accounts.find((a) => a.id === expense.account_id)?.currency})
								</TableCell>
								<TableCell>{expense.note || "-"}</TableCell>
							</TableRow>
						))}
						{expenses.length === 0 && (
							<TableRow>
								<TableCell colSpan={5} className="text-center py-8">
									{t("expense.historyTable.noRecords")}
								</TableCell>
							</TableRow>
						)}
					</TableBody>
				</Table>
			</CardContent>
		</Card>
	);
}
