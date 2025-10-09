import { ArrowDownCircle, ArrowUpCircle, TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { SummaryCardsSkeleton } from "@/components/skeleton/summary-cards-skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/context/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";

type Location = Tables<"locations">;

interface SummaryCardsProps {
	selectedLocation: string;
	selectedMonth: string;
	locations: Location[];
}

export function SummaryCards({
	selectedLocation,
	selectedMonth,
	locations,
}: SummaryCardsProps) {
	const [loading, setLoading] = useState(true);
	const [todayIncome, setTodayIncome] = useState(0);
	const [todayExpenses, setTodayExpenses] = useState(0);
	const [weeklyIncome, setWeeklyIncome] = useState(0);
	const [weeklyExpenses, setWeeklyExpenses] = useState(0);
	const { tenant } = useAuth();
	const { t } = useTranslation();

	useEffect(() => {
		const fetchSummaryData = async () => {
			if (!tenant?.id) {
				setLoading(false);
				return;
			}

			try {
				// Set date filters based on selected month
				const today = new Date().toISOString().split("T")[0];
				const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
					.toISOString()
					.split("T")[0];

				let monthStart = "";
				let monthEnd = "";
				if (selectedMonth) {
					const [year, month] = selectedMonth.split("-");
					monthStart = `${year}-${month}-01`;
					const nextMonth = new Date(parseInt(year), parseInt(month), 1);
					monthEnd = nextMonth.toISOString().split("T")[0];
				}

				// Get locations for the tenant first to filter by tenant
				const { data: tenantLocations } = await supabase
					.from("locations")
					.select("id")
					.eq("tenant_id", tenant.id)
					.eq("is_active", true);

				const tenantLocationIds = tenantLocations?.map((loc) => loc.id) || [];

				if (tenantLocationIds.length === 0) {
					setTodayIncome(0);
					setTodayExpenses(0);
					setWeeklyIncome(0);
					setWeeklyExpenses(0);
					setLoading(false);
					return;
				}

				// Build query filters
				const locationFilter = !selectedLocation
					? {}
					: { location_id: selectedLocation };

				const [
					todayIncomeData,
					todayExpensesData,
					weeklyIncomeData,
					weeklyExpensesData,
				] = await Promise.all([
					selectedMonth
						? supabase
								.from("income")
								.select("amount")
								.gte("date", monthStart)
								.lt("date", monthEnd)
								.in("location_id", tenantLocationIds)
								.match(locationFilter)
						: supabase
								.from("income")
								.select("amount")
								.eq("date", today)
								.in("location_id", tenantLocationIds)
								.match(locationFilter),
					selectedMonth
						? supabase
								.from("expenses")
								.select("amount")
								.gte("date", monthStart)
								.lt("date", monthEnd)
								.in("location_id", tenantLocationIds)
								.match(locationFilter)
						: supabase
								.from("expenses")
								.select("amount")
								.eq("date", today)
								.in("location_id", tenantLocationIds)
								.match(locationFilter),
					selectedMonth
						? supabase
								.from("income")
								.select("amount")
								.gte("date", monthStart)
								.lt("date", monthEnd)
								.in("location_id", tenantLocationIds)
								.match(locationFilter)
						: supabase
								.from("income")
								.select("amount")
								.gte("date", weekAgo)
								.in("location_id", tenantLocationIds)
								.match(locationFilter),
					selectedMonth
						? supabase
								.from("expenses")
								.select("amount")
								.gte("date", monthStart)
								.lt("date", monthEnd)
								.in("location_id", tenantLocationIds)
								.match(locationFilter)
						: supabase
								.from("expenses")
								.select("amount")
								.gte("date", weekAgo)
								.in("location_id", tenantLocationIds)
								.match(locationFilter),
				]);

				setTodayIncome(
					todayIncomeData.data?.reduce((sum, item) => sum + item.amount, 0) ||
						0,
				);
				setTodayExpenses(
					todayExpensesData.data?.reduce((sum, item) => sum + item.amount, 0) ||
						0,
				);
				setWeeklyIncome(
					weeklyIncomeData.data?.reduce((sum, item) => sum + item.amount, 0) ||
						0,
				);
				setWeeklyExpenses(
					weeklyExpensesData.data?.reduce(
						(sum, item) => sum + item.amount,
						0,
					) || 0,
				);
			} catch (error) {
				console.error("Error fetching summary data:", error);
			} finally {
				setLoading(false);
			}
		};

		fetchSummaryData();
	}, [selectedLocation, selectedMonth, tenant?.id]);

	if (loading) {
		return <SummaryCardsSkeleton />;
	}

	const profit = weeklyIncome - weeklyExpenses;
	const profitPercentage =
		weeklyIncome > 0 ? ((profit / weeklyIncome) * 100).toFixed(1) : "0";

	const locationName = locations.find((l) => l.id === selectedLocation)?.name;

	return (
		<div
			className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
			data-testid="financial-cards"
		>
			<Card className="bg-card border">
				<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
					<CardTitle className="text-sm font-medium text-muted-foreground">
						{selectedMonth
							? t("dashboard.summaryCards.monthlyIncome")
							: t("dashboard.summaryCards.todayIncome")}
					</CardTitle>
					<ArrowUpCircle className="size-4 text-success" />
				</CardHeader>
				<CardContent>
					<div className="text-xl lg:text-2xl font-bold text-success">
						Rs. {(selectedMonth ? weeklyIncome : todayIncome).toLocaleString()}
					</div>
					<p className="text-xs text-muted-foreground">{locationName}</p>
				</CardContent>
			</Card>

			<Card className="bg-card border">
				<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
					<CardTitle className="text-sm font-medium text-muted-foreground">
						{selectedMonth
							? t("dashboard.summaryCards.monthlyExpenses")
							: t("dashboard.summaryCards.todayExpenses")}
					</CardTitle>
					<ArrowDownCircle className="size-4 text-destructive" />
				</CardHeader>
				<CardContent>
					<div className="text-xl lg:text-2xl font-bold text-destructive">
						Rs.{" "}
						{(selectedMonth ? weeklyExpenses : todayExpenses).toLocaleString()}
					</div>
					<p className="text-xs text-muted-foreground">{locationName}</p>
				</CardContent>
			</Card>

			<Card className="bg-card border">
				<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
					<CardTitle className="text-sm font-medium text-muted-foreground">
						{selectedMonth
							? t("dashboard.summaryCards.monthlyProfit")
							: t("dashboard.summaryCards.weeklyProfit")}
					</CardTitle>
					<TrendingUp className="size-4 text-primary" />
				</CardHeader>
				<CardContent>
					<div className="text-xl lg:text-2xl font-bold text-primary">
						Rs. {profit.toLocaleString()}
					</div>
					<p className="text-xs text-muted-foreground">
						{profitPercentage}% {t("dashboard.summaryCards.margin")}
					</p>
				</CardContent>
			</Card>
		</div>
	);
}
