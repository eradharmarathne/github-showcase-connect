import {
	ArrowDownLeft,
	ArrowUpRight,
	Building2,
	ChevronDown,
	ChevronRight,
	DollarSign,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useLocationContext } from "@/context/location-context";
import { useTenant } from "@/hooks/use-tenant";
import { supabase } from "@/integrations/supabase/client";
import { convertCurrency, formatCurrency } from "@/utils/currency";

type TransactionDetail = {
	id: string;
	date: string;
	type: "expense" | "payment" | "transfer_in" | "transfer_out";
	description: string;
	amount: number;
	running_balance: number;
	currency: string;
	note?: string;
};

type AccountBalance = {
	id: string;
	name: string;
	currency: string;
	initial_balance: number;
	current_balance: number;
	total_expenses: number;
	total_payments: number;
	transaction_count: number;
	transactions: TransactionDetail[];
};

interface AccountDetailsProps {
	baseCurrency: string;
	dateFrom?: string;
	dateTo?: string;
}

export function AccountDetails({
	baseCurrency,
	dateFrom,
	dateTo,
}: AccountDetailsProps) {
	const { t } = useTranslation();
	const { tenant } = useTenant();
	const { selectedLocation } = useLocationContext();
	const [accounts, setAccounts] = useState<AccountBalance[]>([]);
	const [loading, setLoading] = useState(true);
	const [expandedAccounts, setExpandedAccounts] = useState<Set<string>>(
		new Set(),
	);

	const calculateAccountBalance = useCallback(
		async (account: any): Promise<AccountBalance> => {
			if (!tenant?.id) {
				throw new Error("Tenant not found");
			}

			try {
				let expenseQuery = supabase
					.from("expenses")
					.select("id, date, amount, main_type, sub_type, note, currency")
					.eq("account_id", account.id);

				let paymentsQuery = supabase
					.from("payments")
					.select(
						"id, created_at, amount, payment_type, notes, currency, reservations!inner(guest_name, reservation_number, tenant_id)",
					)
					.eq("account_id", account.id)
					.eq("reservations.tenant_id", tenant.id);

				let transfersFromQuery = supabase
					.from("account_transfers")
					.select(
						"id, created_at, amount, note, accounts!to_account_id(tenant_id)",
					)
					.eq("from_account_id", account.id)
					.eq("accounts.tenant_id", tenant.id);
				let transfersToQuery = supabase
					.from("account_transfers")
					.select(
						"id, created_at, amount, conversion_rate, note, accounts!from_account_id(tenant_id)",
					)
					.eq("to_account_id", account.id)
					.eq("accounts.tenant_id", tenant.id); // Apply location filters
				if (selectedLocation) {
					expenseQuery = expenseQuery.eq("location_id", selectedLocation);
					paymentsQuery = paymentsQuery.eq(
						"reservations.location_id",
						selectedLocation,
					);
				}

				// Apply date filters
				if (dateFrom) {
					expenseQuery = expenseQuery.gte("date", dateFrom);
					paymentsQuery = paymentsQuery.gte("created_at", dateFrom);
					transfersFromQuery = transfersFromQuery.gte("created_at", dateFrom);
					transfersToQuery = transfersToQuery.gte("created_at", dateFrom);
				}
				if (dateTo) {
					expenseQuery = expenseQuery.lte("date", dateTo);
					paymentsQuery = paymentsQuery.lte("created_at", dateTo);
					transfersFromQuery = transfersFromQuery.lte("created_at", dateTo);
					transfersToQuery = transfersToQuery.lte("created_at", dateTo);
				}

				// Execute all queries
				const [
					expenseResult,
					paymentsResult,
					transfersFromResult,
					transfersToResult,
				] = await Promise.all([
					expenseQuery.order("date", { ascending: true }),
					paymentsQuery.order("created_at", { ascending: true }),
					transfersFromQuery.order("created_at", { ascending: true }),
					transfersToQuery.order("created_at", { ascending: true }),
				]);

				// Process transactions and calculate balances
				const transactions: TransactionDetail[] = [];
				let runningBalance = account.initial_balance;
				let totalExpenses = 0;
				let totalPayments = 0;

				// Combine all transactions
				const allTransactions: Array<{
					id: string;
					date: string;
					type: TransactionDetail["type"];
					amount: number;
					description: string;
					currency: string;
					note?: string;
				}> = [];

				// Add expense transactions
				for (const expense of expenseResult.data || []) {
					allTransactions.push({
						id: expense.id,
						date: expense.date,
						type: "expense",
						amount: parseFloat(expense.amount.toString()),
						description: `${expense.main_type} - ${expense.sub_type}`,
						currency: expense.currency,
						note: expense.note,
					});
					totalExpenses += parseFloat(expense.amount.toString());
				}

				// Add payment transactions
				for (const payment of paymentsResult.data || []) {
					allTransactions.push({
						id: payment.id,
						date: payment.created_at,
						type: "payment",
						amount: parseFloat(payment.amount.toString()),
						description: `${payment.payment_type} - ${
							(payment as any).reservations?.guest_name || "Unknown"
						} (${(payment as any).reservations?.reservation_number || "N/A"})`,
						currency: payment.currency,
						note: payment.notes,
					});
					totalPayments += parseFloat(payment.amount.toString());
				}

				// Add transfer transactions
				for (const transfer of transfersFromResult.data || []) {
					allTransactions.push({
						id: transfer.id,
						date: transfer.created_at,
						type: "transfer_out",
						amount: parseFloat(transfer.amount.toString()),
						description: `Transfer Out${transfer.note ? ` - ${transfer.note}` : ""}`,
						currency: account.currency,
						note: transfer.note,
					});
				}

				for (const transfer of transfersToResult.data || []) {
					const amount =
						parseFloat(transfer.amount.toString()) *
						parseFloat(transfer.conversion_rate.toString());
					allTransactions.push({
						id: transfer.id,
						date: transfer.created_at,
						type: "transfer_in",
						amount: amount,
						description: `Transfer In${transfer.note ? ` - ${transfer.note}` : ""}`,
						currency: account.currency,
						note: transfer.note,
					});
				}

				// Sort by date and calculate running balances
				allTransactions.sort(
					(a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
				);

				for (const txn of allTransactions) {
					if (txn.type === "payment" || txn.type === "transfer_in") {
						runningBalance += txn.amount;
					} else {
						runningBalance -= txn.amount;
					}

					transactions.push({
						...txn,
						running_balance: runningBalance,
					});
				}

				return {
					id: account.id,
					name: account.name,
					currency: account.currency,
					initial_balance: account.initial_balance,
					current_balance: runningBalance,
					total_expenses: totalExpenses,
					total_payments: totalPayments,
					transaction_count: transactions.length,
					transactions: transactions.reverse(), // Show most recent first
				};
			} catch (error) {
				console.error(
					`Error calculating balance for account ${account.name}:`,
					error,
				);
				return {
					id: account.id,
					name: account.name,
					currency: account.currency,
					initial_balance: account.initial_balance,
					current_balance: account.current_balance,
					total_expenses: 0,
					total_payments: 0,
					transaction_count: 0,
					transactions: [],
				};
			}
		},
		[tenant?.id, selectedLocation, dateFrom, dateTo],
	);

	const fetchAccountsData = useCallback(async () => {
		if (!tenant?.id) return;

		setLoading(true);
		try {
			// Fetch all accounts
			const { data: accountsData, error: accountsError } = await supabase
				.from("accounts")
				.select("*")
				.eq("tenant_id", tenant.id)
				.order("name");

			if (accountsError) throw accountsError;

			const accountBalances: AccountBalance[] = [];
			for (const account of accountsData || []) {
				const balance = await calculateAccountBalance(account);
				accountBalances.push(balance);
			}

			setAccounts(accountBalances);
		} catch (error) {
			console.error("Error fetching accounts data:", error);
		} finally {
			setLoading(false);
		}
	}, [tenant?.id, calculateAccountBalance]);

	const toggleAccountExpansion = (accountId: string) => {
		const newExpanded = new Set(expandedAccounts);
		if (newExpanded.has(accountId)) {
			newExpanded.delete(accountId);
		} else {
			newExpanded.add(accountId);
		}
		setExpandedAccounts(newExpanded);
	};

	const getTransactionIcon = (type: string) => {
		switch (type) {
			case "income":
			case "payment":
			case "transfer_in":
				return <ArrowUpRight className="size-4 text-green-600" />;
			case "expense":
			case "transfer_out":
				return <ArrowDownLeft className="size-4 text-red-600" />;
			default:
				return <DollarSign className="size-4 text-gray-600" />;
		}
	};

	useEffect(() => {
		fetchAccountsData();
	}, [fetchAccountsData]);

	if (loading) {
		return (
			<Card>
				<CardHeader>
					<div className="animate-pulse">
						<div className="h-6 bg-gray-200 rounded w-1/3 mb-2"></div>
						<div className="h-4 bg-gray-200 rounded w-1/2"></div>
					</div>
				</CardHeader>
				<CardContent>
					<div className="space-y-4">
						{[...Array(3)].map((_, i) => (
							<div key={i} className="animate-pulse">
								<div className="h-20 bg-gray-200 rounded"></div>
							</div>
						))}
					</div>
				</CardContent>
			</Card>
		);
	}

	return (
		<Card>
			<CardHeader className="px-2 sm:px-4">
				<CardTitle className="flex items-center gap-2 text-base sm:text-lg md:text-xl">
					<Building2 className="size-6" />
					{t("reports.comprehensive.accounts.title")}
				</CardTitle>
				<CardDescription>
					{t("reports.comprehensive.accounts.subtitle")}
				</CardDescription>
			</CardHeader>
			<CardContent className="px-2 sm:px-4 md:px-6">
				<div className="space-y-4">
					{accounts.map((account) => (
						<Card
							key={account.id}
							className="px-0 border-l-2 sm:border-l-4 border-l-primary"
						>
							<Collapsible
								open={expandedAccounts.has(account.id)}
								onOpenChange={() => toggleAccountExpansion(account.id)}
							>
								<CollapsibleTrigger asChild>
									<CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors py-4">
										<div className="flex flex-col sm:flex-row items-start sm:items-center justify-between">
											<div className="flex items-start sm:items-center gap-3">
												<div className="flex flex-col">
													<CardTitle className="text-base md:text-lg lg:text-xl">
														{account.name}
													</CardTitle>
													<div className="flex items-center gap-2 text-sm text-muted-foreground">
														<Badge variant="outline">{account.currency}</Badge>
														<span>
															{account.transaction_count}{" "}
															{t("reports.comprehensive.accounts.transactions")}
														</span>
													</div>
												</div>
												{expandedAccounts.has(account.id) ? (
													<ChevronDown className="size-4" />
												) : (
													<ChevronRight className="size-4" />
												)}
											</div>
											<div className="text-left sm:text-right flex flex-col items-start sm:items-end">
												<p className="text-lg sm:text-2xl font-bold">
													{formatCurrency(
														account.current_balance,
														account.currency as any,
													)}
												</p>
												<div className="flex pt-4 sm:pt-0 flex-col sm:flex-row gap-2 sm:gap-4 text-sm text-muted-foreground">
													<span className="text-green-600">
														{t("reports.comprehensive.accounts.income")}:{" "}
														{formatCurrency(
															account.total_payments,
															account.currency as any,
														)}
													</span>
													<span className="text-red-600">
														{t("reports.comprehensive.accounts.expenses")}:{" "}
														{formatCurrency(
															account.total_expenses,
															account.currency as any,
														)}
													</span>
												</div>
											</div>
										</div>
									</CardHeader>
								</CollapsibleTrigger>
								<CollapsibleContent>
									<CardContent className="pt-0">
										<div className="space-y-2 max-h-96 overflow-y-auto">
											{account.transactions.length === 0 ? (
												<p className="text-start sm:text-center text-muted-foreground py-8">
													{t("reports.comprehensive.accounts.noTransactions")}
												</p>
											) : (
												account.transactions.map((txn, index) => (
													<div
														key={`${txn.id}-${index}`}
														className="flex items-center justify-between p-1 sm:p-3 border rounded-lg hover:bg-muted/50 transition-colors"
													>
														<div className="flex items-center gap-3">
															{getTransactionIcon(txn.type)}
															<div>
																<div className="font-medium">
																	{txn.description}
																</div>
																<div className="text-sm text-muted-foreground">
																	{new Date(txn.date).toLocaleDateString()}
																	{txn.note && <span> • {txn.note}</span>}
																</div>
															</div>
														</div>
														<div className="text-left sm:text-right">
															<p
																className={`font-semibold ${
																	txn.type === "payment" ||
																	txn.type === "transfer_in"
																		? "text-green-600"
																		: "text-red-600"
																}`}
															>
																{txn.type === "payment" ||
																txn.type === "transfer_in"
																	? "+"
																	: "-"}
																{formatCurrency(
																	txn.amount,
																	txn.currency as any,
																)}
															</p>
															<div className="text-sm text-muted-foreground">
																{t("reports.comprehensive.accounts.balance")}:{" "}
																{formatCurrency(
																	txn.running_balance,
																	txn.currency as any,
																)}
															</div>
														</div>
													</div>
												))
											)}
										</div>
									</CardContent>
								</CollapsibleContent>
							</Collapsible>
						</Card>
					))}
				</div>
			</CardContent>
		</Card>
	);
}
