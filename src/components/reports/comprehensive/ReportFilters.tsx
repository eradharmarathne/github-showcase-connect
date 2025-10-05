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
import { useTenant } from "@/hooks/useTenant";
import { supabase } from "@/integrations/supabase/client";
import { getAvailableCurrencies } from "@/utils/currency";

interface ReportFiltersProps {
	selectedLocation: string;
	setSelectedLocation: (location: string) => void;
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
	selectedLocation,
	setSelectedLocation,
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
	const [locations, setLocations] = useState<any[]>([]);
	const [availableCurrencies, setAvailableCurrencies] = useState<string[]>([]);

	const fetchLocations = useCallback(async () => {
		if (!tenant?.id) return;

		try {
			const { data, error } = await supabase
				.from("locations")
				.select("*")
				.eq("tenant_id", tenant.id)
				.eq("is_active", true);

			if (error) throw error;
			setLocations(data || []);

			// Auto-select first location if none selected
			if (data && data.length > 0 && !selectedLocation) {
				setSelectedLocation(data[0].id);
			}
		} catch (error) {
			console.error("Error fetching locations:", error);
		}
	}, [tenant?.id, selectedLocation, setSelectedLocation]);

	const fetchAvailableCurrencies = useCallback(async () => {
		try {
			const currencies = await getAvailableCurrencies();
			setAvailableCurrencies(currencies);
			// Set default currency to LKR if available, otherwise use the first available currency
			if (currencies.length > 0 && !currencies.includes(baseCurrency)) {
				setBaseCurrency(currencies.includes("LKR") ? "LKR" : currencies[0]);
			}
		} catch (error) {
			console.error("Error fetching available currencies:", error);
			setAvailableCurrencies(["LKR", "USD"]); // Fallback currencies
		}
	}, [baseCurrency, setBaseCurrency]);

	useEffect(() => {
		fetchLocations();
		fetchAvailableCurrencies();
	}, [fetchLocations, fetchAvailableCurrencies]);

	return (
		<Card className="px-4">
			<CardHeader className="px-0 sm:px-2">
				<CardTitle className="flex items-center gap-2 text-lg sm:text-xl font-semibold">
					<Calendar className="size-5" />
					{t("reports.comprehensive.filters.title")}
				</CardTitle>
			</CardHeader>
			<CardContent className="px-0 sm:px-2">
				<div className="grid grid-cols-1 md:grid-cols-5 gap-2">
					<div>
						<Label htmlFor="location">
							{t("reports.comprehensive.filters.location")}
						</Label>
						<Select value={selectedLocation} onValueChange={setSelectedLocation}>
							<SelectTrigger>
								<SelectValue
									placeholder={t("reports.comprehensive.filters.selectLocation")}
								/>
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">All Locations</SelectItem>
								{locations.map((location) => (
									<SelectItem key={location.id} value={location.id}>
										{location.name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
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
						<Button onClick={onRefresh} className="flex-1">
							<RefreshCw className="size-4 mr-2" />
							{t("reports.comprehensive.buttons.refresh")}
						</Button>
						<Button onClick={onExport} variant="outline">
							{t("reports.comprehensive.buttons.export")}
						</Button>
					</div>
				</div>
			</CardContent>
		</Card>
	);
}