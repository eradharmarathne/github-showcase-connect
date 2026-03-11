import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import { logger } from "@/lib/logger";

// Updated type for dynamic currencies
export type Currency = string; // Now supports any currency code

export interface CurrencyRate {
	id: string;
	currency_code: string;
	usd_rate: number;
	is_custom: boolean;
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
const DEFAULT_CURRENCY_CODE = "USD";

const getDefaultRates = (): CurrencyRates => {
	return {
		[DEFAULT_CURRENCY_CODE]: 1,
	};
};

const normalizeCurrencyCode = (
	currencyCode: string | null | undefined,
): string | null => {
	if (!currencyCode) {
		return null;
	}

	const normalizedCode = currencyCode.trim().toUpperCase();
	if (!/^[A-Z]{3,5}$/.test(normalizedCode)) {
		return null;
	}

	return normalizedCode;
};

const createFallbackCurrencyRate = (
	tenantId: string,
	locationId: string,
	currencyCode: string = DEFAULT_CURRENCY_CODE,
): CurrencyRate => {
	const timestamp = new Date().toISOString();

	return {
		id: `fallback-${tenantId}-${locationId}-${currencyCode}`,
		currency_code: currencyCode,
		usd_rate: currencyCode === DEFAULT_CURRENCY_CODE ? 1 : 0,
		is_custom: false,
		tenant_id: tenantId,
		location_id: locationId,
		updated_at: timestamp,
		created_at: timestamp,
	};
};

const normalizeCurrencyDetails = (
	data: DatabaseCurrencyRate[] | null,
	tenantId: string,
	locationId: string,
): CurrencyRate[] => {
	const normalizedByCode = new Map<string, CurrencyRate>();

	for (const item of data || []) {
		const currencyCode = normalizeCurrencyCode(item.currency_code);
		if (!currencyCode) {
			continue;
		}

		const normalizedUsdRate =
			typeof item.usd_rate === "number" && item.usd_rate > 0
				? Number(item.usd_rate)
				: currencyCode === DEFAULT_CURRENCY_CODE
					? 1
					: 0;

		normalizedByCode.set(currencyCode, {
			id: item.id,
			currency_code: currencyCode,
			usd_rate: normalizedUsdRate,
			is_custom: item.is_custom ?? false,
			tenant_id: item.tenant_id,
			location_id: item.location_id,
			updated_at: item.updated_at,
			created_at: item.created_at,
		});
	}

	if (!normalizedByCode.has(DEFAULT_CURRENCY_CODE)) {
		normalizedByCode.set(
			DEFAULT_CURRENCY_CODE,
			createFallbackCurrencyRate(tenantId, locationId),
		);
	}

	return Array.from(normalizedByCode.values()).sort((a, b) =>
		a.currency_code.localeCompare(b.currency_code),
	);
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
			return [DEFAULT_CURRENCY_CODE];
		}

		const currencies = new Set<string>();
		for (const item of data || []) {
			const currencyCode = normalizeCurrencyCode(item.currency_code);
			if (currencyCode) {
				currencies.add(currencyCode);
			}
		}

		if (!currencies.has(DEFAULT_CURRENCY_CODE)) {
			currencies.add(DEFAULT_CURRENCY_CODE);
		}

		return Array.from(currencies).sort((a, b) => a.localeCompare(b));
	} catch (error) {
		logger.error("Error in getAvailableCurrencies", error);
		return [DEFAULT_CURRENCY_CODE];
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
			const currencyCode = normalizeCurrencyCode(rate.currency_code);
			if (
				currencyCode &&
				typeof rate.usd_rate === "number" &&
				rate.usd_rate > 0
			) {
				rates[currencyCode] = Number(rate.usd_rate);
			}
		}

		if (!rates[DEFAULT_CURRENCY_CODE]) {
			rates[DEFAULT_CURRENCY_CODE] = 1;
		}

		if (Object.keys(rates).length === 0) {
			return getDefaultRates();
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
	const normalizedFromCurrency = normalizeCurrencyCode(fromCurrency);
	const normalizedToCurrency = normalizeCurrencyCode(toCurrency);

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

	if (!normalizedFromCurrency || !normalizedToCurrency) {
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

	if (normalizedFromCurrency === normalizedToCurrency) {
		return amount;
	}

	try {
		const rates = await getCurrencyRates(tenantId, locationId);

		// Convert from source currency to USD first
		let usdAmount = amount;
		if (normalizedFromCurrency !== DEFAULT_CURRENCY_CODE) {
			const fromRate = rates[normalizedFromCurrency];
			if (!fromRate || fromRate <= 0) {
				logger.warn(
					`No valid rate found for ${normalizedFromCurrency}, returning original amount`,
					{
						fromCurrency: normalizedFromCurrency,
						toCurrency: normalizedToCurrency,
						tenantId,
						locationId,
						rate: fromRate,
					},
				);
				return amount;
			}
			usdAmount = amount / fromRate;
		}

		// Convert from USD to target currency
		if (normalizedToCurrency === DEFAULT_CURRENCY_CODE) {
			return usdAmount;
		}

		const toRate = rates[normalizedToCurrency];
		if (!toRate || toRate <= 0) {
			logger.warn(
				`No valid rate found for ${normalizedToCurrency}, returning USD amount`,
				{
					fromCurrency: normalizedFromCurrency,
					toCurrency: normalizedToCurrency,
					tenantId,
					locationId,
					rate: toRate,
				},
			);
			return usdAmount;
		}

		const convertedAmount = usdAmount * toRate;

		// Validate result
		if (!isFinite(convertedAmount)) {
			logger.error("Currency conversion resulted in invalid number", {
				fromCurrency: normalizedFromCurrency,
				toCurrency: normalizedToCurrency,
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
		const normalizedCurrencyCode = normalizeCurrencyCode(currencyCode);

		// Validate currency code (3-5 uppercase letters)
		if (!normalizedCurrencyCode) {
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
				currency_code: normalizedCurrencyCode,
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
				currencyCode: normalizedCurrencyCode,
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
		const normalizedCurrencyCode = normalizeCurrencyCode(currencyCode);
		if (!normalizedCurrencyCode) {
			return { success: false, error: "Invalid currency code" };
		}

		if (normalizedCurrencyCode === DEFAULT_CURRENCY_CODE) {
			return { success: false, error: "Cannot remove USD base currency" };
		}

		const { error } = await supabase
			.from("currency_rates")
			.delete()
			.eq("currency_code", normalizedCurrencyCode)
			.eq("tenant_id", tenantId)
			.eq("location_id", locationId)
			.eq("is_custom", true);

		if (error) {
			logger.error("Error removing currency", error, {
				currencyCode: normalizedCurrencyCode,
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
		const normalizedCurrencyCode = normalizeCurrencyCode(currencyCode);
		if (!normalizedCurrencyCode) {
			return { success: false, error: "Invalid currency code" };
		}

		if (normalizedCurrencyCode === DEFAULT_CURRENCY_CODE) {
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
			.eq("currency_code", normalizedCurrencyCode)
			.eq("tenant_id", tenantId)
			.eq("location_id", locationId);

		if (error) {
			logger.error("Error updating currency rate", error, {
				currencyCode: normalizedCurrencyCode,
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
			return [createFallbackCurrencyRate(tenantId, locationId)];
		}

		return normalizeCurrencyDetails(
			(data as DatabaseCurrencyRate[]) || [],
			tenantId,
			locationId,
		);
	} catch (error) {
		logger.error("Error in getCurrencyDetails", error, {
			tenantId,
			locationId,
		});
		return [createFallbackCurrencyRate(tenantId, locationId)];
	}
};
