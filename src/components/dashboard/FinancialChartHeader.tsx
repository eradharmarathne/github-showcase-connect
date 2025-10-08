import * as React from "react";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
	type CurrencyOption,
	useAvailableCurrencies,
} from "@/hooks/useFinancialChartData";

interface FinancialChartHeaderProps {
	selectedCurrency: string;
	onCurrencyChange: (currency: string) => void;
	totals: {
		income: number;
		expenses: number;
	};
}

export function FinancialChartHeader({
	selectedCurrency,
	onCurrencyChange,
	totals,
}: FinancialChartHeaderProps) {
	const { data: currencies, isLoading: currenciesLoading } =
		useAvailableCurrencies();

	const selectedCurrencyData = currencies?.find(
		(c) => c.value === selectedCurrency,
	);

	return (
		<div className="flex flex-col items-stretch border-b pb-4 mb-4 sm:flex-row">
			<div className="flex flex-1 flex-col justify-center gap-1">
				<h3 className="text-lg font-semibold">Income vs Expenses</h3>
				<p className="text-sm text-muted-foreground">
					Financial overview for the current month
				</p>
			</div>
			<div className="flex flex-col sm:flex-row gap-4 mt-4 sm:mt-0">
				<div className="flex items-center gap-2">
					<label htmlFor="currency-select" className="text-sm font-medium">
						Currency:
					</label>
					{currenciesLoading ? (
						<Skeleton className="h-10 w-[180px]" />
					) : (
						<Select value={selectedCurrency} onValueChange={onCurrencyChange}>
							<SelectTrigger id="currency-select" className="w-[180px]">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{currencies?.map((currency) => (
									<SelectItem key={currency.value} value={currency.value}>
										{currency.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					)}
				</div>
			</div>
		</div>
	);
}
