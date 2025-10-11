import {
	Calendar,
	ChevronDown,
	ChevronRight,
	DollarSign,
	Download,
	RefreshCw,
	TrendingDown,
	TrendingUp,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { EnhancedFinancialReportsSkeleton } from "@/components/reports";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLocationContext } from "@/context/location-context";
import { useTenant } from "@/hooks/use-tenant";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
	convertCurrency,
	formatCurrency,
	getAvailableCurrencies,
} from "@/utils/currency";

type FinancialSummary = {
	totalIncome: number;
	totalExpenses: number;
	netProfit: number;
	profitMargin: number;
	incomeTransactions: number;
	expenseTransactions: number;
};

type IncomeCategory = {
	type: string;
	amount: number;
	percentage: number;
	transactions: Array<{
		id: string;
		date: string;
		amount: number;
		description: string;
		account: string;
		currency: string;
	}>;
};

type ExpenseCategory = {
	type: string;
	subType?: string;
	amount: number;
	percentage: number;
	transactions: Array<{
		id: string;
		date: string;
		amount: number;
		description: string;
		account: string;
		currency: string;
	}>;
};

export default function EnhancedFinancialReports() {
	const { t } = useTranslation();
	const [loading, setLoading] = useState(true);
	const [summary, setSummary] = useState<FinancialSummary>({
		totalIncome: 0,
		totalExpenses: 0,
		netProfit: 0,
		profitMargin: 0,
		incomeTransactions: 0,
		expenseTransactions: 0,
	});
	const [incomeCategories, setIncomeCategories] = useState<IncomeCategory[]>(
		[],
	);
	const [expenseCategories, setExpenseCategories] = useState<ExpenseCategory[]>(
		[],
	);
	const [expandedIncome, setExpandedIncome] = useState<Set<string>>(new Set());
	const [expandedExpenses, setExpandedExpenses] = useState<Set<string>>(
		new Set(),
	);
	const [dateFrom, setDateFrom] = useState("");
	const [dateTo, setDateTo] = useState("");
	const [baseCurrency, setBaseCurrency] = useState<string>("LKR");
	const [availableCurrencies, setAvailableCurrencies] = useState<string[]>([]);
	const { toast } = useToast();
	const { tenant } = useTenant();
	const { selectedLocation } = useLocationContext();

	useEffect(() => {
		if (tenant?.id) {
			const loadInitialData = async () => {
				await Promise.all([fetchAvailableCurrencies(), fetchData()]);
			};
			loadInitialData();
		}
	}, [tenant?.id]);

	useEffect(() => {
		if (tenant?.id && selectedLocation) {
			fetchData();
		}
	}, [selectedLocation, tenant?.id]);

	const fetchAvailableCurrencies = async () => {
		if (!tenant?.id || !selectedLocation) return;

		try {
			const currencies = await getAvailableCurrencies(
				tenant.id,
				selectedLocation,
			);
			setAvailableCurrencies(currencies);
			// Set default currency to LKR if available, otherwise use the first available currency
			if (currencies.length > 0 && !currencies.includes(baseCurrency)) {
				setBaseCurrency(currencies.includes("LKR") ? "LKR" : currencies[0]);
			}
		} catch (error) {
			console.error("Error fetching available currencies:", error);
			setAvailableCurrencies(["LKR", "USD"]); // Fallback currencies
		}
	};

	const fetchData = async () => {
		setLoading(true);
		try {
			await Promise.all([
				fetchFinancialSummary(),
				fetchIncomeBreakdown(),
				fetchExpenseBreakdown(),
			]);
		} catch (error) {
			toast({
				title: t("reports.common.error"),
				description: t("reports.common.loading"),
				variant: "destructive",
			});
		} finally {
			setLoading(false);
		}
	};

	const fetchFinancialSummary = async () => {
		if (!tenant?.id) return;

		try {
			// Build queries with filters
			let incomeQuery = supabase.from("income").select("amount, currency");
			let expenseQuery = supabase
				.from("expenses")
				.select("amount, currency, accounts(currency)");
			let paymentsQuery = supabase.from("payments").select("amount, currency");

			// Apply tenant filters first
			incomeQuery = incomeQuery.eq("tenant_id", tenant.id);
			expenseQuery = expenseQuery.eq("accounts.tenant_id", tenant.id);
			paymentsQuery = supabase
				.from("payments")
				.select("amount, currency, reservations!inner(tenant_id, location_id)")
				.eq("reservations.tenant_id", tenant.id);

			// Apply location filters
			if (selectedLocation) {
				incomeQuery = incomeQuery.eq("location_id", selectedLocation);
				expenseQuery = expenseQuery.eq("location_id", selectedLocation);
				paymentsQuery = paymentsQuery.eq(
					"reservations.location_id",
					selectedLocation,
				);
			}

			// Apply date filters
			if (dateFrom) {
				incomeQuery = incomeQuery.gte("date", dateFrom);
				expenseQuery = expenseQuery.gte("date", dateFrom);
				paymentsQuery = paymentsQuery.gte("created_at", dateFrom);
			}
			if (dateTo) {
				incomeQuery = incomeQuery.lte("date", dateTo);
				expenseQuery = expenseQuery.lte("date", dateTo);
				paymentsQuery = paymentsQuery.lte("created_at", dateTo);
			}

			const [incomeResult, expenseResult, paymentsResult] = await Promise.all([
				incomeQuery,
				expenseQuery,
				paymentsQuery,
			]);

			let totalIncome = 0;
			let totalExpenses = 0;
			let totalTransactions = 0;

			// Process reservation payments as income
			for (const payment of paymentsResult.data || []) {
				const convertedAmount = await convertCurrency(
					parseFloat(payment.amount.toString()),
					payment.currency as any,
					baseCurrency,
					tenant.id,
					selectedLocation!,
				);
				totalIncome += convertedAmount;
				totalTransactions++;
			}

			// Process expenses
			for (const expense of expenseResult.data || []) {
				const accountCurrency =
					(expense as any).accounts?.currency || expense.currency;
				const convertedAmount = await convertCurrency(
					parseFloat(expense.amount.toString()),
					accountCurrency as any,
					baseCurrency,
					tenant.id,
					selectedLocation!,
				);
				totalExpenses += convertedAmount;
			}

			const netProfit = totalIncome - totalExpenses;
			const profitMargin =
				totalIncome > 0 ? (netProfit / totalIncome) * 100 : 0;

			setSummary({
				totalIncome,
				totalExpenses,
				netProfit,
				profitMargin,
				incomeTransactions: totalTransactions,
				expenseTransactions: expenseResult.data?.length || 0,
			});
		} catch (error) {
			console.error("Error fetching financial summary:", error);
		}
	};

	const fetchIncomeBreakdown = async () => {
		if (!tenant?.id) return;

		try {
			// Fetch direct income
			let incomeQuery = supabase
				.from("income")
				.select(`id, date, amount, type, note, currency, accounts(name)`)
				.eq("tenant_id", tenant.id);

			// Base payments query with tenant filtering
			const basePaymentsSelect = `
          id, created_at, amount, currency, payment_type, notes,
          accounts(name),
          reservations!inner(guest_name, reservation_number, location_id, tenant_id)
        `;

			let paymentsQuery = supabase
				.from("payments")
				.select(basePaymentsSelect)
				.eq("reservations.tenant_id", tenant.id);

			// Apply location filters
			if (selectedLocation) {
				incomeQuery = incomeQuery.eq("location_id", selectedLocation);
				paymentsQuery = paymentsQuery.eq(
					"reservations.location_id",
					selectedLocation,
				);
			}

			// Apply date filters
			if (dateFrom) {
				incomeQuery = incomeQuery.gte("date", dateFrom);
				paymentsQuery = paymentsQuery.gte("created_at", dateFrom);
			}
			if (dateTo) {
				incomeQuery = incomeQuery.lte("date", dateTo);
				paymentsQuery = paymentsQuery.lte("created_at", dateTo);
			}

			const [incomeResult, paymentsResult] = await Promise.all([
				incomeQuery.order("date", { ascending: false }),
				paymentsQuery.order("created_at", { ascending: false }),
			]);

			if (incomeResult.error) throw incomeResult.error;
			if (paymentsResult.error) throw paymentsResult.error;

			const incomeMap = new Map<string, IncomeCategory>();
			let totalIncomeForPercentage = 0;

			// Process reservation payments as income
			for (const payment of paymentsResult.data || []) {
				const convertedAmount = await convertCurrency(
					parseFloat(payment.amount.toString()),
					payment.currency as any,
					baseCurrency,
					tenant.id,
					selectedLocation!,
				);
				totalIncomeForPercentage += convertedAmount;

				const type = "Reservation Payments";
				if (!incomeMap.has(type)) {
					incomeMap.set(type, {
						type,
						amount: 0,
						percentage: 0,
						transactions: [],
					});
				}

				const category = incomeMap.get(type)!;
				category.amount += convertedAmount;
				category.transactions.push({
					id: payment.id,
					date: payment.created_at,
					amount: convertedAmount,
					description: `${payment.payment_type} - ${(payment as any).reservations?.guest_name} (${(payment as any).reservations?.reservation_number})${payment.notes ? ` - ${payment.notes}` : ""}`,
					account: (payment as any).accounts?.name || "Unknown",
					currency: baseCurrency,
				});
			}

			// Calculate percentages and sort
			const categories = Array.from(incomeMap.values())
				.map((cat) => ({
					...cat,
					percentage:
						totalIncomeForPercentage > 0
							? (cat.amount / totalIncomeForPercentage) * 100
							: 0,
				}))
				.sort((a, b) => b.amount - a.amount);

			setIncomeCategories(categories);
		} catch (error) {
			console.error("Error fetching income breakdown:", error);
		}
	};

	const fetchExpenseBreakdown = async () => {
		if (!tenant?.id) return;

		try {
			let query = supabase.from("expenses").select(`
          id, date, amount, main_type, sub_type, note, currency,
          accounts!inner(name, currency, tenant_id)
        `);

			// Apply tenant filter first
			query = query.eq("accounts.tenant_id", tenant.id);

			// Apply filters
			if (selectedLocation) {
				query = query.eq("location_id", selectedLocation);
			}
			if (dateFrom) {
				query = query.gte("date", dateFrom);
			}
			if (dateTo) {
				query = query.lte("date", dateTo);
			}

			const { data, error } = await query.order("date", { ascending: false });
			if (error) throw error;

			// Group by main expense type
			const expenseMap = new Map<string, ExpenseCategory>();
			let totalExpenseForPercentage = 0;

			for (const expense of data || []) {
				const accountCurrency =
					(expense as any).accounts?.currency || expense.currency;
				const convertedAmount = await convertCurrency(
					parseFloat(expense.amount.toString()),
					accountCurrency as any,
					baseCurrency,
					tenant.id,
					selectedLocation!,
				);
				totalExpenseForPercentage += convertedAmount;

				const type = expense.main_type || "Other";
				if (!expenseMap.has(type)) {
					expenseMap.set(type, {
						type,
						amount: 0,
						percentage: 0,
						transactions: [],
					});
				}

				const category = expenseMap.get(type)!;
				category.amount += convertedAmount;
				category.transactions.push({
					id: expense.id,
					date: expense.date,
					amount: convertedAmount,
					description: `${expense.main_type} - ${expense.sub_type}${expense.note ? ` (${expense.note})` : ""}`,
					account: (expense as any).accounts?.name || "Unknown",
					currency: baseCurrency,
				});
			} // Calculate percentages
			const categories = Array.from(expenseMap.values())
				.map((cat) => ({
					...cat,
					percentage:
						totalExpenseForPercentage > 0
							? (cat.amount / totalExpenseForPercentage) * 100
							: 0,
				}))
				.sort((a, b) => b.amount - a.amount);

			setExpenseCategories(categories);
		} catch (error) {
			console.error("Error fetching expense breakdown:", error);
		}
	};

	const toggleIncomeExpansion = (type: string) => {
		const newExpanded = new Set(expandedIncome);
		if (newExpanded.has(type)) {
			newExpanded.delete(type);
		} else {
			newExpanded.add(type);
		}
		setExpandedIncome(newExpanded);
	};

	const toggleExpenseExpansion = (type: string) => {
		const newExpanded = new Set(expandedExpenses);
		if (newExpanded.has(type)) {
			newExpanded.delete(type);
		} else {
			newExpanded.add(type);
		}
		setExpandedExpenses(newExpanded);
	};

	if (loading) {
		return <EnhancedFinancialReportsSkeleton />;
	}

	return (
		<div className="space-y-6 px-0 sm:px-4">
			{/* Filters */}
			<Card className="">
				<CardHeader>
					<CardTitle className="text-base md:text-lg lg:text-xl flex items-center gap-2">
						<Calendar className="size-5" />
						{t("reports.enhanced.filters.title")}
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="grid grid-cols-1 md:grid-cols-4 gap-4">
						<div>
							<Label htmlFor="currency">
								{t("reports.enhanced.filters.baseCurrency")}
							</Label>
							<Select
								value={baseCurrency}
								onValueChange={(value: string) => setBaseCurrency(value)}
							>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{availableCurrencies.map((currency) => (
										<SelectItem key={currency} value={currency}>
											{currency}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div>
							<Label htmlFor="date_from">
								{t("reports.enhanced.filters.fromDate")}
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
								{t("reports.enhanced.filters.toDate")}
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
								<RefreshCw className="size-4 mr-2" />
								{t("common.buttons.refresh")}
							</Button>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Summary Cards */}
			<div
				className="grid grid-cols-1 md:grid-cols-3 gap-6"
				data-testid="financial-summary-cards"
			>
				<Card className="bg-green-50 border-green-200">
					<CardContent className="p-4 sm:p-6">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-sm font-medium text-green-600">
									{t("reports.enhanced.summary.totalIncome")}
								</p>
								<p className="text-sm sm:text-base lg:text-xl font-bold text-green-900">
									{formatCurrency(summary.totalIncome, baseCurrency)}
								</p>
								<p className="text-sm text-green-600">
									{summary.incomeTransactions}{" "}
									{t("reports.enhanced.summary.incomeTransactions")}
								</p>
							</div>
							<TrendingUp className="size-8 text-green-600" />
						</div>
					</CardContent>
				</Card>

				<Card className="bg-red-50 border-red-200">
					<CardContent className="p-4 sm:p-6">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-sm font-medium text-red-600">
									{t("reports.enhanced.summary.totalExpenses")}
								</p>
								<p className="text-sm sm:text-base lg:text-xl font-bold text-red-900">
									{formatCurrency(summary.totalExpenses, baseCurrency)}
								</p>
								<p className="text-sm text-red-600">
									{summary.expenseTransactions}{" "}
									{t("reports.enhanced.summary.expenseTransactions")}
								</p>
							</div>
							<TrendingDown className="size-8 text-red-600" />
						</div>
					</CardContent>
				</Card>

				<Card
					className={`${summary.netProfit >= 0 ? "bg-blue-50 border-blue-200" : "bg-red-50 border-red-200"}`}
				>
					<CardContent className="p-4 sm:p-6">
						<div className="flex items-center justify-between">
							<div>
								<p
									className={`text-sm font-medium ${summary.netProfit >= 0 ? "text-blue-600" : "text-red-600"}`}
								>
									{t("reports.enhanced.summary.netProfit")}
								</p>
								<p
									className={`text-sm sm:text-base lg:text-xl font-bold ${summary.netProfit >= 0 ? "text-blue-900" : "text-red-900"}`}
								>
									{formatCurrency(summary.netProfit, baseCurrency)}
								</p>
								<p
									className={`text-sm ${summary.netProfit >= 0 ? "text-blue-600" : "text-red-600"}`}
								>
									{summary.profitMargin.toFixed(1)}%{" "}
									{t("reports.enhanced.summary.profitMargin")}
								</p>
							</div>
							<DollarSign
								className={`size-8 ${summary.netProfit >= 0 ? "text-blue-600" : "text-red-600"}`}
							/>
						</div>
					</CardContent>
				</Card>
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				{/* Income Summary */}
				<Card className="px-0 sm:px-4">
					<CardHeader className="px-2 pb-3">
						<CardTitle className="flex items-start sm:items-center gap-2 text-green-600 text-lg sm:text-xl">
							<TrendingUp className="size-6" />
							<p>{t("reports.enhanced.breakdown.incomeBreakdown")}</p>
							<span className="font-bold">
								{formatCurrency(summary.totalIncome, baseCurrency)}
							</span>
						</CardTitle>
					</CardHeader>
					<CardContent className="px-2 space-y-3">
						{incomeCategories.length === 0 ? (
							<p className="text-center text-muted-foreground py-8">
								{t("reports.common.noData")}
							</p>
						) : (
							incomeCategories.map((category) => (
								<Collapsible
									key={category.type}
									open={expandedIncome.has(category.type)}
									onOpenChange={() => toggleIncomeExpansion(category.type)}
								>
									<CollapsibleTrigger className="w-full">
										<div className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
											<div className="flex items-center gap-3">
												{expandedIncome.has(category.type) ? (
													<ChevronDown className="size-4" />
												) : (
													<ChevronRight className="size-4" />
												)}
												<div className="text-left">
													<p className="font-semibold">{category.type}</p>
													<p className="text-sm text-muted-foreground">
														{category.percentage.toFixed(1)}%
													</p>
												</div>
											</div>
											<div className="text-right">
												<p className="font-bold">
													{formatCurrency(category.amount, baseCurrency)}
													<ChevronDown className="size-4 inline ml-1" />
												</p>
											</div>
										</div>
									</CollapsibleTrigger>
									<CollapsibleContent className="mt-2">
										<div className="pl-8 space-y-2">
											{category.transactions.slice(0, 10).map((txn) => (
												<div
													key={txn.id}
													className="flex flex-col sm:flex-row items-start justify-between sm:items-center text-sm p-2 bg-muted/30 rounded border-l-2 border-l-green-200"
												>
													<div>
														<p className="font-medium">
															{new Date(txn.date).toLocaleDateString()} -{" "}
															{txn.account}
														</p>
														<p className="text-muted-foreground truncate w-80">
															{txn.description}
														</p>
													</div>
													<p className="font-semibold text-green-600">
														{formatCurrency(txn.amount, baseCurrency)}
													</p>
												</div>
											))}
											{category.transactions.length > 10 && (
												<p className="text-sm text-muted-foreground text-center py-2">
													+{category.transactions.length - 10}{" "}
													{t("common.transaction.moreTransactions")}
												</p>
											)}
										</div>
									</CollapsibleContent>
								</Collapsible>
							))
						)}
					</CardContent>
				</Card>

				{/* Expense Summary */}
				<Card className="px-0 sm:px-4">
					<CardHeader className="px-2 pb-3">
						<CardTitle className="flex items-center gap-2 text-red-600 text-lg sm:text-xl">
							<TrendingDown className="size-6" />
							{t("reports.enhanced.breakdown.expenseBreakdown")}
							<span className="ml-auto font-bold">
								{formatCurrency(summary.totalExpenses, baseCurrency)}
							</span>
						</CardTitle>
					</CardHeader>
					<CardContent className="px-2 space-y-3">
						{expenseCategories.length === 0 ? (
							<p className="text-center text-muted-foreground py-8">
								{t("reports.common.noData")}
							</p>
						) : (
							expenseCategories.map((category) => (
								<Collapsible
									key={category.type}
									open={expandedExpenses.has(category.type)}
									onOpenChange={() => toggleExpenseExpansion(category.type)}
								>
									<CollapsibleTrigger className="w-full">
										<div className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
											<div className="flex items-center gap-3">
												{expandedExpenses.has(category.type) ? (
													<ChevronDown className="size-4" />
												) : (
													<ChevronRight className="size-4" />
												)}
												<div className="text-left">
													<p className="font-semibold">{category.type}</p>
													<p className="text-sm text-muted-foreground">
														{category.percentage.toFixed(1)}%
													</p>
												</div>
											</div>
											<div className="text-right">
												<p className="font-bold">
													{formatCurrency(category.amount, baseCurrency)}
													<ChevronDown className="size-4 inline ml-1" />
												</p>
											</div>
										</div>
									</CollapsibleTrigger>
									<CollapsibleContent className="mt-2">
										<div className="pl-8 space-y-2">
											{category.transactions.slice(0, 10).map((txn) => (
												<div
													key={txn.id}
													className="flex justify-between items-center text-sm p-2 bg-muted/30 rounded border-l-2 border-l-red-200"
												>
													<div>
														<p className="font-medium">
															{new Date(txn.date).toLocaleDateString()} -{" "}
															{txn.account}
														</p>
														<p className="text-muted-foreground truncate">
															{txn.description}
														</p>
													</div>
													<p className="font-semibold text-red-600">
														{formatCurrency(txn.amount, baseCurrency)}
													</p>
												</div>
											))}
											{category.transactions.length > 10 && (
												<p className="text-sm text-muted-foreground text-center py-2">
													+{category.transactions.length - 10}{" "}
													{t("common.transaction.moreTransactions")}
												</p>
											)}
										</div>
									</CollapsibleContent>
								</Collapsible>
							))
						)}
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
