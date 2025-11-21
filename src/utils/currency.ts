import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import { logger } from "@/lib/logger";

// Updated type for dynamic currencies
export type Currency = string; // Now supports any currency code

export interface CurrencyRate {
	id: string;
	currency_code: string | null;
	usd_rate: number | null;
	is_custom: boolean | null;
	tenant_id: string;
	location_id: string;
	updated_at: string;
	created_at: string;
}

// Use the database type for compatibility
export type DatabaseCurrencyRate = Tables<"currency_rates">;

// Type for currency rates object (currency_code -> usd_rate)
export type CurrencyRates = Record<string, number>;

// Cache entry structure
interface CacheEntry {
	rates: CurrencyRates;
	timestamp: number;
}

// Tenant/location-specific cache for currency rates
// Key format: `${tenantId}-${locationId}`
const currencyRatesCache = new Map<string, CacheEntry>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

const getDefaultRates = (): CurrencyRates => {
	return {
		USD: 1,
	};
};

// Get all available currencies from database for a specific tenant and location
export const getAvailableCurrencies = async (
	tenantId: string,
	locationId: string,
): Promise<string[]> => {
	try {
		const { data, error } = await supabase
			.from("currency_rates")
			.select("currency_code")
			.eq("tenant_id", tenantId)
			.eq("location_id", locationId)
			.not("currency_code", "is", null)
			.order("currency_code");

		if (error) {
			logger.error("Error fetching currencies", error);
			return ["USD"];
		}

		return data?.map((item) => item.currency_code) || ["USD"];
	} catch (error) {
		logger.error("Error in getAvailableCurrencies", error);
		return ["USD"];
	}
};

export const getCurrencyRates = async (
	tenantId: string,
	locationId: string,
): Promise<CurrencyRates> => {
	// Use tenant/location specific cache key
	const cacheKey = `${tenantId}-${locationId}`;
	const now = Date.now();

	// Check cache first - verify it exists, is for this tenant/location, and is not expired
	const cachedEntry = currencyRatesCache.get(cacheKey);
	if (cachedEntry && now - cachedEntry.timestamp < CACHE_DURATION) {
		logger.debug("Returning cached currency rates", { cacheKey });
		return cachedEntry.rates;
	}

	try {
		const { data, error } = await supabase
			.from("currency_rates")
			.select("currency_code, usd_rate")
			.eq("tenant_id", tenantId)
			.eq("location_id", locationId)
			.not("currency_code", "is", null)
			.not("usd_rate", "is", null);

		if (error) {
			logger.error("Error fetching currency rates", error, {
				tenantId,
				locationId,
			});
			return getDefaultRates();
		}

		if (!data || data.length === 0) {
			logger.warn("No currency rates found in database for tenant/location", {
				tenantId,
				locationId,
			});
			return getDefaultRates();
		}

		// Convert database format to our rates object
		const rates: CurrencyRates = {};
		for (const rate of data) {
			if (rate.currency_code && rate.usd_rate !== null) {
				rates[rate.currency_code] = Number(rate.usd_rate);
			}
		}

		// Update cache for this specific tenant/location
		currencyRatesCache.set(cacheKey, {
			rates,
			timestamp: now,
		});

		logger.debug("Cached currency rates", {
			cacheKey,
			currencyCount: Object.keys(rates).length,
		});

		return rates;
	} catch (error) {
		logger.error("Error in getCurrencyRates", error, { tenantId, locationId });
		return getDefaultRates();
	}
};

