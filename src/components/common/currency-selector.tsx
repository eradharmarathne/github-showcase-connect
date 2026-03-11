import { ExternalLink } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { useLocationContext } from "@/context/location-context";
import { useTenant } from "@/hooks/use-tenant";
import type { CurrencyRate } from "@/utils/currency";
import {
	getCurrencyConversionSearchUrl,
	getCurrencyDetails,
} from "@/utils/currency";

interface CurrencySelectorProps {
	currency: string;
	onCurrencyChange: (currency: string) => void;
	label?: string;
	showGoogleSearchLink?: boolean;
}

export const CurrencySelector = ({
	currency,
	onCurrencyChange,
	label = "Currency",
	showGoogleSearchLink = false,
}: CurrencySelectorProps) => {
	const [currencies, setCurrencies] = useState<CurrencyRate[]>([]);
	const [loading, setLoading] = useState(true);
	const { tenant } = useTenant();
	const { selectedLocation } = useLocationContext();
	const normalizedCurrency = currency.trim().toUpperCase();
	const effectiveCurrency = normalizedCurrency || "USD";

	useEffect(() => {
		let isCancelled = false;

		const loadCurrencies = async () => {
			setLoading(true);

			if (!tenant?.id || !selectedLocation) {
				if (!isCancelled) {
					setCurrencies([]);
					setLoading(false);
				}
				return;
			}

			try {
				const currencyDetails = await getCurrencyDetails(
					tenant.id,
					selectedLocation,
				);
				if (!isCancelled) {
					setCurrencies(currencyDetails);
				}
			} catch (error) {
				console.error("Error loading currencies:", error);
				if (!isCancelled) {
					setCurrencies([]);
				}
			} finally {
				if (!isCancelled) {
					setLoading(false);
				}
			}
		};

		loadCurrencies();

		return () => {
			isCancelled = true;
		};
	}, [tenant?.id, selectedLocation]);

	const availableCurrencies = useMemo(() => {
		const currencyMap = new Map<string, CurrencyRate>();
		const now = new Date().toISOString();

		for (const entry of currencies) {
			currencyMap.set(entry.currency_code, entry);
		}

		if (normalizedCurrency && !currencyMap.has(normalizedCurrency)) {
			currencyMap.set(normalizedCurrency, {
				id: `selected-${normalizedCurrency}`,
				currency_code: normalizedCurrency,
				usd_rate: normalizedCurrency === "USD" ? 1 : 0,
				is_custom: false,
				tenant_id: tenant?.id || "",
				location_id: selectedLocation || "",
				updated_at: now,
				created_at: now,
			});
		}

		if (!currencyMap.has("USD")) {
			currencyMap.set("USD", {
				id: "fallback-usd",
				currency_code: "USD",
				usd_rate: 1,
				is_custom: false,
				tenant_id: tenant?.id || "",
				location_id: selectedLocation || "",
				updated_at: now,
				created_at: now,
			});
		}

		return Array.from(currencyMap.values()).sort((a, b) =>
			a.currency_code.localeCompare(b.currency_code),
		);
	}, [currencies, normalizedCurrency, tenant?.id, selectedLocation]);

	const selectedCurrency = availableCurrencies.find(
		(c) => c.currency_code === effectiveCurrency,
	);

	const handleGoogleSearchClick = () => {
		if (normalizedCurrency && normalizedCurrency !== "USD") {
			const searchUrl = getCurrencyConversionSearchUrl(normalizedCurrency);
			window.open(searchUrl, "_blank");
		}
	};

	return (
		<div className="flex gap-2">
			<Select
				value={effectiveCurrency}
				onValueChange={onCurrencyChange}
				disabled={loading && availableCurrencies.length === 0}
			>
				<SelectTrigger className="flex-1" aria-label={label}>
					<SelectValue>
						{selectedCurrency ? (
							<div className="flex items-center gap-2">
								<span className="font-medium">
									{selectedCurrency.currency_code}
								</span>
								<span className="text-muted-foreground text-sm hidden sm:flex">
									{selectedCurrency.currency_code === "USD"
										? "- US Dollar"
										: selectedCurrency.is_custom
											? "- Custom Currency"
											: ""}
								</span>
								{selectedCurrency.currency_code !== "USD" && (
									<span className="text-xs text-muted-foreground">
										(Rate: {selectedCurrency.usd_rate})
									</span>
								)}
							</div>
						) : (
							<span className="text-muted-foreground">
								{loading
									? "Loading..."
									: effectiveCurrency || "Select currency"}
							</span>
						)}
					</SelectValue>
				</SelectTrigger>
				<SelectContent className="z-50 bg-background border">
					{availableCurrencies.map((curr) => (
						<SelectItem key={curr.currency_code} value={curr.currency_code}>
							<div className="flex items-center gap-2">
								<span className="font-medium min-w-[48px]">
									{curr.currency_code}
								</span>
								<span className="text-muted-foreground flex-1">
									{curr.currency_code === "USD"
										? "US Dollar"
										: curr.is_custom
											? "Custom Currency"
											: curr.currency_code}
								</span>
								{curr.currency_code !== "USD" && (
									<span className="text-xs text-muted-foreground">
										Rate: {curr.usd_rate}
									</span>
								)}
							</div>
						</SelectItem>
					))}
				</SelectContent>
			</Select>

			{showGoogleSearchLink &&
				normalizedCurrency &&
				normalizedCurrency !== "USD" && (
					<Button
						type="button"
						variant="outline"
						size="sm"
						onClick={handleGoogleSearchClick}
						className="px-3"
						title={`Search USD to ${normalizedCurrency} conversion rate`}
					>
						<ExternalLink className="size-4" />
					</Button>
				)}
		</div>
	);
};
