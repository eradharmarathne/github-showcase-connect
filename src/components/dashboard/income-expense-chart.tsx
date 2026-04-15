import {
	ArrowDownCircle,
	ArrowUpCircle,
	BedDouble,
	Receipt,
	TrendingUp,
} from "lucide-react";
import { memo, useEffect, useState } from "react";
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
import { logger } from "@/lib/logger";
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

function IncomeExpenseChartComponent({
	selectedLocation,
	selectedMonth,
	locations,
}: IncomeExpenseChartProps) {
	const [loading, setLoading] = useState(true);
	const [chartData, setChartData] = useState<ChartData[]>([]);
	const [todayIncome, setTodayIncome] = useState(0);
	const [todayReservationIncome, setTodayReservationIncome] = useState(0);
	const [todayOtherIncome, setTodayOtherIncome] = useState(0);
	const [todayExpenses, setTodayExpenses] = useState(0);
	const [weeklyProfit, setWeeklyProfit] = useState(0);
	const [profitMargin, setProfitMargin] = useState(0);
	const { tenant } = useAuth();
	const { t } = useTranslation();
	const displayCurrency = getDisplayCurrency();
	const isMobile = useIsMobile();

	useEffect(() => {
		const fetchFinancialData = async () => {
			if (!tenant?.id) {
				setLoading(false);
				return;
			}

			try {
				const { data: tenantLocations } = await supabase
					.from("locations")
					.select("id")
					.eq("tenant_id", tenant.id)
					.eq("is_active", true);

				const tenantLocationIds = tenantLocations?.map((loc) => loc.id) || [];

				if (tenantLocationIds.length === 0) {
					setChartData([]);
					setTodayIncome(0);
					setTodayReservationIncome(0);
					setTodayOtherIncome(0);
					setTodayExpenses(0);
					setWeeklyProfit(0);
					setProfitMargin(0);
					setLoading(false);
					return;
				}

				const endDate = new Date();
				const startDate = selectedMonth
					? new Date(selectedMonth + "-01")
					: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

				if (selectedMonth) {
					const [year, month] = selectedMonth.split("-");
					endDate.setFullYear(parseInt(year), parseInt(month), 0);
				}

				const dateRange: string[] = [];
				const currentDate = new Date(startDate);
				while (currentDate <= endDate) {
					dateRange.push(currentDate.toISOString().split("T")[0]);
					currentDate.setDate(currentDate.getDate() + 1);
				}

				const startDateStr = startDate.toISOString().split("T")[0];
				const endDateStr = endDate.toISOString().split("T")[0];

				const locationFilter = !selectedLocation
					? {}
					: { location_id: selectedLocation };

				// Build payments query with location filter via reservations join
				let paymentsQuery = supabase
					.from("payments")
					.select(
						"created_at, amount, currency, reservations!inner(location_id, tenant_id)",
					)
					.eq("reservations.tenant_id", tenant.id)
					.gte("created_at", `${startDateStr}T00:00:00`)
					.lte("created_at", `${endDateStr}T23:59:59`);

				if (selectedLocation) {
					paymentsQuery = paymentsQuery.eq(
						"reservations.location_id",
						selectedLocation,
					);
				} else {
					paymentsQuery = paymentsQuery.in(
						"reservations.location_id",
						tenantLocationIds,
					);
				}

				const [otherIncomeData, reservationPaymentsData, expensesData] =
					await Promise.all([
						// Other income (exclude type='booking' to avoid double-counting)
						supabase
							.from("income")
							.select("date, amount, currency")
							.neq("type", "booking")
							.gte("date", startDateStr)
							.lte("date", endDateStr)
							.in("location_id", tenantLocationIds)
							.match(locationFilter),
						// Reservation payments
						paymentsQuery,
						// Expenses (unchanged)
						supabase
							.from("expenses")
							.select("date, amount, currency")
							.gte("date", startDateStr)
							.lte("date", endDateStr)
							.in("location_id", tenantLocationIds)
							.match(locationFilter),
					]);

				// Build per-day maps for reservation payments (keyed by date extracted from created_at)
				const paymentsByDate = new Map<
					string,
					{ amount: number; currency: string | null }[]
				>();
				for (const payment of reservationPaymentsData.data || []) {
					const paymentDate = payment.created_at.split("T")[0];
					if (!paymentsByDate.has(paymentDate)) {
						paymentsByDate.set(paymentDate, []);
					}
					paymentsByDate.get(paymentDate)!.push(payment);
				}

				// Track per-day breakdown for summary cards
				const dailyReservationIncome = new Map<string, number>();
				const dailyOtherIncome = new Map<string, number>();

				const processedData: ChartData[] = await Promise.all(
					dateRange.map(async (date) => {
						const dayOtherIncome =
							otherIncomeData.data?.filter((item) => item.date === date) || [];
						const dayPayments = paymentsByDate.get(date) || [];
						const dayExpenses =
							expensesData.data?.filter((item) => item.date === date) || [];

						let reservationIncomeTotal = 0;
						let otherIncomeTotal = 0;
						let totalExpenses = 0;

						for (const payment of dayPayments) {
							try {
								const convertedAmount = await convertCurrency(
									payment.amount,
									payment.currency || "LKR",
									displayCurrency,
									tenant.id,
									selectedLocation,
								);
								reservationIncomeTotal += convertedAmount;
							} catch (error) {
								logger.error(
									`Error converting payment currency for date ${date}`,
									error,
								);
								reservationIncomeTotal += payment.amount;
							}
						}

						for (const income of dayOtherIncome) {
							try {
								const convertedAmount = await convertCurrency(
									income.amount,
									income.currency || "LKR",
									displayCurrency,
									tenant.id,
									selectedLocation,
								);
								otherIncomeTotal += convertedAmount;
							} catch (error) {
								logger.error(
									`Error converting income currency for date ${date}`,
									error,
								);
								otherIncomeTotal += income.amount;
							}
						}

						for (const expense of dayExpenses) {
							try {
								const convertedAmount = await convertCurrency(
									expense.amount,
									expense.currency || "LKR",
									displayCurrency,
									tenant.id,
									selectedLocation,
								);
								totalExpenses += convertedAmount;
							} catch (error) {
								logger.error(
									`Error converting expense currency for date ${date}`,
									error,
								);
								totalExpenses += expense.amount;
							}
						}

						const totalIncome = reservationIncomeTotal + otherIncomeTotal;
						dailyReservationIncome.set(date, reservationIncomeTotal);
						dailyOtherIncome.set(date, otherIncomeTotal);

						return {
							date,
							income: totalIncome,
							expenses: -totalExpenses,
							net: totalIncome - totalExpenses,
						};
					}),
				);
				setChartData(processedData);

				const today = new Date().toISOString().split("T")[0];
				const todayData = processedData.find((item) => item.date === today);
				setTodayIncome(todayData?.income || 0);
				setTodayReservationIncome(dailyReservationIncome.get(today) || 0);
				setTodayOtherIncome(dailyOtherIncome.get(today) || 0);
				setTodayExpenses(Math.abs(todayData?.expenses || 0));

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
				logger.error("Error fetching financial data", error);
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
			<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
				<Card className="bg-card border">
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-3 px-3">
						<CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">
							{selectedMonth
								? t("dashboard.summaryCards.monthlyTotalIncome")
								: t("dashboard.summaryCards.totalIncome")}
						</CardTitle>
						<ArrowUpCircle className="size-4 text-success" />
					</CardHeader>
					<CardContent className="px-3 pb-3">
						<div className="text-lg lg:text-xl font-bold text-success">
							{formatAmountWithSymbol(todayIncome, displayCurrency)}
						</div>
						<p className="text-[10px] text-muted-foreground">{locationName}</p>
					</CardContent>
				</Card>

				<Card className="bg-card border">
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-3 px-3">
						<CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">
							{selectedMonth
								? t("dashboard.summaryCards.monthlyReservationIncome")
								: t("dashboard.summaryCards.reservationIncome")}
						</CardTitle>
						<BedDouble className="size-4 text-primary" />
					</CardHeader>
					<CardContent className="px-3 pb-3">
						<div className="text-lg lg:text-xl font-bold text-primary">
							{formatAmountWithSymbol(
								todayReservationIncome,
								displayCurrency,
							)}
						</div>
						<p className="text-[10px] text-muted-foreground">{locationName}</p>
					</CardContent>
				</Card>

				<Card className="bg-card border">
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-3 px-3">
						<CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">
							{selectedMonth
								? t("dashboard.summaryCards.monthlyOtherIncome")
								: t("dashboard.summaryCards.otherIncome")}
						</CardTitle>
						<Receipt className="size-4 text-cyan-600" />
					</CardHeader>
					<CardContent className="px-3 pb-3">
						<div className="text-lg lg:text-xl font-bold text-cyan-600">
							{formatAmountWithSymbol(todayOtherIncome, displayCurrency)}
						</div>
						<p className="text-[10px] text-muted-foreground">{locationName}</p>
					</CardContent>
				</Card>

				<Card className="bg-card border">
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-3 px-3">
						<CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">
							{selectedMonth
								? t("dashboard.summaryCards.monthlyExpenses")
								: t("dashboard.summaryCards.todayExpenses")}
						</CardTitle>
						<ArrowDownCircle className="size-4 text-destructive" />
					</CardHeader>
					<CardContent className="px-3 pb-3">
						<div className="text-lg lg:text-xl font-bold text-destructive">
							{formatAmountWithSymbol(todayExpenses, displayCurrency)}
						</div>
						<p className="text-[10px] text-muted-foreground">{locationName}</p>
					</CardContent>
				</Card>

				<Card className="bg-card border">
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-3 px-3">
						<CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">
							{t("dashboard.summaryCards.weeklyProfit")}
						</CardTitle>
						<TrendingUp className="size-4 text-primary" />
					</CardHeader>
					<CardContent className="px-3 pb-3">
						<div className="text-lg lg:text-xl font-bold text-primary">
							{formatAmountWithSymbol(weeklyProfit, displayCurrency)}
						</div>
						<p className="text-[10px] text-muted-foreground">
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

export const IncomeExpenseChart = memo(IncomeExpenseChartComponent);