export const convertCurrency = async (
	amount: number,
	fromCurrency: string,
	toCurrency: string,
	tenantId: string,
	locationId: string,
): Promise<number> => {
	// Validate inputs
	if (!tenantId || !locationId) {
		logger.error("Missing tenant_id or location_id for currency conversion", {
			fromCurrency,
			toCurrency,
			tenantId,
			locationId,
		});
		throw new Error(
			"Tenant ID and Location ID are required for currency conversion",
		);
	}

	if (!fromCurrency || !toCurrency) {
		logger.error("Missing currency codes for conversion", {
			fromCurrency,
			toCurrency,
			tenantId,
			locationId,
		});
		throw new Error("From currency and to currency are required");
	}

	if (typeof amount !== "number" || isNaN(amount) || !isFinite(amount)) {
		logger.error("Invalid amount for currency conversion", {
			amount,
			fromCurrency,
			toCurrency,
			tenantId,
			locationId,
		});
		throw new Error("Amount must be a valid number");
	}

	if (fromCurrency === toCurrency) {
		return amount;
	}

	try {
		const rates = await getCurrencyRates(tenantId, locationId);

		// Convert from source currency to USD first
		let usdAmount = amount;
		if (fromCurrency !== "USD") {
			const fromRate = rates[fromCurrency];
			if (!fromRate || fromRate <= 0) {
				logger.warn(
					`No valid rate found for ${fromCurrency}, returning original amount`,
					{ fromCurrency, toCurrency, tenantId, locationId, rate: fromRate },
				);
				return amount;
			}
			usdAmount = amount / fromRate;
		}

		// Convert from USD to target currency
		if (toCurrency === "USD") {
			return usdAmount;
		}

		const toRate = rates[toCurrency];
		if (!toRate || toRate <= 0) {
			logger.warn(
				`No valid rate found for ${toCurrency}, returning USD amount`,
				{ fromCurrency, toCurrency, tenantId, locationId, rate: toRate },
			);
			return usdAmount;
		}

		const convertedAmount = usdAmount * toRate;

		// Validate result
		if (!isFinite(convertedAmount)) {
			logger.error("Currency conversion resulted in invalid number", {
				fromCurrency,
				toCurrency,
				amount,
				convertedAmount,
				tenantId,
				locationId,
			});
			return amount; // Return original amount on error
		}

		return convertedAmount;
	} catch (error) {
		logger.error("Error converting currency", error, {
			fromCurrency,
			toCurrency,
			tenantId,
			locationId,
		});
		// Return original amount instead of throwing to prevent breaking the UI
		return amount;
	}
};

// Add a new custom currency
export const addCustomCurrency = async (
	currencyCode: string,
	usdRate: number,
	tenantId: string,
	locationId: string,
): Promise<{ success: boolean; error?: string }> => {
	try {
		// Validate currency code (3-5 uppercase letters)
		if (!/^[A-Z]{3,5}$/.test(currencyCode)) {
			return {
				success: false,
				error: "Currency code must be 3-5 uppercase letters",
			};
		}

		// Validate USD rate
		if (usdRate <= 0) {
			return { success: false, error: "USD rate must be greater than 0" };
		}

		const { error } = await supabase.from("currency_rates").upsert(
			{
				currency_code: currencyCode,
				usd_rate: usdRate,
				is_custom: true,
				tenant_id: tenantId,
				location_id: locationId,
			},
			{
				onConflict: "tenant_id,location_id,currency_code",
			},
		);

		if (error) {
			logger.error("Error adding custom currency", error, {
				currencyCode,
				tenantId,
				locationId,
			});
			return { success: false, error: error.message };
		}

		// Clear cache for this specific tenant/location to force refresh
		const cacheKey = `${tenantId}-${locationId}`;
		currencyRatesCache.delete(cacheKey);
		logger.debug("Cleared currency cache after adding currency", { cacheKey });

		return { success: true };
	} catch (error) {
		logger.error("Error in addCustomCurrency", error, {
			currencyCode,
			tenantId,
			locationId,
		});
		return { success: false, error: "Failed to add currency" };
	}
};

// Generate Google search URL for currency conversion
export const getCurrencyConversionSearchUrl = (
	currencyCode: string,
): string => {
	const query = `usd+to+${currencyCode.toLowerCase()}`;
	return `https://www.google.com/search?q=${query}`;
};

// Remove a custom currency
export async function removeCustomCurrency(
	currencyCode: string,
	tenantId: string,
	locationId: string,
): Promise<{ success: boolean; error?: string }> {
	try {
		if (currencyCode === "USD") {
			return { success: false, error: "Cannot remove USD base currency" };
		}

		const { error } = await supabase
			.from("currency_rates")
			.delete()
			.eq("currency_code", currencyCode)
			.eq("tenant_id", tenantId)
			.eq("location_id", locationId)
			.eq("is_custom", true);

		if (error) {
			logger.error("Error removing currency", error, {
				currencyCode,
				tenantId,
				locationId,
			});
			return { success: false, error: error.message };
		}

		// Clear cache for this specific tenant/location to force refresh
		const cacheKey = `${tenantId}-${locationId}`;
		currencyRatesCache.delete(cacheKey);
		logger.debug("Cleared currency cache after removing currency", {
			cacheKey,
		});

		return { success: true };
	} catch (error) {
		logger.error("Error in removeCustomCurrency", error, {
			currencyCode,
			tenantId,
			locationId,
		});
		return { success: false, error: "Failed to remove currency" };
	}
}

