// Test the currency conversion function
import { supabase } from "@/integrations/supabase/client";

// Test function to debug currency conversion
export const testCurrencyConversion = async () => {
  console.log("=== Testing Currency Conversion ===");
  
  // First, let's check what rates we get from the database
  const { data: ratesData, error } = await supabase
    .from("currency_rates")
    .select("currency_code, usd_rate")
    .not("currency_code", "is", null)
    .not("usd_rate", "is", null);

  console.log("Rates from database:", ratesData);
  console.log("Database error:", error);

  if (ratesData) {
    const rates: Record<string, number> = {};
    for (const rate of ratesData) {
      rates[rate.currency_code] = Number(rate.usd_rate);
    }
    console.log("Processed rates object:", rates);

    // Test the conversion logic manually
    const amount = 100;
    const fromCurrency = "USD";
    const toCurrency = "LKR";
    
    console.log(`\nTesting conversion: ${amount} ${fromCurrency} to ${toCurrency}`);
    
    // Step 1: Convert to USD (should be no-op since from=USD)
    let usdAmount = amount;
    if (fromCurrency !== "USD") {
      const fromRate = rates[fromCurrency];
      console.log(`From rate for ${fromCurrency}:`, fromRate);
      usdAmount = amount / fromRate;
      console.log(`USD amount after from-conversion:`, usdAmount);
    } else {
      console.log("No from-conversion needed (already USD)");
    }

    // Step 2: Convert from USD to target
    if (toCurrency === "USD") {
      console.log("No to-conversion needed (target is USD)");
      console.log("Final result:", usdAmount);
    } else {
      const toRate = rates[toCurrency];
      console.log(`To rate for ${toCurrency}:`, toRate);
      const result = usdAmount * toRate;
      console.log(`Final result: ${usdAmount} * ${toRate} = ${result}`);
    }
  }
};

// Call this in the browser console to test
if (typeof window !== 'undefined') {
  (window as any).testCurrencyConversion = testCurrencyConversion;
}