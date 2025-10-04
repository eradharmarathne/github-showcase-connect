import {
	ArrowDownLeft,
	ArrowUpRight,
	CreditCard,
	DollarSign,
	Download,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SectionLoader } from "@/components/ui/loading-spinner";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { DetailedBalanceSheetSkeleton } from "@/components/reports";
import { formatCurrency } from "@/utils/currency";

type Account = {
	id: string;
	name: string;
	currency: string;
	initial_balance: number;
};

type AccountBalance = {
	account: Account;
	currentBalance: number;
	totalIncome: number;
	totalExpenses: number;
	totalTransfers: number;
	transactionCount: number;
};

type Transaction = {
	id: string;
	date: string;
	type: "income" | "expense" | "transfer_in" | "transfer_out";
	description: string;
	amount: number;
	account_name: string;
	currency: string;
	note?: string;
};

export default function AccountsReports() {
	const [accounts, setAccounts] = useState<Account[]>([]);
	const [accountBalances, setAccountBalances] = useState<AccountBalance[]>([]);
	const [transactions, setTransactions] = useState<Transaction[]>([]);
	const [loading, setLoading] = useState(true);
	const [selectedAccount, setSelectedAccount] = useState("all");
	const [dateFrom, setDateFrom] = useState("");
	const [dateTo, setDateTo] = useState("");
	const { toast } = useToast();

	useEffect(() => {
		fetchData();
	}, []);

	useEffect(() => {
		if (accounts.length > 0) {
			fetchAccountBalances();
			fetchTransactions();
		}
	}, [accounts, selectedAccount, dateFrom, dateTo]);

	const fetchData = async () => {
		setLoading(true);
		try {
			const { data: accountsData, error } = await supabase
				.from("accounts")
				.select("*")
				.order("name");

			if (error) throw error;
			setAccounts(accountsData || []);
		} catch (error) {
			toast({
				title: "Error",
				description: "Failed to fetch accounts data",
				variant: "destructive",
			});
		} finally {
			setLoading(false);
		}
	};

	const fetchAccountBalances = async () => {
		try {
			const balances: AccountBalance[] = [];
			const usdToLkrRate = parseFloat(
				localStorage.getItem("usdToLkrRate") || "300",
			);

			for (const account of accounts) {
				// Fetch income for this account
				let incomeQuery = supabase
					.from("payments")
					.select("amount")
					.eq("account_id", account.id);

				// Fetch expenses for this account
				let expenseQuery = supabase
					.from("expenses")
					.select("amount")
					.eq("account_id", account.id);

				// Fetch transfers from this account
				let transfersFromQuery = supabase
					.from("account_transfers")
					.select("amount")
					.eq("from_account_id", account.id);

				// Fetch transfers to this account
				let transfersToQuery = supabase
					.from("account_transfers")
					.select("amount, conversion_rate")
					.eq("to_account_id", account.id);

				// Apply date filters if specified
				if (dateFrom) {
					incomeQuery = incomeQuery.gte("date", dateFrom);
					expenseQuery = expenseQuery.gte("date", dateFrom);
					transfersFromQuery = transfersFromQuery.gte("created_at", dateFrom);
					transfersToQuery = transfersToQuery.gte("created_at", dateFrom);
				}
				if (dateTo) {
					incomeQuery = incomeQuery.lte("date", dateTo);
					expenseQuery = expenseQuery.lte("date", dateTo);
					transfersFromQuery = transfersFromQuery.lte("created_at", dateTo);
					transfersToQuery = transfersToQuery.lte("created_at", dateTo);
				}

				const [
					incomeResult,
					expenseResult,
					transfersFromResult,
					transfersToResult,
				] = await Promise.all([
					incomeQuery,
					expenseQuery,
					transfersFromQuery,
					transfersToQuery,
				]);

				const incomeData = incomeResult.data || [];
				const expenseData = expenseResult.data || [];
				const transfersFromData = transfersFromResult.data || [];
				const transfersToData = transfersToResult.data || [];

				const totalIncome = incomeData.reduce(
					(sum, item) => sum + parseFloat(item.amount.toString()),
					0,
				);
				const totalExpenses = expenseData.reduce(
					(sum, item) => sum + parseFloat(item.amount.toString()),
					0,
				);
				const transfersOut = transfersFromData.reduce(
					(sum, item) => sum + parseFloat(item.amount.toString()),
					0,
				);
				const transfersIn = transfersToData.reduce(
					(sum, item) =>
						sum +
						parseFloat(item.amount.toString()) *
							parseFloat(item.conversion_rate.toString()),
					0,
				);

				const currentBalance =
					account.initial_balance +
					totalIncome -
					totalExpenses -
					transfersOut +
					transfersIn;
				const transactionCount =
					incomeData.length +
					expenseData.length +
					transfersFromData.length +
					transfersToData.length;

				balances.push({
					account,
					currentBalance,
					totalIncome,
					totalExpenses,
					totalTransfers: transfersIn - transfersOut,
					transactionCount,
				});
			}

			setAccountBalances(balances);
		} catch (error) {
			console.error("Error fetching account balances:", error);
		}
	};

	const fetchTransactions = async () => {
		try {
			const allTransactions: Transaction[] = [];

			for (const account of accounts) {
				if (selectedAccount !== "all" && account.id !== selectedAccount)
					continue;

				// Fetch income transactions
				let incomeQuery = supabase
					.from("income")
					.select("id, date, amount, type, note")
					.eq("account_id", account.id);

				// Fetch expense transactions
				let expenseQuery = supabase
					.from("expenses")
					.select("id, date, amount, main_type, sub_type, note")
					.eq("account_id", account.id);

				// Apply date filters
				if (dateFrom) {
					incomeQuery = incomeQuery.gte("date", dateFrom);
					expenseQuery = expenseQuery.gte("date", dateFrom);
				}
				if (dateTo) {
					incomeQuery = incomeQuery.lte("date", dateTo);
					expenseQuery = expenseQuery.lte("date", dateTo);
				}

				const [incomeResult, expenseResult] = await Promise.all([
					incomeQuery.order("date", { ascending: false }),
					expenseQuery.order("date", { ascending: false }),
				]);

				// Process income transactions
				(incomeResult.data || []).forEach((item) => {
					allTransactions.push({
						id: item.id,
						date: item.date,
						type: "income",
						description: `${item.type} Income`,
						amount: parseFloat(item.amount.toString()),
						account_name: account.name,
						currency: account.currency,
						note: item.note,
					});
				});

				// Process expense transactions
				(expenseResult.data || []).forEach((item) => {
					allTransactions.push({
						id: item.id,
						date: item.date,
						type: "expense",
						description: `${item.main_type} - ${item.sub_type}`,
						amount: parseFloat(item.amount.toString()),
						account_name: account.name,
						currency: account.currency,
						note: item.note,
					});
				});
			}

			// Sort all transactions by date (newest first)
			allTransactions.sort(
				(a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
			);
			setTransactions(allTransactions);
		} catch (error) {
			console.error("Error fetching transactions:", error);
		}
	};

	const getTransactionIcon = (type: string) => {
		switch (type) {
			case "income":
				return <ArrowUpRight className="size-4 text-green-600" />;
			case "expense":
				return <ArrowDownLeft className="size-4 text-red-600" />;
			case "transfer_in":
				return <ArrowUpRight className="size-4 text-blue-600" />;
			case "transfer_out":
				return <ArrowDownLeft className="size-4 text-orange-600" />;
			default:
				return <DollarSign className="size-4 text-gray-600" />;
		}
	};

	const exportData = () => {
		const csvContent = [
			["Account", "Date", "Type", "Description", "Amount", "Currency", "Note"],
			...transactions.map((txn) => [
				txn.account_name,
				txn.date,
				txn.type,
				txn.description,
				txn.amount,
				txn.currency,
				txn.note || "",
			]),
		]
			.map((row) => row.join(","))
			.join("\n");

		const blob = new Blob([csvContent], { type: "text/csv" });
		const url = window.URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `accounts-report-${new Date().toISOString().split("T")[0]}.csv`;
		a.click();
		window.URL.revokeObjectURL(url);
	};

	if (loading) {
		return <DetailedBalanceSheetSkeleton />;
	}

	return (
		<div className="space-y-6 px-0 sm:px-6">
			<div className="flex justify-between items-center">
				<div>
					<h2 className="text-md sm:text-2xl font-bold text-foreground flex items-center gap-2">
						<CreditCard className="size-6" />
						Accounts Reports
					</h2>
					<p className="text-muted-foreground">
						Account balances, transactions, and financial overview
					</p>
				</div>
				<Button onClick={exportData} variant="outline">
					<Download className="size-4 mr-2" />
					Export CSV
				</Button>
			</div>

			{/* Filters */}
			<Card>
				<CardHeader>
					<CardTitle>Filters</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="grid grid-cols-1 md:grid-cols-4 gap-4">
						<div>
							<Label htmlFor="account_filter">Account</Label>
							<Select
								value={selectedAccount}
								onValueChange={setSelectedAccount}
							>
								<SelectTrigger>
									<SelectValue placeholder="All Accounts" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">All Accounts</SelectItem>
									{accounts.map((account) => (
										<SelectItem key={account.id} value={account.id}>
											{account.name} ({account.currency})
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div>
							<Label htmlFor="date_from">From Date</Label>
							<Input
								id="date_from"
								type="date"
								value={dateFrom}
								onChange={(e) => setDateFrom(e.target.value)}
							/>
						</div>
						<div>
							<Label htmlFor="date_to">To Date</Label>
							<Input
								id="date_to"
								type="date"
								value={dateTo}
								onChange={(e) => setDateTo(e.target.value)}
							/>
						</div>
						<div className="flex items-end">
							<Button onClick={fetchData} className="w-full">
								Refresh Data
							</Button>
						</div>
					</div>
				</CardContent>
			</Card>

			<Tabs defaultValue="balances" className="w-full">
				<TabsList>
					<TabsTrigger value="balances">Account Balances</TabsTrigger>
					<TabsTrigger value="transactions">Transaction History</TabsTrigger>
				</TabsList>

				<TabsContent value="balances">
					<Card>
						<CardHeader>
							<CardTitle>Account Balances Overview</CardTitle>
							<CardDescription>
								Current balances and activity summary for all accounts
							</CardDescription>
						</CardHeader>
						<CardContent>
							{/* Desktop table */}
							<div className="hidden md:block">
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead>Account Name</TableHead>
											<TableHead>Currency</TableHead>
											<TableHead className="text-right">
												Initial Balance
											</TableHead>
											<TableHead className="text-right">Total Income</TableHead>
											<TableHead className="text-right">
												Total Expenses
											</TableHead>
											<TableHead className="text-right">
												Net Transfers
											</TableHead>
											<TableHead className="text-right">
												Current Balance
											</TableHead>
											<TableHead className="text-right">Transactions</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{accountBalances.map((balance) => (
											<TableRow key={balance.account.id}>
												<TableCell className="font-medium">
													{balance.account.name}
												</TableCell>
												<TableCell>
													<Badge variant="outline">
														{balance.account.currency}
													</Badge>
												</TableCell>
												<TableCell className="text-right">
													{formatCurrency(
														balance.account.initial_balance,
														balance.account.currency,
													)}
												</TableCell>
												<TableCell className="text-right text-green-600">
													+
													{formatCurrency(
														balance.totalIncome,
														balance.account.currency,
													)}
												</TableCell>
												<TableCell className="text-right text-red-600">
													-
													{formatCurrency(
														balance.totalExpenses,
														balance.account.currency,
													)}
												</TableCell>
												<TableCell
													className={`text-right ${balance.totalTransfers >= 0 ? "text-green-600" : "text-red-600"}`}
												>
													{balance.totalTransfers >= 0 ? "+" : "-"}
													{formatCurrency(
														Math.abs(balance.totalTransfers),
														balance.account.currency,
													)}
												</TableCell>
												<TableCell className="text-right font-semibold">
													{formatCurrency(
														balance.currentBalance,
														balance.account.currency,
													)}
												</TableCell>
												<TableCell className="text-right">
													<Badge variant="secondary">
														{balance.transactionCount}
													</Badge>
												</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
							</div>

							{/* Mobile cards */}
							<div className="md:hidden space-y-3">
								{accountBalances.map((balance) => (
									<div
										key={balance.account.id}
										className="p-3 rounded-lg border bg-card"
									>
										<div className="flex items-center justify-between">
											<div>
												<p className="font-medium">{balance.account.name}</p>
												<div className="text-xs text-muted-foreground flex items-center gap-2">
													<Badge variant="outline">
														{balance.account.currency}
													</Badge>
													<span>{balance.transactionCount} txns</span>
												</div>
											</div>
											<div className="text-right">
												<p className="text-xs text-muted-foreground">Current</p>
												<p className="text-base font-semibold">
													{formatCurrency(
														balance.currentBalance,
														balance.account.currency,
													)}
												</p>
											</div>
										</div>
										<div className="grid grid-cols-2 gap-3 mt-3 text-xs">
											<div className="p-2 rounded bg-muted/40">
												<p className="text-muted-foreground">Income</p>
												<p className="text-green-600 font-medium">
													+
													{formatCurrency(
														balance.totalIncome,
														balance.account.currency,
													)}
												</p>
											</div>
											<div className="p-2 rounded bg-muted/40">
												<p className="text-muted-foreground">Expenses</p>
												<p className="text-red-600 font-medium">
													-
													{formatCurrency(
														balance.totalExpenses,
														balance.account.currency,
													)}
												</p>
											</div>
										</div>
									</div>
								))}
							</div>
						</CardContent>
					</Card>
				</TabsContent>

				<TabsContent value="transactions">
					<Card>
						<CardHeader>
							<CardTitle>Transaction History</CardTitle>
							<CardDescription>
								Detailed transaction history across all accounts
							</CardDescription>
						</CardHeader>
						<CardContent>
							{/* Desktop table */}
							<div className="hidden md:block">
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead>Date</TableHead>
											<TableHead>Account</TableHead>
											<TableHead>Type</TableHead>
											<TableHead>Description</TableHead>
											<TableHead className="text-right">Amount</TableHead>
											<TableHead>Note</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{transactions.slice(0, 50).map((transaction) => (
											<TableRow key={transaction.id}>
												<TableCell>
													{new Date(transaction.date).toLocaleDateString()}
												</TableCell>
												<TableCell>
													<div className="flex items-center gap-2">
														<Badge variant="outline" className="text-xs">
															{transaction.currency}
														</Badge>
														{transaction.account_name}
													</div>
												</TableCell>
												<TableCell>
													<div className="flex items-center gap-2">
														{getTransactionIcon(transaction.type)}
														<Badge
															variant={
																transaction.type === "income"
																	? "default"
																	: transaction.type === "expense"
																		? "destructive"
																		: "secondary"
															}
														>
															{transaction.type}
														</Badge>
													</div>
												</TableCell>
												<TableCell className="max-w-xs truncate">
													{transaction.description}
												</TableCell>
												<TableCell
													className={`text-right font-medium ${
														transaction.type === "income"
															? "text-green-600"
															: "text-red-600"
													}`}
												>
													{transaction.type === "income" ? "+" : "-"}
													{formatCurrency(
														transaction.amount,
														transaction.currency,
													)}
												</TableCell>
												<TableCell className="max-w-xs truncate text-muted-foreground text-sm">
													{transaction.note || "-"}
												</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
							</div>

							{/* Mobile list */}
							<div className="md:hidden space-y-3">
								{transactions.slice(0, 50).map((transaction) => (
									<div
										key={transaction.id}
										className="p-3 rounded-lg border bg-card"
									>
										<div className="flex items-center justify-between">
											<div className="text-sm">
												<p className="font-medium">
													{transaction.account_name}
												</p>
												<p className="text-xs text-muted-foreground">
													{new Date(transaction.date).toLocaleDateString()}
												</p>
											</div>
											<div
												className={`text-right text-sm font-semibold ${transaction.type === "income" ? "text-green-600" : "text-red-600"}`}
											>
												{transaction.type === "income" ? "+" : "-"}
												{formatCurrency(
													transaction.amount,
													transaction.currency,
												)}
											</div>
										</div>
										<div className="flex items-center justify-between mt-2">
											<div className="flex items-center gap-2 text-xs">
												{getTransactionIcon(transaction.type)}
												<Badge
													variant={
														transaction.type === "income"
															? "default"
															: transaction.type === "expense"
																? "destructive"
																: "secondary"
													}
												>
													{transaction.type}
												</Badge>
											</div>
											<div className="text-xs text-muted-foreground truncate max-w-[60%]">
												{transaction.description}
											</div>
										</div>
									</div>
								))}
								{transactions.length > 50 && (
									<div className="text-center text-muted-foreground text-xs">
										Showing first 50 transactions. Use filters to narrow down
										results.
									</div>
								)}
							</div>
						</CardContent>
					</Card>
				</TabsContent>
			</Tabs>
		</div>
	);
}
