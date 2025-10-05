import {
	ArrowDownLeft,
	ArrowUpRight,
	ChevronDown,
	ChevronRight,
	CreditCard,
	DollarSign,
	Download,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { CurrencySelector } from "@/components/CurrencySelector";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useTenant } from "@/hooks/useTenant";
import { useLocationContext } from "@/context/LocationContext";
import { supabase } from "@/integrations/supabase/client";
import {
	type Currency,
	convertCurrency,
	formatCurrency,
} from "@/utils/currency";

type AccountDetail = {
	id: string;
	name: string;
	currency: string;
	initial_balance: number;
	current_balance: number;
	total_income: number;
	total_expenses: number;
	total_transfers: number;
	transaction_count: number;
	transactions: TransactionWithBalance[];
};

type TransactionWithBalance = {
	id: string;
	date: string;
	type: "income" | "expense" | "transfer_in" | "transfer_out";
	description: string;
	amount: number;
	running_balance: number;
	currency: string;
	note?: string;
};

export default function DetailedBalanceSheet() {
	const [accounts, setAccounts] = useState<AccountDetail[]>([]);
	const [allTransactions, setAllTransactions] = useState<
		TransactionWithBalance[]
	>([]);
	const [loading, setLoading] = useState(true);
	const [selectedAccount, setSelectedAccount] = useState("all");
	const [expandedAccounts, setExpandedAccounts] = useState<Set<string>>(
		new Set(),
	);
	const [baseCurrency, setBaseCurrency] = useState<Currency>("LKR");
	const [accountSummary, setAccountSummary] = useState({
		totalInitialBalance: 0,
		totalCurrentBalance: 0,
		totalIncome: 0,
		totalExpenses: 0,
	});
	const { toast } = useToast();
	const { tenant } = useTenant();
	const { selectedLocation } = useLocationContext();

	const fetchAccountDetails = useCallback(async () => {
		if (!tenant?.id || !selectedLocation) return;
		
		setLoading(true);
		try {
			// Fetch all accounts for the tenant and location
			const { data: accountsData, error: accountsError } = await supabase
				.from("accounts")
				.select("*")
				.eq("tenant_id", tenant.id)
				.eq("location_id", selectedLocation)
				.order("name");

			if (accountsError) throw accountsError;

			const accountDetails: AccountDetail[] = [];
			const globalTransactions: TransactionWithBalance[] = [];
			const summaryTotals = {
				totalInitialBalance: 0,
				totalCurrentBalance: 0,
				totalIncome: 0,
				totalExpenses: 0,
			};

			for (const account of accountsData || []) {
				// Fetch all transactions for this account
				const [incomeRes, expenseRes, transfersFromRes, transfersToRes] =
					await Promise.all([
						supabase
							.from("income")
							.select("id, date, amount, type, note, currency")
							.eq("account_id", account.id)
							.eq("tenant_id", tenant.id)
							.eq("location_id", selectedLocation)
							.order("date", { ascending: true }),
						supabase
							.from("expenses")
							.select("id, date, amount, main_type, sub_type, note, currency")
							.eq("account_id", account.id)
							.eq("tenant_id", tenant.id)
							.eq("location_id", selectedLocation)
							.order("date", { ascending: true }),
						supabase
							.from("account_transfers")
							.select("id, created_at, amount, note")
							.eq("from_account_id", account.id)
							.eq("tenant_id", tenant.id)
							.order("created_at", { ascending: true }),
						supabase
							.from("account_transfers")
							.select("id, created_at, amount, conversion_rate, note")
							.eq("to_account_id", account.id)
							.eq("tenant_id", tenant.id)
							.order("created_at", { ascending: true }),
					]);

				// Process transactions and calculate running balances
				const transactions: TransactionWithBalance[] = [];
				let runningBalance = account.initial_balance;
				let totalIncome = 0;
				let totalExpenses = 0;
				let totalTransfers = 0;

				// Combine all transactions and sort by date
				const allTransactions: Array<{
					id: string;
					date: string;
					type: "income" | "expense" | "transfer_in" | "transfer_out";
					amount: number;
					description: string;
					currency: string;
					note?: string;
				}> = [];

				// Process income
				for (const income of incomeRes.data || []) {
					const convertedAmount = await convertCurrency(
						parseFloat(income.amount.toString()),
						income.currency as any,
						baseCurrency,
					);
					allTransactions.push({
						id: income.id,
						date: income.date,
						type: "income",
						amount: convertedAmount,
						description: `${income.type} Income`,
						currency: baseCurrency,
						note: income.note,
					});
					totalIncome += convertedAmount;
				}

				// Process expenses
				for (const expense of expenseRes.data || []) {
					const convertedAmount = await convertCurrency(
						parseFloat(expense.amount.toString()),
						expense.currency as any,
						baseCurrency,
					);
					allTransactions.push({
						id: expense.id,
						date: expense.date,
						type: "expense",
						amount: convertedAmount,
						description: `${expense.main_type} - ${expense.sub_type}`,
						currency: baseCurrency,
						note: expense.note,
					});
					totalExpenses += convertedAmount;
				}

				// Process transfers out
				for (const transfer of transfersFromRes.data || []) {
					const amount = parseFloat(transfer.amount.toString());
					allTransactions.push({
						id: transfer.id,
						date: transfer.created_at,
						type: "transfer_out",
						amount: amount,
						description: `Transfer Out${transfer.note ? ` - ${transfer.note}` : ""}`,
						currency: account.currency,
						note: transfer.note,
					});
					totalTransfers -= amount;
				}

				// Process transfers in
				for (const transfer of transfersToRes.data || []) {
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
					totalTransfers += amount;
				}

				// Sort by date and calculate running balances
				allTransactions.sort(
					(a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
				);

				for (const txn of allTransactions) {
					if (txn.type === "income" || txn.type === "transfer_in") {
						runningBalance += txn.amount;
					} else {
						runningBalance -= txn.amount;
					}

					transactions.push({
						...txn,
						running_balance: runningBalance,
					});
				}

				// Convert initial balance and totals to base currency
				const convertedInitialBalance = await convertCurrency(
					account.initial_balance,
					account.currency as any,
					baseCurrency,
				);

				const convertedCurrentBalance = await convertCurrency(
					runningBalance,
					account.currency as any,
					baseCurrency,
				);

				// Add to global transactions for overall summary
				transactions.forEach((txn) => {
					globalTransactions.push({
						...txn,
						description: `${txn.description} (${account.name})`,
					});
				});

				// Update summary totals
				summaryTotals.totalInitialBalance += convertedInitialBalance;
				summaryTotals.totalCurrentBalance += convertedCurrentBalance;
				summaryTotals.totalIncome += totalIncome;
				summaryTotals.totalExpenses += totalExpenses;

				accountDetails.push({
					id: account.id,
					name: account.name,
					currency: account.currency,
					initial_balance: convertedInitialBalance,
					current_balance: convertedCurrentBalance,
					total_income: totalIncome,
					total_expenses: totalExpenses,
					total_transfers: totalTransfers,
					transaction_count: transactions.length,
					transactions: transactions.reverse(), // Show most recent first
				});
			}

			// Sort global transactions by date (most recent first)
			globalTransactions.sort(
				(a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
			);

			setAccounts(accountDetails);
			setAllTransactions(globalTransactions);
			setAccountSummary(summaryTotals);
		} catch (error) {
			console.error("Error fetching account details:", error);
			toast({
				title: "Error",
				description: "Failed to fetch account details",
				variant: "destructive",
			});
		} finally {
			setLoading(false);
		}
	}, [baseCurrency, toast, tenant?.id, selectedLocation]);

	useEffect(() => {
		fetchAccountDetails();
	}, [fetchAccountDetails]);

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
			case "transfer_in":
				return <ArrowUpRight className="size-4 text-green-600" />;
			case "expense":
			case "transfer_out":
				return <ArrowDownLeft className="size-4 text-red-600" />;
			default:
				return <DollarSign className="size-4 text-gray-600" />;
		}
	};

	const exportBalanceSheet = () => {
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
	};

	if (loading) {
		return null;
	}

	return (
		<div className="space-y-6 px-4">
			<div className="flex flex-col sm:flex-row gap-y-2 justify-between items-start sm:items-center">
				<div>
					<h2 className="text-lg sm:text-2xl font-bold text-foreground flex items-center gap-2">
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
						onCurrencyChange={(currency) =>
							setBaseCurrency(currency as Currency)
						}
						label=""
					/>
					<Button onClick={exportBalanceSheet} variant="outline">
						<Download className="size-4 mr-2" />
						Export CSV
					</Button>
				</div>
			</div>

			{/* Account Summary Overview */}
			<Card className="bg-muted/20">
				<CardHeader>
					<CardTitle>Account Summary</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="grid grid-cols-2 md:grid-cols-4 gap-6">
						<div>
							<p className="text-sm text-muted-foreground">Initial Balance:</p>
							<p className="text-xl font-semibold">
								{formatCurrency(
									accountSummary.totalInitialBalance,
									baseCurrency,
								)}
							</p>
						</div>
						<div>
							<p className="text-sm text-muted-foreground">Total Income:</p>
							<p className="text-xl font-semibold text-green-600">
								{formatCurrency(accountSummary.totalIncome, baseCurrency)}
							</p>
						</div>
						<div>
							<p className="text-sm text-muted-foreground">Total Expenses:</p>
							<p className="text-xl font-semibold text-red-600">
								{formatCurrency(accountSummary.totalExpenses, baseCurrency)}
							</p>
						</div>
						<div>
							<p className="text-sm text-muted-foreground">Current Balance:</p>
							<p className="text-xl font-semibold text-primary">
								{formatCurrency(
									accountSummary.totalCurrentBalance,
									baseCurrency,
								)}
							</p>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Transaction History */}
			<Card>
				<CardHeader>
					<CardTitle className="text-md sm:text-lg">
						Transaction History (Sorted by Date)
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="space-y-2 max-h-96 overflow-y-auto">
						{allTransactions.length === 0 ? (
							<p className="text-center text-muted-foreground py-8">
								No transactions found
							</p>
						) : (
							allTransactions.map((txn) => (
								<div
									key={`${txn.id}-${txn.date}`}
									className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
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

			{/* Account Details */}
			<div>
				<h3 className="text-xl font-semibold text-green-600 mb-4">
					Account Details
				</h3>
				<div className="space-y-4">
					{accounts.map((account) => (
						<Card
							key={account.id}
							className="border-l-2 sm:border-l-4 border-l-primary"
						>
							<CardHeader className="pb-3">
								<div className="flex flex-col sm:flex-row items-start sm:items-center justify-between">
									<div>
										<CardTitle className="text-md sm:text-lg font-bold">
											{account.name}
										</CardTitle>
										<CardDescription>
											<Badge variant="outline" className="mr-2">
												{account.currency} Account
											</Badge>
											{account.transaction_count} transactions
										</CardDescription>
									</div>
									<div className="text-right">
										<p className="text-lg sm:text-2xl font-bold">
											{formatCurrency(account.current_balance, baseCurrency)}
										</p>
									</div>
								</div>
							</CardHeader>
						</Card>
					))}
				</div>
			</div>
		</div>
	);
}
