-- Recalculate all account balances to fix corruption from duplicate triggers
-- This script calls update_account_balance() for every account to ensure
-- balances are correctly calculated from all income, expenses, and transfers

DO $$
DECLARE
    account_record RECORD;
    recalculated_count INTEGER := 0;
BEGIN
    -- Loop through all accounts and recalculate their balances
    FOR account_record IN 
        SELECT id, name, tenant_id 
        FROM accounts 
        ORDER BY tenant_id, name
    LOOP
        -- Call the update_account_balance function for each account
        PERFORM update_account_balance(account_record.id);
        recalculated_count := recalculated_count + 1;
        
        RAISE NOTICE 'Recalculated balance for account: % (ID: %)', 
            account_record.name, account_record.id;
    END LOOP;
    
    RAISE NOTICE 'Successfully recalculated % account balances', recalculated_count;
END $$;

-- Display final balances for verification
SELECT 
    t.name as tenant,
    a.name as account,
    a.currency,
    a.initial_balance,
    a.current_balance,
    a.current_balance - a.initial_balance as net_change
FROM accounts a
LEFT JOIN tenants t ON a.tenant_id = t.id
ORDER BY t.name, a.name;
