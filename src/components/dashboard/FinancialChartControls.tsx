import * as React from "react";
import { useAvailableCurrencies } from "@/hooks/useFinancialChartData";

interface FinancialChartControlsProps {
	totals: {
		income: number;
		expenses: number;
	};
	selectedCurrency: string;
}

export function FinancialChartControls({
	totals,
	selectedCurrency,
}: FinancialChartControlsProps) {
	const { data: currencies } = useAvailableCurrencies();
	const currencySymbol =
		currencies?.find((c) => c.value === selectedCurrency)?.symbol || "";

	const netProfit = totals.income - totals.expenses;

	const chartTypes = [
		{
			key: "income" as const,
			label: "Total Income",
			value: totals.income,
			color: "text-green-600",
		},
		{
			key: "expenses" as const,
			label: "Total Expenses",
			value: totals.expenses,
			color: "text-red-600",
		},
		{
			key: "net" as const,
			label: "Net Profit",
			value: netProfit,
			color: netProfit >= 0 ? "text-blue-600" : "text-orange-600",
		},
	];

	return (
		<div className="flex mt-4 sm:mt-0">
			{chartTypes.map((chart) => (
				<div
					key={chart.key}
					className="flex flex-1 flex-col justify-center gap-1 border-t px-6 py-4 text-center even:border-l sm:border-t-0 sm:border-l sm:px-8 sm:py-6"
				>
					<span className="text-muted-foreground text-xs">{chart.label}</span>
					<span
						className={`text-lg leading-none font-bold sm:text-3xl ${chart.color}`}
					>
						{currencySymbol}
						{Math.abs(chart.value).toLocaleString(undefined, {
							minimumFractionDigits: 2,
							maximumFractionDigits: 2,
						})}
					</span>
				</div>
			))}
		</div>
	);
}
