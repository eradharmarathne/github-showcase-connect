import {
	ArrowDownLeft,
	ArrowUpRight,
	CreditCard,
	DollarSign,
	Download,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { DetailedBalanceSheetSkeleton } from "@/components/reports";
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
import { Tables } from "@/integrations/supabase/types";
import { formatCurrency } from "@/utils/currency";

type Account = Tables<"accounts">;

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
	const { t } = useTranslation();
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
				title: t("common.error"),
				description: t("reports.accounts.errors.fetchAccounts"),
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

				// Use current_balance from database instead of manual calculation
				// The database automatically calculates this with triggers
				const currentBalance = account.current_balance;
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
		<div className="space-y-6 px-0 sm:px-6 md:px-8">
			<div className="flex justify-between items-center">
				<div>
					<h2 className="text-lg md:text-xl lg:text-2xl font-bold text-foreground flex items-center gap-2">
						<CreditCard className="size-6" />
						{t("reports.accounts.title")}
					</h2>
					<p className="text-muted-foreground">
						{t("reports.accounts.subtitle")}
					</p>
				</div>
				<Button onClick={exportData} variant="outline">
					<Download className="size-4 mr-2" />
					{t("reports.accounts.exportCsv")}
				</Button>
			</div>

			{/* Filters */}
			<Card>
				<CardHeader>
					<CardTitle>{t("reports.accounts.filters.title")}</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="grid grid-cols-1 md:grid-cols-4 gap-4">
						<div>
							<Label htmlFor="account_filter">
								{t("reports.accounts.filters.account")}
							</Label>
							<Select
								value={selectedAccount}
								onValueChange={setSelectedAccount}
							>
								<SelectTrigger>
									<SelectValue
										placeholder={t("reports.accounts.filters.allAccounts")}
									/>
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">
										{t("reports.accounts.filters.allAccounts")}
									</SelectItem>
									{accounts.map((account) => (
										<SelectItem key={account.id} value={account.id}>
											{account.name} ({account.currency})
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div>
							<Label htmlFor="date_from">
								{t("reports.accounts.filters.fromDate")}
							</Label>
							<Input
								id="date_from"
								type="date"
								value={dateFrom}
								onChange={(e) => setDateFrom(e.target.value)}
							/>
						</div>
						<div>
							<Label htmlFor="date_to">
								{t("reports.accounts.filters.toDate")}
							</Label>
							<Input
								id="date_to"
								type="date"
								value={dateTo}
								onChange={(e) => setDateTo(e.target.value)}
							/>
						</div>
						<div className="flex items-end">
							<Button onClick={fetchData} className="w-full">
								{t("reports.accounts.refreshData")}
							</Button>
						</div>
					</div>
				</CardContent>
			</Card>

			<Tabs defaultValue="balances" className="w-full">
				<TabsList>
					<TabsTrigger value="balances">
						{t("reports.accounts.tabs.balances")}
					</TabsTrigger>
					<TabsTrigger value="transactions">
						{t("reports.accounts.tabs.transactions")}
					</TabsTrigger>
				</TabsList>

				<TabsContent value="balances">
					<Card>
						<CardHeader>
							<CardTitle>{t("reports.accounts.balances.title")}</CardTitle>
							<CardDescription>
								{t("reports.accounts.balances.subtitle")}
							</CardDescription>
						</CardHeader>
						<CardContent>
							{/* Desktop table */}
							<div className="hidden md:block">
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead>
												{t("reports.accounts.balances.accountName")}
											</TableHead>
											<TableHead>
												{t("reports.accounts.balances.currency")}
											</TableHead>
											<TableHead className="text-right">
												{t("reports.accounts.balances.initialBalance")}
											</TableHead>
											<TableHead className="text-right">
												{t("reports.accounts.balances.totalIncome")}
											</TableHead>
											<TableHead className="text-right">
												{t("reports.accounts.balances.totalExpenses")}
											</TableHead>
											<TableHead className="text-right">
												{t("reports.accounts.balances.netTransfers")}
											</TableHead>
											<TableHead className="text-right">
												{t("reports.accounts.balances.currentBalance")}
											</TableHead>
											<TableHead className="text-right">
												{t("reports.accounts.balances.transactions")}
											</TableHead>
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
							<CardTitle>{t("reports.accounts.transactions.title")}</CardTitle>
							<CardDescription>
								{t("reports.accounts.transactions.subtitle")}
							</CardDescription>
						</CardHeader>
						<CardContent>
							{/* Desktop table */}
							<div className="hidden md:block">
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead>
												{t("reports.accounts.transactions.date")}
											</TableHead>
											<TableHead>
												{t("reports.accounts.transactions.account")}
											</TableHead>
											<TableHead>
												{t("reports.accounts.transactions.type")}
											</TableHead>
											<TableHead>
												{t("reports.accounts.transactions.description")}
											</TableHead>
											<TableHead className="text-right">
												{t("reports.accounts.transactions.amount")}
											</TableHead>
											<TableHead>
												{t("reports.accounts.transactions.note")}
											</TableHead>
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
															{t(
																`reports.accounts.transactions.types.${transaction.type}`,
															)}
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
													{t(
														`reports.accounts.transactions.types.${transaction.type}`,
													)}
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
										{t("reports.accounts.transactions.showingFirst")}
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
