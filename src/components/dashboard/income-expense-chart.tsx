import { ArrowDownCircle, ArrowUpCircle, TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
	Bar,
	BarChart,
	CartesianGrid,
	ReferenceLine,
	XAxis,
	YAxis,
} from "recharts";
import { IncomeExpenseChartSkeleton } from "@/components/skeleton/income-expense-chart-skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	ChartConfig,
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
} from "@/components/ui/chart";
import { useAuth } from "@/context/auth-context";
import { useIsMobile } from "@/hooks/use-mobile";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import {
	convertCurrency,
	formatAmountWithSymbol,
	getCurrencySymbol,
	getDisplayCurrency,
} from "@/utils/currency";
import { BookingSourceChart } from "./booking-source-chart";

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
	const displayCurrency = getDisplayCurrency(); // Get the display currency
	const isMobile = useIsMobile();

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
						.match(locationFilter),
				]);

				// Process data for chart
				const processedData: ChartData[] = await Promise.all(
					dateRange.map(async (date) => {
						const dayIncome =
							incomeData.data?.filter((item) => item.date === date) || [];
						const dayExpenses =
							expensesData.data?.filter((item) => item.date === date) || [];

						// Convert currencies and sum amounts
						let totalIncome = 0;
						let totalExpenses = 0;

						for (const income of dayIncome) {
							const convertedAmount = await convertCurrency(
								income.amount,
								income.currency || "LKR",
								displayCurrency,
								tenant.id,
								selectedLocation,
							);
							totalIncome += convertedAmount;
						}

						for (const expense of dayExpenses) {
							const convertedAmount = await convertCurrency(
								expense.amount,
								expense.currency || "LKR",
								displayCurrency,
								tenant.id,
								selectedLocation,
							);
							totalExpenses += convertedAmount;
						}

						return {
							date,
							income: totalIncome,
							expenses: -totalExpenses, // Negative for chart display
							net: totalIncome - totalExpenses,
						};
					}),
				);

				setChartData(processedData);

				// Calculate today's data
				const today = new Date().toISOString().split("T")[0];
				const todayData = processedData.find((item) => item.date === today);
				setTodayIncome(todayData?.income || 0);
				setTodayExpenses(Math.abs(todayData?.expenses || 0));

				// Calculate weekly profit (last 7 days)
				const last7Days = processedData.slice(-7);
				const weeklyIncomeTotal = last7Days.reduce(
					(sum, day) => sum + day.income,
					0,
				);
				const weeklyExpensesTotal = last7Days.reduce(
					(sum, day) => sum + Math.abs(day.expenses),
					0,
				);
				const profit = weeklyIncomeTotal - weeklyExpensesTotal;
				const margin =
					weeklyIncomeTotal > 0 ? (profit / weeklyIncomeTotal) * 100 : 0;

				setWeeklyProfit(profit);
				setProfitMargin(margin);
			} catch (error) {
				console.error("Error fetching financial data:", error);
			} finally {
				setLoading(false);
			}
		};

		fetchFinancialData();
	}, [selectedLocation, selectedMonth, tenant?.id, displayCurrency]);

	if (loading) {
		return <IncomeExpenseChartSkeleton />;
	}

	const locationName = selectedLocation
		? locations.find((l) => l.id === selectedLocation)?.name ||
			t("dashboard.chart.allLocations")
		: t("dashboard.chart.allLocations");

	return (
		<div className="space-y-4 w-full flex-1">
			{/* Summary Cards */}
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
				<Card className="bg-card border">
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm md:text-base lg:text-lg font-medium text-muted-foreground">
							{selectedMonth
								? t("dashboard.summaryCards.monthlyIncome")
								: t("dashboard.summaryCards.todayIncome")}
						</CardTitle>
						<ArrowUpCircle className="size-4 text-success" />
					</CardHeader>
					<CardContent>
						<div className="text-xl lg:text-2xl font-bold text-success">
							{formatAmountWithSymbol(todayIncome, displayCurrency)}
						</div>
						<p className="text-xs text-muted-foreground">{locationName}</p>
					</CardContent>
				</Card>

				<Card className="bg-card border">
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm md:text-base lg:text-lg font-medium text-muted-foreground">
							{selectedMonth
								? t("dashboard.summaryCards.monthlyExpenses")
								: t("dashboard.summaryCards.todayExpenses")}
						</CardTitle>
						<ArrowDownCircle className="size-4 text-destructive" />
					</CardHeader>
					<CardContent>
						<div className="text-xl lg:text-2xl font-bold text-destructive">
							{formatAmountWithSymbol(todayExpenses, displayCurrency)}
						</div>
						<p className="text-xs text-muted-foreground">{locationName}</p>
					</CardContent>
				</Card>

				<Card className="bg-card border">
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm md:text-base lg:text-lg font-medium text-muted-foreground">
							{t("dashboard.summaryCards.weeklyProfit")}
						</CardTitle>
						<TrendingUp className="size-4 text-primary" />
					</CardHeader>
					<CardContent>
						<div className="text-xl lg:text-2xl font-bold text-primary">
							{formatAmountWithSymbol(weeklyProfit, displayCurrency)}
						</div>
						<p className="text-xs text-muted-foreground">
							{profitMargin.toFixed(1)}% {t("dashboard.summaryCards.margin")}
						</p>
					</CardContent>
				</Card>
			</div>

			{/* Chart */}
			<Card className="bg-card border">
				<CardHeader>
					<CardTitle className="text-base md:text-lg lg:text-xl xl:text-2xl font-semibold">
						{t("dashboard.chart.incomeVsExpenses")}
					</CardTitle>
					<p className="text-sm text-muted-foreground">
						{selectedMonth
							? t("dashboard.chart.monthlyOverview")
							: t("dashboard.chart.last30DaysOverview")}
					</p>
				</CardHeader>
				<CardContent>
					<ChartContainer config={chartConfig} className="h-[300px] w-full">
						<BarChart
							data={chartData}
							margin={{
								left: 0,
								right: 0,
								top: 0,
								bottom: 0,
							}}
							barCategoryGap={0}
						>
							<CartesianGrid vertical={false} />
							<XAxis
								dataKey="date"
								tickLine={false}
								axisLine={false}
								tickMargin={0}
								minTickGap={0}
								interval={isMobile ? 5 : 1}
								tickFormatter={(value) => {
									const date = new Date(value);
									return date.toLocaleDateString("en-US", {
										month: "short",
										day: "numeric",
									});
								}}
							/>
							<ReferenceLine
								y={0}
								stroke="hsl(var(--border))"
								strokeDasharray="3 3"
							/>
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
											`${getCurrencySymbol(displayCurrency)} ${Math.abs(Number(value)).toLocaleString()}`,
											name === "expenses"
												? "Expenses"
												: name === "income"
													? "Income"
													: "Net",
										]}
									/>
								}
							/>
							<Bar dataKey="income" fill="var(--primary)" name="Income" />
							<Bar
								dataKey="expenses"
								fill="var(--destructive)"
								name="Expenses"
							/>
						</BarChart>
					</ChartContainer>
				</CardContent>
			</Card>
		</div>
	);
}
