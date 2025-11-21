-- Ensure unique constraint on currency_rates table
-- Prevents duplicate currency rates for the same tenant/location/currency combination

-- Drop existing constraint if it exists (in case it was created with a different name)
DO $$
BEGIN
    -- Try to drop constraint if it exists
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'unique_currency_rates_tenant_location_currency'
    ) THEN
        ALTER TABLE currency_rates 
        DROP CONSTRAINT unique_currency_rates_tenant_location_currency;
    END IF;
END $$;

-- Create unique constraint on (tenant_id, location_id, currency_code)
-- This ensures one rate per currency per tenant/location combination
ALTER TABLE currency_rates
ADD CONSTRAINT unique_currency_rates_tenant_location_currency
UNIQUE (tenant_id, location_id, currency_code);

-- Add comment explaining the constraint
COMMENT ON CONSTRAINT unique_currency_rates_tenant_location_currency ON currency_rates IS 
'Ensures one currency rate per currency code per tenant/location combination. Prevents duplicate rates.';

