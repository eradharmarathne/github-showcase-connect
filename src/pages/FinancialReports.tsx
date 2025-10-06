import {
	ArrowLeft,
	BarChart3,
	DollarSign,
	Download,
	TrendingDown,
	TrendingUp,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { useLocationContext } from "@/context/LocationContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { getCurrencySymbol } from "@/utils/currency";

type Location = {
	id: string;
	name: string;
};

type Account = {
	id: string;
	name: string;
	currency: string;
};

type FinancialData = {
	totalIncome: number;
	totalExpenses: number;
	netProfit: number;
	incomeTransactions: number;
	expenseTransactions: number;
	profitMargin: number;
};

export default function FinancialReports() {
	const { selectedLocation } = useLocationContext();
	const [selectedMonth, setSelectedMonth] = useState("all");
	const [startDate, setStartDate] = useState("");
	const [endDate, setEndDate] = useState("");
	const [locations, setLocations] = useState<Location[]>([]);
	const [accounts, setAccounts] = useState<Account[]>([]);
	const [financialData, setFinancialData] = useState<FinancialData>({
		totalIncome: 0,
		totalExpenses: 0,
		netProfit: 0,
		incomeTransactions: 0,
		expenseTransactions: 0,
		profitMargin: 0,
	});
	const [incomeByType, setIncomeByType] = useState<Record<string, number>>({});
	const [expensesByCategory, setExpensesByCategory] = useState<
		Record<string, number>
	>({});
	const [loading, setLoading] = useState(true);
	const { toast } = useToast();

	useEffect(() => {
		fetchInitialData();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	useEffect(() => {
		if (selectedLocation) {
			fetchFinancialData();
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [selectedLocation, selectedMonth, startDate, endDate]);

	const fetchInitialData = async () => {
		try {
			const [locationsData, accountsData] = await Promise.all([
				supabase.from("locations").select("id, name").eq("is_active", true),
				supabase.from("accounts").select("id, name, currency"),
			]);

			setLocations(locationsData.data || []);
			setAccounts(accountsData.data || []);
		} catch (error) {
			console.error("Error fetching initial data:", error);
		}
	};

	const fetchFinancialData = async () => {
		setLoading(true);
		try {
			let incomeQuery = supabase
				.from("income")
				.select("amount, type, date, accounts(currency)");
			let expenseQuery = supabase
				.from("expenses")
				.select("amount, main_type, date, accounts(currency)");

			// Apply location filter
			if (selectedLocation !== "all") {
				incomeQuery = incomeQuery.eq("location_id", selectedLocation);
				expenseQuery = expenseQuery.eq("location_id", selectedLocation);
			}

			// Apply date filters
			if (selectedMonth !== "all") {
				const [year, month] = selectedMonth.split("-");
				const startOfMonth = `${year}-${month}-01`;
				const endOfMonth = new Date(parseInt(year), parseInt(month), 0)
					.toISOString()
					.split("T")[0];
				incomeQuery = incomeQuery
					.gte("date", startOfMonth)
					.lte("date", endOfMonth);
				expenseQuery = expenseQuery
					.gte("date", startOfMonth)
					.lte("date", endOfMonth);
			} else if (startDate && endDate) {
				incomeQuery = incomeQuery.gte("date", startDate).lte("date", endDate);
				expenseQuery = expenseQuery.gte("date", startDate).lte("date", endDate);
			}

			const [incomeResult, expenseResult] = await Promise.all([
				incomeQuery,
				expenseQuery,
			]);

			const incomeData = incomeResult.data || [];
			const expenseData = expenseResult.data || [];

			// Calculate totals with currency conversion
			const usdToLkrRate = parseFloat(
				localStorage.getItem("usdToLkrRate") || "300",
			);

			const totalIncome = incomeData.reduce((sum, item) => {
				const amount = parseFloat(item.amount.toString());
				const currency = item.accounts?.currency || "LKR";
				return sum + (currency === "USD" ? amount * usdToLkrRate : amount);
			}, 0);

			const totalExpenses = expenseData.reduce((sum, item) => {
				const amount = parseFloat(item.amount.toString());
				const currency = item.accounts?.currency || "LKR";
				return sum + (currency === "USD" ? amount * usdToLkrRate : amount);
			}, 0);

			const netProfit = totalIncome - totalExpenses;
			const profitMargin =
				totalIncome > 0 ? (netProfit / totalIncome) * 100 : 0;

			// Group income by type
			const incomeByType = incomeData.reduce((acc, item) => {
				const type = item.type.toUpperCase();
				const amount = parseFloat(item.amount.toString());
				const currency = item.accounts?.currency || "LKR";
				const convertedAmount =
					currency === "USD" ? amount * usdToLkrRate : amount;
				acc[type] = (acc[type] || 0) + convertedAmount;
				return acc;
			}, {});

			// Group expenses by main type
			const expensesByCategory = expenseData.reduce((acc, item) => {
				const category = item.main_type;
				const amount = parseFloat(item.amount.toString());
				const currency = item.accounts?.currency || "LKR";
				const convertedAmount =
					currency === "USD" ? amount * usdToLkrRate : amount;
				acc[category] = (acc[category] || 0) + convertedAmount;
				return acc;
			}, {});

			setFinancialData({
				totalIncome,
				totalExpenses,
				netProfit,
				incomeTransactions: incomeData.length,
				expenseTransactions: expenseData.length,
				profitMargin,
			});

			setIncomeByType(incomeByType);
			setExpensesByCategory(expensesByCategory);
		} catch (error) {
			console.error("Error fetching financial data:", error);
			toast({
				title: "Error",
				description: "Failed to fetch financial data",
				variant: "destructive",
			});
		} finally {
			setLoading(false);
		}
	};

	// Get available months from existing data
	const getAvailableMonths = () => {
		const months = [];
		const currentDate = new Date();
		for (let i = 11; i >= 0; i--) {
			const date = new Date(
				currentDate.getFullYear(),
				currentDate.getMonth() - i,
				1,
			);
			const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
			const monthDisplay = date.toLocaleDateString("en-US", {
				month: "long",
				year: "numeric",
			});
			months.push({ key: monthKey, display: monthDisplay });
		}
		return months;
	};

	const exportPDF = () => {
		// Implementation for PDF export would go here
		toast({
			title: "Export",
			description: "PDF export functionality coming soon",
		});
	};

	if (loading) {
		return null;
	}

	return (
		<div className="container mx-auto p-6 space-y-6">
			{/* Header */}
			<div className="flex items-center gap-4 mb-6">
				<Button asChild variant="ghost" size="icon">
					<Link to="/">
						<ArrowLeft className="size-5" />
					</Link>
				</Button>
				<div>
					<p className="text-muted-foreground">
						Financial insights and performance tracking
					</p>
				</div>
			</div>

			{/* Report Filters */}
			<Card>
				<CardHeader>
					<CardTitle className="flex text-base md:text-lg lg:text-xl items-center gap-2">
						<BarChart3 className="size-5 text-primary" />
						Report Filters
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="grid grid-cols-1 md:grid-cols-4 gap-4">
						{/* Location selector removed - now handled by sidebar */}

						<div className="">
							<Label htmlFor="month">Month Filter</Label>
							<Select value={selectedMonth} onValueChange={setSelectedMonth}>
								<SelectTrigger>
									<SelectValue placeholder="All Months" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">All Months</SelectItem>
									{getAvailableMonths().map((month) => (
										<SelectItem key={month.key} value={month.key}>
											{month.display}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						<div>
							<Label htmlFor="start_date">Start Date</Label>
							<Input
								id="start_date"
								type="date"
								value={startDate}
								onChange={(e) => setStartDate(e.target.value)}
								placeholder="dd/mm/yyyy"
								disabled={selectedMonth !== "all"}
							/>
						</div>

						<div>
							<Label htmlFor="end_date">End Date</Label>
							<Input
								id="end_date"
								type="date"
								value={endDate}
								onChange={(e) => setEndDate(e.target.value)}
								placeholder="dd/mm/yyyy"
								disabled={selectedMonth !== "all"}
							/>
						</div>

						<div>
							<Label>Export Options</Label>
							<Button onClick={exportPDF} variant="outline" className="w-full">
								<Download className="size-4 mr-2" />
								Download PDF Report
							</Button>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Summary Cards */}
			<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
				<Card className="bg-card border">
					<CardContent className="p-6">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-green-800 font-medium">Total Income</p>
								<p className="text-lg sm:text-3xl font-bold text-green-900">
									Rs.{financialData.totalIncome.toLocaleString()}
								</p>
								<p className="text-sm text-green-600 mt-1">
									{financialData.incomeTransactions} transactions
								</p>
							</div>
							<TrendingUp className="size-5 text-green-600" />
						</div>
					</CardContent>
				</Card>

				<Card className="bg-card border">
					<CardContent className="p-6">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-red-800 font-medium">Total Expenses</p>
								<p className="text-lg sm:text-3xl font-bold text-red-900">
									Rs.{financialData.totalExpenses.toLocaleString()}
								</p>
								<p className="text-sm text-red-600 mt-1">
									{financialData.expenseTransactions} transactions
								</p>
							</div>
							<TrendingDown className="size-5 text-red-600" />
						</div>
					</CardContent>
				</Card>

				<Card className="bg-card border relative">
					<CardContent className="p-6">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-blue-800 font-medium">Net Profit</p>
								<p className="text-lg sm:text-3xl font-bold text-blue-900">
									Rs.{Math.abs(financialData.netProfit).toLocaleString()}
								</p>
								<p className="text-sm text-blue-600 mt-1">
									{financialData.profitMargin.toFixed(1)}% margin
								</p>
							</div>
							<DollarSign className="size-5 text-blue-600" />
						</div>
					</CardContent>
				</Card>
			</div>

			{/* Report Tabs */}
			<Tabs defaultValue="summary" className="w-full">
				<TabsList className="grid w-full grid-cols-3">
					<TabsTrigger value="summary" className="flex items-center gap-2">
						<BarChart3 className="size-4" />
						Summary
					</TabsTrigger>
					<TabsTrigger value="profit-loss" className="flex items-center gap-2">
						<TrendingUp className="size-4" />
						Profit & Loss
					</TabsTrigger>
					<TabsTrigger
						value="balance-sheet"
						className="flex items-center gap-2"
					>
						<DollarSign className="size-4" />
						Balance Sheet
					</TabsTrigger>
				</TabsList>

				<TabsContent value="summary" className="space-y-6">
					<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
						{/* Income Summary */}
						<Card>
							<CardHeader>
								<CardTitle className="flex items-center gap-2 text-green-700">
									<TrendingUp className="size-5" />
									Income Summary
									<Badge variant="secondary" className="ml-auto">
										Rs.{financialData.totalIncome.toLocaleString()}
									</Badge>
								</CardTitle>
							</CardHeader>
							<CardContent>
								<div className="space-y-3">
									{Object.entries(incomeByType).map(([type, amount]) => (
										<div
											key={type}
											className="flex justify-between items-center"
										>
											<span className="text-sm font-medium">{type}</span>
											<span className="text-green-600 font-semibold">
												Rs.{amount.toLocaleString()}
											</span>
										</div>
									))}
									{Object.keys(incomeByType).length === 0 && (
										<p className="text-muted-foreground text-center py-4">
											No income data for selected period
										</p>
									)}
								</div>
							</CardContent>
						</Card>

						{/* Expense Summary */}
						<Card>
							<CardHeader>
								<CardTitle className="flex items-center gap-2 text-red-700">
									<TrendingDown className="size-5" />
									Expense Summary
									<Badge variant="secondary" className="ml-auto">
										Rs.{financialData.totalExpenses.toLocaleString()}
									</Badge>
								</CardTitle>
							</CardHeader>
							<CardContent>
								<div className="space-y-3">
									{Object.entries(expensesByCategory).map(
										([category, amount]) => (
											<div
												key={category}
												className="flex justify-between items-center"
											>
												<span className="text-sm font-medium">{category}</span>
												<span className="text-red-600 font-semibold">
													Rs.{amount.toLocaleString()}
												</span>
											</div>
										),
									)}
									{Object.keys(expensesByCategory).length === 0 && (
										<p className="text-muted-foreground text-center py-4">
											No expense data for selected period
										</p>
									)}
								</div>
							</CardContent>
						</Card>
					</div>
				</TabsContent>

				<TabsContent value="profit-loss">
					<Card>
						<CardHeader>
							<CardTitle>Profit & Loss Statement</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="space-y-4">
								<div className="border-b pb-4">
									<h3 className="text-base md:text-lg lg:text-xl font-semibold text-green-700 mb-2">
										INCOME
									</h3>
									{Object.entries(incomeByType).map(([type, amount]) => (
										<div key={type} className="flex justify-between py-1">
											<span>{type}</span>
											<span className="text-green-600">
												Rs.{amount.toLocaleString()}
											</span>
										</div>
									))}
									<div className="flex justify-between font-bold pt-2 border-t">
										<span>Total Income</span>
										<span className="text-green-600">
											Rs.{financialData.totalIncome.toLocaleString()}
										</span>
									</div>
								</div>

								<div className="border-b pb-4">
									<h3 className="text-base md:text-lg lg:text-xl font-semibold text-red-700 mb-2">
										EXPENSES
									</h3>
									{Object.entries(expensesByCategory).map(
										([category, amount]) => (
											<div key={category} className="flex justify-between py-1">
												<span>{category}</span>
												<span className="text-red-600">
													Rs.{amount.toLocaleString()}
												</span>
											</div>
										),
									)}
									<div className="flex justify-between font-bold pt-2 border-t">
										<span>Total Expenses</span>
										<span className="text-red-600">
											Rs.{financialData.totalExpenses.toLocaleString()}
										</span>
									</div>
								</div>

								<div className="flex justify-between text-lg font-bold">
									<span>NET PROFIT/LOSS</span>
									<span
										className={
											financialData.netProfit >= 0
												? "text-green-600"
												: "text-red-600"
										}
									>
										Rs.{Math.abs(financialData.netProfit).toLocaleString()}
										{financialData.netProfit < 0 && " (Loss)"}
									</span>
								</div>
							</div>
						</CardContent>
					</Card>
				</TabsContent>

				<TabsContent value="balance-sheet">
					<Card>
						<CardHeader>
							<CardTitle>Account Balances</CardTitle>
						</CardHeader>
						<CardContent>
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Account Name</TableHead>
										<TableHead>Currency</TableHead>
										<TableHead className="text-right">
											Current Balance
										</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{accounts.map((account) => (
										<TableRow key={account.id}>
											<TableCell className="font-medium">
												{account.name}
											</TableCell>
											<TableCell>{account.currency}</TableCell>
											<TableCell className="text-right">
												{getCurrencySymbol(account.currency)}0.00
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</CardContent>
					</Card>
				</TabsContent>
			</Tabs>
		</div>
	);
}
