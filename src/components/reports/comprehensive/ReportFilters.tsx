import { Calendar, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { useLocationContext } from "@/context/location-context";
import { useTenant } from "@/hooks/use-tenant";
import { getAvailableCurrencies } from "@/utils/currency";

interface ReportFiltersProps {
	dateFrom: string;
	setDateFrom: (date: string) => void;
	dateTo: string;
	setDateTo: (date: string) => void;
	baseCurrency: string;
	setBaseCurrency: (currency: string) => void;
	onRefresh: () => void;
	onExport: () => void;
}

export function ReportFilters({
	dateFrom,
	setDateFrom,
	dateTo,
	setDateTo,
	baseCurrency,
	setBaseCurrency,
	onRefresh,
	onExport,
}: ReportFiltersProps) {
	const { t } = useTranslation();
	const { tenant } = useTenant();
	const { selectedLocation } = useLocationContext();
	const [availableCurrencies, setAvailableCurrencies] = useState<string[]>([]);

	const fetchAvailableCurrencies = useCallback(async () => {
		if (!tenant?.id || !selectedLocation) return;

		try {
			const currencies = await getAvailableCurrencies(
				tenant.id,
				selectedLocation,
			);
			setAvailableCurrencies(currencies);
			// Set default currency to LKR if available, otherwise use the first available currency
			if (currencies.length > 0 && !currencies.includes(baseCurrency)) {
				setBaseCurrency(currencies.includes("LKR") ? "LKR" : currencies[0]);
			}
		} catch (error) {
			console.error("Error fetching available currencies:", error);
			setAvailableCurrencies(["LKR", "USD"]); // Fallback currencies
		}
	}, [baseCurrency, setBaseCurrency, tenant?.id, selectedLocation]);

	useEffect(() => {
		fetchAvailableCurrencies();
	}, [fetchAvailableCurrencies]);

	return (
		<Card className="px-4 sm:px-6 md:px-8">
			<CardHeader className="px-0 sm:px-2 md:px-4">
				<CardTitle className="text-base md:text-lg lg:text-xl flex items-center gap-2 font-semibold">
					<Calendar className="size-5" />
					{t("reports.comprehensive.filters.title")}
				</CardTitle>
			</CardHeader>
			<CardContent className="px-0 sm:px-2 md:px-4">
				<div className="grid grid-cols-1 md:grid-cols-4 gap-2">
					<div>
						<Label htmlFor="currency">
							{t("reports.comprehensive.filters.currency")}
						</Label>
						<Select value={baseCurrency} onValueChange={setBaseCurrency}>
							<SelectTrigger>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{availableCurrencies.map((currency) => (
									<SelectItem key={currency} value={currency}>
										{currency}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
					<div>
						<Label htmlFor="date_from">
							{t("reports.comprehensive.filters.fromDate")}
						</Label>
						<Input
							id="date_from"
							type="date"
							value={dateFrom}
							onChange={(e) => setDateFrom(e.target.value)}
						/>
					</div>
					<div>
						<Label htmlFor="date_to">
							{t("reports.comprehensive.filters.toDate")}
						</Label>
						<Input
							id="date_to"
							type="date"
							value={dateTo}
							onChange={(e) => setDateTo(e.target.value)}
						/>
					</div>
					<div className="flex items-end gap-2">
						<Button onClick={onExport} variant="outline">
							{t("reports.comprehensive.buttons.export")}
						</Button>
					</div>
				</div>
			</CardContent>
		</Card>
	);
}
