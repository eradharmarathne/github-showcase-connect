import { AlertTriangle } from "lucide-react";
import * as React from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
	useAvailableCurrencies,
	useFinancialChartData,
} from "@/hooks/use-financial-chart-data";
import { FinancialChartContainer } from "./financial-chart-container";
import { FinancialChartControls } from "./financial-chart-controls";
import { FinancialChartHeader } from "./financial-chart-header";

export function FinancialChart() {
	const [selectedCurrency, setSelectedCurrency] = React.useState("USD");

	const { data: currencies } = useAvailableCurrencies();
	const {
		data: chartData,
		isLoading,
		error,
	} = useFinancialChartData({
		currency: selectedCurrency,
		period: "monthly",
	});

	// Auto-select first available currency when currencies load
	React.useEffect(() => {
		if (
			currencies &&
			currencies.length > 0 &&
			!currencies.find((c) => c.value === selectedCurrency)
		) {
			setSelectedCurrency(currencies[0].value);
		}
	}, [currencies, selectedCurrency]);

	if (isLoading) {
		return (
			<Card className="w-full">
				<CardContent className="p-6">
					<div className="space-y-4">
						<div className="flex justify-between items-center">
							<div className="space-y-2">
								<Skeleton className="h-6 w-48" />
								<Skeleton className="h-4 w-64" />
							</div>
							<Skeleton className="h-10 w-40" />
						</div>
						<div className="flex gap-4">
							<Skeleton className="h-20 flex-1" />
							<Skeleton className="h-20 flex-1" />
						</div>
						<Skeleton className="h-[300px] w-full" />
					</div>
				</CardContent>
			</Card>
		);
	}

	if (error) {
		return (
			<Card className="w-full">
				<CardContent className="p-6">
					<Alert variant="destructive">
						<AlertTriangle className="h-4 w-4" />
						<AlertDescription>
							Failed to load financial data. Please try again later.
						</AlertDescription>
					</Alert>
				</CardContent>
			</Card>
		);
	}

	if (!chartData) {
		return null;
	}

	return (
		<Card className="w-full">
			<CardContent className="p-0">
				<div className="w-full h-full flex flex-col">
					<FinancialChartHeader
						selectedCurrency={selectedCurrency}
						onCurrencyChange={setSelectedCurrency}
						totals={chartData.totals}
					/>

					<FinancialChartControls
						totals={chartData.totals}
						selectedCurrency={selectedCurrency}
					/>

					<FinancialChartContainer
						data={chartData.data}
						selectedCurrency={selectedCurrency}
					/>
				</div>
			</CardContent>
		</Card>
	);
}
