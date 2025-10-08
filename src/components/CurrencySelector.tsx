import { DollarSign, ExternalLink } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { useLocationContext } from "@/context/LocationContext";
import { useTenant } from "@/hooks/useTenant";
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

	useEffect(() => {
		const loadCurrencies = async () => {
			if (!tenant?.id || !selectedLocation) {
				setLoading(false);
				return;
			}

			try {
				const currencyDetails = await getCurrencyDetails(
					tenant.id,
					selectedLocation,
				);
				setCurrencies(currencyDetails);
			} catch (error) {
				console.error("Error loading currencies:", error);
			} finally {
				setLoading(false);
			}
		};

		loadCurrencies();
	}, [tenant?.id, selectedLocation]);

	const selectedCurrency = currencies.find((c) => c.currency_code === currency);

	const handleGoogleSearchClick = () => {
		if (currency && currency !== "USD") {
			const searchUrl = getCurrencyConversionSearchUrl(currency);
			window.open(searchUrl, "_blank");
		}
	};

	return (
		<div className="flex gap-2">
			<Select
				value={currency}
				onValueChange={onCurrencyChange}
				disabled={loading}
			>
				<SelectTrigger className="flex-1">
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
								{loading ? "Loading..." : "Select currency"}
							</span>
						)}
					</SelectValue>
				</SelectTrigger>
				<SelectContent className="z-50 bg-background border">
					{currencies.map((curr) => (
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

			{showGoogleSearchLink && currency && currency !== "USD" && (
				<Button
					type="button"
					variant="outline"
					size="sm"
					onClick={handleGoogleSearchClick}
					className="px-3"
					title={`Search USD to ${currency} conversion rate`}
				>
					<ExternalLink className="size-4" />
				</Button>
			)}
		</div>
	);
};
