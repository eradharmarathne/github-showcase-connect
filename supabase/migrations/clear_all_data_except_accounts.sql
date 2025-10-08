-- ============================================================================
-- Clear All Data Except Accounts Table
-- ============================================================================
-- This script deletes all data from transactional tables while preserving:
-- - accounts table (as requested)
-- - tenants, locations, profiles (system/user data)
-- - plans, subscriptions (billing data)
-- - currency_rates (reference data)
-- - form_field_preferences (user preferences)
-- - user_permissions (access control)
--
-- Deletion Order: Child tables first, then parent tables to avoid FK violations
-- ============================================================================

BEGIN;

-- Step 1: Delete from tables with no foreign key dependencies (leaf tables)
DELETE FROM public.currency_conversion_log;
DELETE FROM public.financial_audit_log;
DELETE FROM public.booking_payments;
DELETE FROM public.booking_sync_urls;
DELETE FROM public.beds24_property_mappings;
DELETE FROM public.channel_property_mappings;
DELETE FROM public.user_invitations;
DELETE FROM public.tenant_limits;
DELETE FROM public.expense_types;
DELETE FROM public.income_types;
DELETE FROM public.room_pricing;

-- Step 2: Delete payments (references reservations, accounts)
DELETE FROM public.payments;

-- Step 3: Delete income (references bookings/reservations, accounts, locations)
DELETE FROM public.income;

-- Step 4: Delete expenses (references accounts, locations)
DELETE FROM public.expenses;

-- Step 5: Delete account transfers (references accounts)
DELETE FROM public.account_transfers;

-- Step 6: Delete additional services (references reservations)
DELETE FROM public.additional_services;

-- Step 7: Delete reservations (references rooms, guides, agents, locations)
DELETE FROM public.reservations;

-- Step 8: Delete external bookings (references locations, rooms)
DELETE FROM public.external_bookings;

-- Step 9: Delete bookings table (if different from reservations)
DELETE FROM public.bookings;

-- Step 10: Delete invoices (may reference reservations or bookings)
DELETE FROM public.invoices;

-- Step 11: Delete monthly rent payments (references locations or rooms)
DELETE FROM public.monthly_rent_payments;

-- Step 12: Delete rooms (references locations)
DELETE FROM public.rooms;

-- Step 13: Delete master file tables (agents, guides - no FK dependencies)
DELETE FROM public.agents;
DELETE FROM public.guides;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Count remaining records in deleted tables (should all be 0)
SELECT 'payments' as table_name, COUNT(*) as record_count FROM public.payments
UNION ALL
SELECT 'income', COUNT(*) FROM public.income
UNION ALL
SELECT 'expenses', COUNT(*) FROM public.expenses
UNION ALL
SELECT 'account_transfers', COUNT(*) FROM public.account_transfers
UNION ALL
SELECT 'reservations', COUNT(*) FROM public.reservations
UNION ALL
SELECT 'external_bookings', COUNT(*) FROM public.external_bookings
UNION ALL
SELECT 'bookings', COUNT(*) FROM public.bookings
UNION ALL
SELECT 'rooms', COUNT(*) FROM public.rooms
UNION ALL
SELECT 'agents', COUNT(*) FROM public.agents
UNION ALL
SELECT 'guides', COUNT(*) FROM public.guides
UNION ALL
SELECT 'additional_services', COUNT(*) FROM public.additional_services
UNION ALL
SELECT 'invoices', COUNT(*) FROM public.invoices
UNION ALL
SELECT 'monthly_rent_payments', COUNT(*) FROM public.monthly_rent_payments
UNION ALL
SELECT 'booking_payments', COUNT(*) FROM public.booking_payments
UNION ALL
SELECT 'currency_conversion_log', COUNT(*) FROM public.currency_conversion_log
UNION ALL
SELECT 'financial_audit_log', COUNT(*) FROM public.financial_audit_log;

-- Verify accounts table is preserved
SELECT 'accounts' as table_name, COUNT(*) as record_count FROM public.accounts;

-- Verify other preserved tables
SELECT 'tenants' as table_name, COUNT(*) as record_count FROM public.tenants
UNION ALL
SELECT 'locations', COUNT(*) FROM public.locations
UNION ALL
SELECT 'profiles', COUNT(*) FROM public.profiles
UNION ALL
SELECT 'plans', COUNT(*) FROM public.plans
UNION ALL
SELECT 'subscriptions', COUNT(*) FROM public.subscriptions
UNION ALL
SELECT 'currency_rates', COUNT(*) FROM public.currency_rates
UNION ALL
SELECT 'form_field_preferences', COUNT(*) FROM public.form_field_preferences
UNION ALL
SELECT 'user_permissions', COUNT(*) FROM public.user_permissions;

COMMIT;

-- ============================================================================
-- Post-Execution Notes:
-- ============================================================================
-- 1. All transactional data has been deleted
-- 2. Accounts table preserved as requested
-- 3. System tables preserved: tenants, locations, profiles, user_permissions
-- 4. Billing tables preserved: plans, subscriptions
-- 5. Reference data preserved: currency_rates, form_field_preferences
-- 6. Database triggers remain active and will function for new data
-- 7. All constraints and indexes are intact
-- ============================================================================
