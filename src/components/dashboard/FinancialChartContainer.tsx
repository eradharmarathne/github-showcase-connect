import * as React from "react";
import {
	Bar,
	BarChart,
	CartesianGrid,
	ResponsiveContainer,
	XAxis,
} from "recharts";
import {
	ChartConfig,
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
} from "@/components/ui/chart";
import {
	ChartDataPoint,
	useAvailableCurrencies,
} from "@/hooks/useFinancialChartData";

interface FinancialChartContainerProps {
	data: ChartDataPoint[];
	activeChart: "income" | "expenses";
	selectedCurrency: string;
}

const chartConfig = {
	income: {
		label: "Income",
		color: "hsl(var(--chart-1))",
	},
	expenses: {
		label: "Expenses",
		color: "hsl(var(--chart-2))",
	},
} satisfies ChartConfig;

export function FinancialChartContainer({
	data,
	activeChart,
	selectedCurrency,
}: FinancialChartContainerProps) {
	const { data: currencies } = useAvailableCurrencies();
	const currencySymbol =
		currencies?.find((c) => c.value === selectedCurrency)?.symbol || "";

	return (
		<div className="flex-1 flex items-center justify-center min-h-0">
			<ChartContainer config={chartConfig} className="h-[300px] w-full">
				<ResponsiveContainer width="100%" height="100%">
					<BarChart
						data={data}
						margin={{
							left: 12,
							right: 12,
							top: 12,
							bottom: 12,
						}}
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
										`${currencySymbol}${Number(value).toLocaleString(
											undefined,
											{
												minimumFractionDigits: 2,
												maximumFractionDigits: 2,
											},
										)}`,
										chartConfig[name as keyof typeof chartConfig]?.label ||
											name,
									]}
								/>
							}
						/>
						<Bar
							dataKey={activeChart}
							fill={chartConfig[activeChart].color}
							radius={[4, 4, 0, 0]}
						/>
					</BarChart>
				</ResponsiveContainer>
			</ChartContainer>
		</div>
	);
}
