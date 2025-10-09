import * as React from "react";
import {
	Bar,
	BarChart,
	CartesianGrid,
	ReferenceLine,
	ResponsiveContainer,
	XAxis,
	YAxis,
} from "recharts";
import {
	ChartConfig,
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
} from "@/components/ui/chart";
import { useIsMobile } from "@/hooks/use-mobile";
import {
	ChartDataPoint,
	useAvailableCurrencies,
} from "@/hooks/use-financial-chart-data";

interface FinancialChartContainerProps {
	data: ChartDataPoint[];
	selectedCurrency: string;
}

const chartConfig = {
	income: {
		label: "Income",
		color: "hsl(142 76% 36%)", // Green color for income
	},
	expenses: {
		label: "Expenses",
		color: "hsl(0 84% 60%)", // Red color for expenses
	},
} satisfies ChartConfig;

export function FinancialChartContainer({
	data,
	selectedCurrency,
}: FinancialChartContainerProps) {
	const { data: currencies } = useAvailableCurrencies();
	const currencySymbol =
		currencies?.find((c) => c.value === selectedCurrency)?.symbol || "";

	// Transform data to make expenses negative for better visualization
	const transformedData = React.useMemo(() => {
		return data.map((item) => ({
			...item,
			expenses: -Math.abs(item.expenses), // Make expenses negative
			net: item.income - item.expenses, // Calculate net
		}));
	}, [data]);

	const isMobile = useIsMobile();

	return (
		<div className="flex-1 flex items-center mt-8 px-4 border-t pt-4 justify-center min-h-0">
			<ChartContainer config={chartConfig} className="h-[300px] w-full">
				<ResponsiveContainer width="100%" height="100%">
					<BarChart data={transformedData}>
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
						{/* Zero reference line */}
						<ReferenceLine
							y={0}
							stroke="hsl(var(--muted-foreground))"
							strokeDasharray="2 2"
							strokeWidth={1}
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
									formatter={(value, name) => {
										const absValue = Math.abs(Number(value));
										const label =
											chartConfig[name as keyof typeof chartConfig]?.label ||
											name;
										return [
											`${currencySymbol}${absValue.toLocaleString(undefined, {
												minimumFractionDigits: 2,
												maximumFractionDigits: 2,
											})}`,
											label,
										];
									}}
								/>
							}
						/>
						{/* Income bars (positive) */}
						<Bar
							dataKey="income"
							fill={chartConfig.income.color}
							radius={[2, 2, 0, 0]}
						/>
						{/* Expense bars (negative) */}
						<Bar
							dataKey="expenses"
							fill={chartConfig.expenses.color}
							radius={[2, 2, 0, 0]}
						/>
					</BarChart>
				</ResponsiveContainer>
			</ChartContainer>
		</div>
	);
}
