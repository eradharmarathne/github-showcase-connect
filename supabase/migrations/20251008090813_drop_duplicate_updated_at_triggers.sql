-- Drop Duplicate Updated_at Triggers
-- Created: 2025-10-08
-- Author: Claude Code (Automated Migration)
-- Supabase Ref: takovelbhvoqnvfmnhaq
-- Purpose: Remove duplicate updated_at triggers across 8 tables
-- Each table has 2 triggers doing the same thing - we keep set_updated_at for consistency

BEGIN;

-- 1. Drop duplicate trigger on agents
DROP TRIGGER IF EXISTS update_agents_updated_at ON agents;
-- Keep: set_updated_at

-- 2. Drop duplicate trigger on guides
DROP TRIGGER IF EXISTS update_guides_updated_at ON guides;
-- Keep: set_updated_at

-- 3. Drop duplicate trigger on currency_rates
DROP TRIGGER IF EXISTS tupdate_currency_rates_updated_at ON currency_rates;
-- Keep: set_updated_at

-- 4. Drop duplicate trigger on external_bookings
DROP TRIGGER IF EXISTS update_external_bookings_updated_at ON external_bookings;
-- Keep: set_updated_at

-- 5. Drop duplicate trigger on beds24_property_mappings
DROP TRIGGER IF EXISTS update_beds24_property_mappings_updated_at ON beds24_property_mappings;
-- Keep: set_updated_at

-- 6. Drop duplicate trigger on rooms
DROP TRIGGER IF EXISTS update_rooms_updated_at ON rooms;
-- Keep: set_updated_at

-- 7. Drop duplicate trigger on reservations
DROP TRIGGER IF EXISTS update_reservations_updated_at ON reservations;
-- Keep: set_updated_at

-- 8. Drop duplicate trigger on tenants
DROP TRIGGER IF EXISTS trigger_tenants_updated_at ON tenants;
-- Keep: set_updated_at

COMMIT;

-- Verification Query:
-- SELECT c.relname AS table_name, COUNT(t.tgname) AS trigger_count, string_agg(t.tgname, ', ') AS trigger_names
-- FROM pg_trigger t
-- JOIN pg_class c ON t.tgrelid = c.oid
-- JOIN pg_namespace n ON c.relnamespace = n.oid
-- WHERE n.nspname = 'public' AND NOT t.tgisinternal
--   AND c.relname IN ('agents', 'guides', 'currency_rates', 'external_bookings', 'beds24_property_mappings', 'rooms', 'reservations', 'tenants')
-- GROUP BY c.relname ORDER BY c.relname;
-- Each table should now have only 1 updated_at trigger (set_updated_at)
