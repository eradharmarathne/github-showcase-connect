-- Fix duplicate account transfer triggers
-- Issue: Multiple triggers causing double/triple balance updates on account_transfers

-- Drop the old direct balance update trigger and its function
DROP TRIGGER IF EXISTS trigger_update_account_on_transfer ON account_transfers;
DROP FUNCTION IF EXISTS update_account_balance_on_transfer();

-- Drop the old reverse transfer trigger (not needed with recalculation approach)
DROP TRIGGER IF EXISTS trigger_reverse_account_on_transfer_delete ON account_transfers;
DROP FUNCTION IF EXISTS reverse_account_balance_on_transfer_delete();

-- Drop one of the duplicate recalculation triggers
-- Keep: account_transfers_balance_trigger (more descriptive name)
-- Drop: account_balance_trigger (generic name)
DROP TRIGGER IF EXISTS account_balance_trigger ON account_transfers;

-- The remaining trigger 'account_transfers_balance_trigger' will handle all operations:
-- - INSERT: Recalculate both from_account and to_account balances
-- - UPDATE: Recalculate all affected accounts
-- - DELETE: Recalculate both accounts
-- This trigger uses the update_account_balance() function which recalculates
-- the complete balance from initial_balance + income - expenses + transfers_in - transfers_out

-- Verify remaining trigger
SELECT 
    t.tgname AS trigger_name,
    p.proname AS function_name,
    CASE 
        WHEN t.tgtype & 2 > 0 THEN 'BEFORE'
        WHEN t.tgtype & 64 > 0 THEN 'INSTEAD OF'
        ELSE 'AFTER'
    END AS timing,
    CASE 
        WHEN t.tgtype & 4 > 0 THEN 'INSERT'
        WHEN t.tgtype & 8 > 0 THEN 'DELETE'
        WHEN t.tgtype & 16 > 0 THEN 'UPDATE'
        ELSE 'UNKNOWN'
    END AS event
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
JOIN pg_class c ON t.tgrelid = c.oid
WHERE c.relname = 'account_transfers'
  AND t.tgisinternal = false
ORDER BY t.tgname;