export function formatCurrency(amount: number, currency: string): string {
	// Try to format with the currency code, fallback to generic formatting
	try {
		const formatter = new Intl.NumberFormat("en-US", {
			style: "currency",
			currency: currency,
			minimumFractionDigits: 2,
			maximumFractionDigits: 2,
		});
		return formatter.format(amount);
	} catch (error) {
		// Fallback for unsupported currency codes
		return `${currency} ${amount.toFixed(2)}`;
	}
}

// Get currency symbol for a given currency code
export function getCurrencySymbol(currency: string): string {
	const symbols: Record<string, string> = {
		USD: "$", // US Dollar
		EUR: "€", // Euro
		GBP: "£", // British Pound
		LKR: "Rs.", // Sri Lankan Rupee
		INR: "₹", // Indian Rupee
		JPY: "¥", // Japanese Yen
		CNY: "¥", // Chinese Yuan
		AUD: "A$", // Australian Dollar
		CAD: "C$", // Canadian Dollar
		CHF: "CHF", // Swiss Franc
		SEK: "kr", // Swedish Krona
		NOK: "kr", // Norwegian Krone
		DKK: "kr", // Danish Krone
		RUB: "₽", // Russian Ruble
		KRW: "₩", // South Korean Won
		THB: "฿", // Thai Baht
		SGD: "S$", // Singapore Dollar
		HKD: "HK$", // Hong Kong Dollar
		NZD: "NZ$", // New Zealand Dollar
		ZAR: "R", // South African Rand
	};

	return symbols[currency.toUpperCase()] ?? currency;
}

// Get the display currency for a tenant (defaults to LKR for now, can be enhanced to read from tenant preferences)
export function getDisplayCurrency(): string {
	return "LKR"; // Default to Sri Lankan Rupee, can be made configurable later
}

// Format amount with currency symbol
export function formatAmountWithSymbol(
	amount: number,
	currency: string = "LKR",
): string {
	const symbol = getCurrencySymbol(currency);
	return `${symbol} ${amount.toLocaleString()}`;
}

// Update a currency rate
export async function updateCurrencyRate(
	currencyCode: string,
	usdRate: number,
	tenantId: string,
	locationId: string,
): Promise<{ success: boolean; error?: string }> {
	try {
		if (currencyCode === "USD") {
			return { success: false, error: "Cannot modify USD base currency rate" };
		}

		if (usdRate <= 0) {
			return { success: false, error: "USD rate must be greater than 0" };
		}

		const { error } = await supabase
			.from("currency_rates")
			.update({
				usd_rate: usdRate,
				updated_at: new Date().toISOString(),
			})
			.eq("currency_code", currencyCode)
			.eq("tenant_id", tenantId)
			.eq("location_id", locationId);

		if (error) {
			logger.error("Error updating currency rate", error, {
				currencyCode,
				tenantId,
				locationId,
			});
			return { success: false, error: error.message };
		}

		// Clear cache for this specific tenant/location to force refresh
		const cacheKey = `${tenantId}-${locationId}`;
		currencyRatesCache.delete(cacheKey);
		logger.debug("Cleared currency cache after updating rate", { cacheKey });

		return { success: true };
	} catch (error) {
		logger.error("Error in updateCurrencyRate", error, {
			currencyCode,
			tenantId,
			locationId,
		});
		return { success: false, error: "Failed to update currency rate" };
	}
}

// Get currency details including custom flag
export const getCurrencyDetails = async (
	tenantId: string,
	locationId: string,
): Promise<CurrencyRate[]> => {
	try {
		const { data, error } = await supabase
			.from("currency_rates")
			.select("*")
			.eq("tenant_id", tenantId)
			.eq("location_id", locationId)
			.not("currency_code", "is", null)
			.order("currency_code");

		if (error) {
			logger.error("Error fetching currency details", error, {
				tenantId,
				locationId,
			});
			return [];
		}

		return (data as DatabaseCurrencyRate[]) || [];
	} catch (error) {
		logger.error("Error in getCurrencyDetails", error, {
			tenantId,
			locationId,
		});
		return [];
	}
};
