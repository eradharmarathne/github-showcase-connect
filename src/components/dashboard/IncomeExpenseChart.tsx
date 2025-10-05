import { ArrowDownCircle, ArrowUpCircle, TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ReferenceLine } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	ChartConfig,
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
} from "@/components/ui/chart";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import { convertCurrency } from "@/utils/currency";

type Location = Tables<"locations">;

interface ChartData {
	date: string;
	income: number;
	expenses: number;
	net: number;
}

interface IncomeExpenseChartProps {
	selectedLocation: string;
	selectedMonth: string;
	locations: Location[];
}

const chartConfig = {
	income: {
		label: "Income",
		color: "hsl(var(--primary))",
	},
	expenses: {
		label: "Expenses", 
		color: "hsl(var(--destructive))",
	},
	net: {
		label: "Net",
		color: "hsl(var(--chart-3))",
	},
} satisfies ChartConfig;

export function IncomeExpenseChart({
	selectedLocation,
	selectedMonth,
	locations,
}: IncomeExpenseChartProps) {
	const [loading, setLoading] = useState(true);
	const [chartData, setChartData] = useState<ChartData[]>([]);
	const [todayIncome, setTodayIncome] = useState(0);
	const [todayExpenses, setTodayExpenses] = useState(0);
	const [weeklyProfit, setWeeklyProfit] = useState(0);
	const [profitMargin, setProfitMargin] = useState(0);
	const { tenant } = useAuth();
	const { t } = useTranslation();

	useEffect(() => {
		const fetchFinancialData = async () => {
			if (!tenant?.id) {
				setLoading(false);
				return;
			}

			try {
				// Get locations for the tenant first to filter by tenant
				const { data: tenantLocations } = await supabase
					.from("locations")
					.select("id")
					.eq("tenant_id", tenant.id)
					.eq("is_active", true);

				const tenantLocationIds = tenantLocations?.map((loc) => loc.id) || [];

				if (tenantLocationIds.length === 0) {
					setChartData([]);
					setTodayIncome(0);
					setTodayExpenses(0);
					setWeeklyProfit(0);
					setProfitMargin(0);
					setLoading(false);
					return;
				}

				// Set date range based on selected month or last 30 days
				const endDate = new Date();
				const startDate = selectedMonth 
					? new Date(selectedMonth + "-01")
					: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

				if (selectedMonth) {
					const [year, month] = selectedMonth.split("-");
					endDate.setFullYear(parseInt(year), parseInt(month), 0); // Last day of selected month
				}

				const dateRange = [];
				const currentDate = new Date(startDate);
				while (currentDate <= endDate) {
					dateRange.push(currentDate.toISOString().split("T")[0]);
					currentDate.setDate(currentDate.getDate() + 1);
				}

				// Build location filter
				const locationFilter = !selectedLocation
					? {}
					: { location_id: selectedLocation };

				// Fetch income and expenses data
				const [incomeData, expensesData] = await Promise.all([
					supabase
						.from("income")
						.select("date, amount, currency")
						.gte("date", startDate.toISOString().split("T")[0])
						.lte("date", endDate.toISOString().split("T")[0])
						.in("location_id", tenantLocationIds)
						.match(locationFilter),
					supabase
						.from("expenses")
						.select("date, amount, currency")
						.gte("date", startDate.toISOString().split("T")[0])
						.lte("date", endDate.toISOString().split("T")[0])
						.in("location_id", tenantLocationIds)
						.match(locationFilter)
				]);

				// Process data for chart
				const processedData: ChartData[] = await Promise.all(
					dateRange.map(async (date) => {
						const dayIncome = incomeData.data?.filter(item => item.date === date) || [];
						const dayExpenses = expensesData.data?.filter(item => item.date === date) || [];

						// Convert currencies and sum amounts
						let totalIncome = 0;
						let totalExpenses = 0;

						for (const income of dayIncome) {
							const convertedAmount = await convertCurrency(
								income.amount,
								income.currency || "LKR",
								"LKR"
							);
							totalIncome += convertedAmount;
						}

						for (const expense of dayExpenses) {
							const convertedAmount = await convertCurrency(
								expense.amount,
								expense.currency || "LKR",
								"LKR"
							);
							totalExpenses += convertedAmount;
						}

						return {
							date,
							income: totalIncome,
							expenses: -totalExpenses, // Negative for chart display
							net: totalIncome - totalExpenses,
						};
					})
				);

				setChartData(processedData);

				// Calculate today's data
				const today = new Date().toISOString().split("T")[0];
				const todayData = processedData.find(item => item.date === today);
				setTodayIncome(todayData?.income || 0);
				setTodayExpenses(Math.abs(todayData?.expenses || 0));

				// Calculate weekly profit (last 7 days)
				const last7Days = processedData.slice(-7);
				const weeklyIncomeTotal = last7Days.reduce((sum, day) => sum + day.income, 0);
				const weeklyExpensesTotal = last7Days.reduce((sum, day) => sum + Math.abs(day.expenses), 0);
				const profit = weeklyIncomeTotal - weeklyExpensesTotal;
				const margin = weeklyIncomeTotal > 0 ? (profit / weeklyIncomeTotal) * 100 : 0;

				setWeeklyProfit(profit);
				setProfitMargin(margin);

			} catch (error) {
				console.error("Error fetching financial data:", error);
			} finally {
				setLoading(false);
			}
		};

		fetchFinancialData();
	}, [selectedLocation, selectedMonth, tenant?.id]);

	if (loading) {
		return (
			<div className="space-y-4">
				{/* Summary Cards */}
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
					{[1, 2, 3].map((i) => (
						<Card key={i} className="bg-card border">
							<CardHeader className="pb-2">
								<div className="h-4 bg-muted rounded animate-pulse" />
							</CardHeader>
							<CardContent>
								<div className="h-8 bg-muted rounded animate-pulse mb-2" />
								<div className="h-3 bg-muted rounded animate-pulse w-3/4" />
							</CardContent>
						</Card>
					))}
				</div>
				{/* Chart */}
				<Card className="bg-card border">
					<CardContent className="pt-6">
						<div className="h-[300px] bg-muted rounded animate-pulse" />
					</CardContent>
				</Card>
			</div>
		);
	}

	const locationName = selectedLocation 
		? locations.find((l) => l.id === selectedLocation)?.name || "All Locations"
		: "All Locations";

	return (
		<div className="space-y-4">
			{/* Summary Cards */}
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
				<Card className="bg-card border">
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium text-muted-foreground">
							{selectedMonth ? "Monthly Income" : "Today's Income"}
						</CardTitle>
						<ArrowUpCircle className="size-4 text-success" />
					</CardHeader>
					<CardContent>
						<div className="text-xl lg:text-2xl font-bold text-success">
							Rs. {todayIncome.toLocaleString()}
						</div>
						<p className="text-xs text-muted-foreground">{locationName}</p>
					</CardContent>
				</Card>

				<Card className="bg-card border">
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium text-muted-foreground">
							{selectedMonth ? "Monthly Expenses" : "Today's Expenses"}
						</CardTitle>
						<ArrowDownCircle className="size-4 text-destructive" />
					</CardHeader>
					<CardContent>
						<div className="text-xl lg:text-2xl font-bold text-destructive">
							Rs. {todayExpenses.toLocaleString()}
						</div>
						<p className="text-xs text-muted-foreground">{locationName}</p>
					</CardContent>
				</Card>

				<Card className="bg-card border">
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium text-muted-foreground">
							Weekly Profit
						</CardTitle>
						<TrendingUp className="size-4 text-primary" />
					</CardHeader>
					<CardContent>
						<div className="text-xl lg:text-2xl font-bold text-primary">
							Rs. {weeklyProfit.toLocaleString()}
						</div>
						<p className="text-xs text-muted-foreground">
							{profitMargin.toFixed(1)}% margin
						</p>
					</CardContent>
				</Card>
			</div>

			{/* Chart */}
			<Card className="bg-card border">
				<CardHeader>
					<CardTitle className="text-lg font-semibold">
						Income vs Expenses
					</CardTitle>
					<p className="text-sm text-muted-foreground">
						{selectedMonth ? "Monthly" : "Last 30 days"} financial overview
					</p>
				</CardHeader>
				<CardContent>
					<ChartContainer config={chartConfig} className="h-[300px] w-full">
						<BarChart
							data={chartData}
							margin={{
								left: 12,
								right: 12,
								top: 12,
								bottom: 12,
							}}
							barCategoryGap={0}
						>
							<CartesianGrid vertical={false} />
							<XAxis
								dataKey="date"
								tickLine={false}
								axisLine={false}
								tickMargin={8}
								minTickGap={32}
								tickFormatter={(value) => {
									const date = new Date(value);
									return date.toLocaleDateString("en-US", {
										month: "short",
										day: "numeric",
									});
								}}
							/>
							<YAxis
								tickLine={false}
								axisLine={false}
								tickMargin={8}
								tickFormatter={(value) => `Rs. ${Math.abs(value).toLocaleString()}`}
							/>
							<ReferenceLine y={0} stroke="hsl(var(--border))" strokeDasharray="3 3" />
							<ChartTooltip
								content={
									<ChartTooltipContent
										className="w-[200px]"
										labelFormatter={(value) => {
											return new Date(value).toLocaleDateString("en-US", {
												month: "short",
												day: "numeric",
												year: "numeric",
											});
										}}
										formatter={(value, name) => [
											`Rs. ${Math.abs(Number(value)).toLocaleString()}`,
											name === "expenses" ? "Expenses" : name === "income" ? "Income" : "Net"
										]}
									/>
								}
							/>
							<Bar 
								dataKey="income" 
								fill="hsl(var(--primary))" 
								radius={4}
								name="Income"
							/>
							<Bar 
								dataKey="expenses" 
								fill="hsl(var(--destructive))" 
								radius={4}
								name="Expenses"
							/>
						</BarChart>
					</ChartContainer>
				</CardContent>
			</Card>
		</div>
	);
}