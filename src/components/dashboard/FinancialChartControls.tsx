import * as React from "react";
import { useAvailableCurrencies } from "@/hooks/useFinancialChartData";

interface FinancialChartControlsProps {
	activeChart: "income" | "expenses";
	onActiveChartChange: (chart: "income" | "expenses") => void;
	totals: {
		income: number;
		expenses: number;
	};
	selectedCurrency: string;
}

export function FinancialChartControls({
	activeChart,
	onActiveChartChange,
	totals,
	selectedCurrency,
}: FinancialChartControlsProps) {
	const { data: currencies } = useAvailableCurrencies();
	const currencySymbol =
		currencies?.find((c) => c.value === selectedCurrency)?.symbol || "";

	const chartTypes = [
		{
			key: "income" as const,
			label: "Income",
			value: totals.income,
			color: "text-green-600",
		},
		{
			key: "expenses" as const,
			label: "Expenses",
			value: totals.expenses,
			color: "text-red-600",
		},
	];

	return (
		<div className="flex mt-4 sm:mt-0">
			{chartTypes.map((chart) => (
				<button
					key={chart.key}
					data-active={activeChart === chart.key}
					className="data-[active=true]:bg-muted/50 flex flex-1 flex-col justify-center gap-1 border-t px-6 py-4 text-left even:border-l sm:border-t-0 sm:border-l sm:px-8 sm:py-6 hover:bg-muted/30 transition-colors"
					onClick={() => onActiveChartChange(chart.key)}
				>
					<span className="text-muted-foreground text-xs">{chart.label}</span>
					<span
						className={`text-lg leading-none font-bold sm:text-3xl ${chart.color}`}
					>
						{currencySymbol}
						{chart.value.toLocaleString(undefined, {
							minimumFractionDigits: 2,
							maximumFractionDigits: 2,
						})}
					</span>
				</button>
			))}
		</div>
	);
}
