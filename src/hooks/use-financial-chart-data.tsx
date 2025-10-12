import { useQuery } from "@tanstack/react-query";
import { eachDayOfInterval, endOfMonth, format, startOfMonth } from "date-fns";
import { useAuth } from "@/context/auth-context";
import { useLocationContext } from "@/context/location-context";
import { supabase } from "@/integrations/supabase/client";
import { convertCurrency } from "@/utils/currency";

export interface ChartDataPoint {
	date: string;
	income: number;
	expenses: number;
}

export interface ChartTotals {
	income: number;
	expenses: number;
}

export interface CurrencyOption {
	value: string;
	label: string;
	symbol: string;
}

export interface UseFinancialChartDataProps {
	currency: string;
	period: "daily" | "monthly";
	startDate?: Date;
	endDate?: Date;
}

export function useFinancialChartData({
	currency,
	period = "daily",
	startDate = startOfMonth(new Date()),
	endDate = endOfMonth(new Date()),
}: UseFinancialChartDataProps) {
	const { tenant } = useAuth();
	const { selectedLocation } = useLocationContext();

	return useQuery({
		queryKey: [
			"financial-chart-data",
			tenant?.id,
			selectedLocation,
			currency,
			period,
			startDate,
			endDate,
		],
		queryFn: async (): Promise<{
			data: ChartDataPoint[];
			totals: ChartTotals;
		}> => {
			if (!tenant?.id || !selectedLocation) {
				throw new Error("Tenant or location not available");
			}

			// Generate date range
			const dateRange = eachDayOfInterval({ start: startDate, end: endDate });

			console.log(
				"Chart date range:",
				format(startDate, "yyyy-MM-dd"),
				"to",
				format(endDate, "yyyy-MM-dd"),
			);

			// Fetch income data
			const { data: incomeData, error: incomeError } = await supabase
				.from("income")
				.select("amount, currency, date")
				.eq("tenant_id", tenant.id)
				.eq("location_id", selectedLocation)
				.gte("date", format(startDate, "yyyy-MM-dd"))
				.lte("date", format(endDate, "yyyy-MM-dd"))
				.order("date");

			if (incomeError) throw incomeError;

			// Fetch expense data
			const { data: expenseData, error: expenseError } = await supabase
				.from("expenses")
				.select("amount, currency, date")
				.eq("tenant_id", tenant.id)
				.eq("location_id", selectedLocation)
				.gte("date", format(startDate, "yyyy-MM-dd"))
				.lte("date", format(endDate, "yyyy-MM-dd"))
				.order("date");

			if (expenseError) throw expenseError;

			console.log("Fetched income:", incomeData?.length, "items");
			console.log(
				"Fetched expenses:",
				expenseData?.length,
				"items",
				expenseData,
			);

			// Convert currencies and group by date
			const chartData: ChartDataPoint[] = [];
			let totalIncome = 0;
			let totalExpenses = 0;

			for (const date of dateRange) {
				const dateStr = format(date, "yyyy-MM-dd");

				// Calculate income for this date
				let dayIncome = 0;
				const incomeForDate =
					incomeData?.filter((item) => item.date === dateStr) || [];

				for (const item of incomeForDate) {
					const converted = await convertCurrency(
						item.amount,
						item.currency,
						currency,
						tenant.id,
						selectedLocation,
					);
					dayIncome += converted;
				}

				// Calculate expenses for this date
				let dayExpenses = 0;
				const expensesForDate =
					expenseData?.filter((item) => item.date === dateStr) || [];

				if (expensesForDate.length > 0) {
					console.log(
						`Date ${dateStr}: found ${expensesForDate.length} expenses`,
						expensesForDate,
					);
				}

				for (const item of expensesForDate) {
					const converted = await convertCurrency(
						item.amount,
						item.currency,
						currency,
						tenant.id,
						selectedLocation,
					);
					dayExpenses += converted;
				}

				chartData.push({
					date: dateStr,
					income: dayIncome,
					expenses: dayExpenses,
				});

				totalIncome += dayIncome;
				totalExpenses += dayExpenses;
			}

			return {
				data: chartData,
				totals: {
					income: totalIncome,
					expenses: totalExpenses,
				},
			};
		},
		enabled: !!tenant?.id && !!selectedLocation,
		staleTime: 5 * 60 * 1000, // 5 minutes
	});
}

// Hook to fetch available currencies from database
export function useAvailableCurrencies() {
	const { tenant } = useAuth();
	const { selectedLocation } = useLocationContext();

	return useQuery({
		queryKey: ["available-currencies", tenant?.id, selectedLocation],
		queryFn: async (): Promise<CurrencyOption[]> => {
			if (!tenant?.id || !selectedLocation) {
				throw new Error("Tenant or location not available");
			}

			// Fetch distinct currencies from both income and expenses tables
			const { data: incomeData, error: incomeError } = await supabase
				.from("income")
				.select("currency")
				.eq("tenant_id", tenant.id)
				.eq("location_id", selectedLocation);

			if (incomeError) throw incomeError;

			const { data: expenseData, error: expenseError } = await supabase
				.from("expenses")
				.select("currency")
				.eq("tenant_id", tenant.id)
				.eq("location_id", selectedLocation);

			if (expenseError) throw expenseError;

			// Get unique currencies
			const allCurrencies = [
				...new Set([
					...(incomeData?.map((item) => item.currency) || []),
					...(expenseData?.map((item) => item.currency) || []),
				]),
			];

			// Map to currency options with symbols
			const currencyMap: Record<string, CurrencyOption> = {
				LKR: { value: "LKR", label: "LKR - Sri Lankan Rupee", symbol: "Rs" },
				USD: { value: "USD", label: "USD - US Dollar", symbol: "$" },
				EUR: { value: "EUR", label: "EUR - Euro", symbol: "€" },
				GBP: { value: "GBP", label: "GBP - British Pound", symbol: "£" },
			};

			const availableCurrencies = allCurrencies
				.map((currency) => currencyMap[currency])
				.filter(Boolean);

			// Always include USD as fallback if no currencies found
			if (availableCurrencies.length === 0) {
				return [currencyMap["USD"]];
			}

			return availableCurrencies;
		},
		enabled: !!tenant?.id && !!selectedLocation,
		staleTime: 10 * 60 * 1000, // 10 minutes
	});
}
