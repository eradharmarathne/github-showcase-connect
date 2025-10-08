# Phase 3 Implementation Guide
## Currency Conversion History, Audit Trail, and Transaction View

**Status**: SQL prepared, requires manual execution in Supabase SQL Editor

## Overview

Phase 3 adds comprehensive audit trails and transaction history to the financial system:

1. **Currency Conversion Log**: Tracks all currency conversions with exchange rates
2. **Financial Audit Log**: Automatic audit trail of all balance changes
3. **Unified Transaction History**: Single view of all financial transactions
4. **Audit Triggers**: Auto-log changes to accounts and reservations
5. **Application Integration**: Currency conversion logging in code

## Prerequisites

- Phase 1 & 2 completed (database triggers and application fixes)
- Access to Supabase SQL Editor
- Admin permissions on Supabase project

## SQL Execution

### Step 1: Execute SQL Migration

**Location**: `supabase/migrations/phase3_currency_audit_trail.sql`

**Instructions**:
1. Open Supabase Dashboard → SQL Editor
2. Copy entire contents of `phase3_currency_audit_trail.sql`
3. Paste into SQL Editor
4. Click "Run" to execute
5. Verify all objects created successfully

**Objects Created**:
- 2 new tables: `currency_conversion_log`, `financial_audit_log`
- 1 new view: `unified_transaction_history`
- 3 new functions: `log_account_balance_change()`, `log_reservation_amount_change()`, `log_currency_conversion()`
- 2 new triggers: `trigger_log_account_balance`, `trigger_log_reservation_amounts`

### Step 2: Verify Installation

Run these queries in SQL Editor to confirm:

```sql
-- Check tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_name IN ('currency_conversion_log', 'financial_audit_log');

-- Check view exists
SELECT table_name FROM information_schema.views 
WHERE table_name = 'unified_transaction_history';

-- Check triggers are active
SELECT trigger_name, event_object_table, event_manipulation 
FROM information_schema.triggers 
WHERE trigger_name IN ('trigger_log_account_balance', 'trigger_log_reservation_amounts');

-- Check functions exist
SELECT routine_name FROM information_schema.routines 
WHERE routine_name IN ('log_account_balance_change', 'log_reservation_amount_change', 'log_currency_conversion');
```

Expected Results:
- 2 tables found
- 1 view found
- 2 triggers active (on accounts and reservations tables)
- 3 functions found

## Application Integration

### Step 3: Update AddIncomeDialog.tsx for Currency Conversion Logging

**File**: `src/components/reservation/AddIncomeDialog.tsx`

Add currency conversion logging when payment involves currency conversion:

```typescript
// After successful payment insert (around line 180)
if (isPayment && formData.currency !== accountCurrency) {
  // Log currency conversion
  const { error: conversionLogError } = await supabase
    .from('currency_conversion_log')
    .insert({
      transaction_type: 'payment',
      transaction_id: paymentData.id,
      from_currency: formData.currency,
      to_currency: accountCurrency,
      from_amount: Number.parseFloat(formData.amount),
      to_amount: convertedAmount,
      exchange_rate: convertedAmount / Number.parseFloat(formData.amount),
      rate_source: 'system', // Using currency_rates table
      tenant_id: selectedTenant.id,
      created_by: profile?.id,
      notes: `Payment for reservation ${reservation.reservation_number}`,
    });

  if (conversionLogError) {
    console.error('Failed to log currency conversion:', conversionLogError);
    // Non-critical error, don't block transaction
  }
}
```

### Step 4: Update ExpenseForm.tsx for Currency Conversion Logging

**File**: `src/components/expense/ExpenseForm.tsx`

Add logging when expense involves currency conversion:

```typescript
// After successful expense insert (around line 95)
if (expenseData.currency !== accountCurrency) {
  const { error: conversionLogError } = await supabase
    .from('currency_conversion_log')
    .insert({
      transaction_type: 'expense',
      transaction_id: expenseData.id,
      from_currency: expenseData.currency,
      to_currency: accountCurrency,
      from_amount: Number.parseFloat(formData.amount),
      to_amount: convertedAmount,
      exchange_rate: convertedAmount / Number.parseFloat(formData.amount),
      rate_source: 'system',
      tenant_id: selectedTenant.id,
      created_by: profile?.id,
      notes: `${expenseData.main_type} - ${expenseData.sub_type}`,
    });

  if (conversionLogError) {
    console.error('Failed to log currency conversion:', conversionLogError);
  }
}
```

## Database Schema Details

### currency_conversion_log Table

**Purpose**: Track every currency conversion with exchange rate used

**Columns**:
- `id` (UUID): Primary key
- `transaction_type` (TEXT): 'payment', 'income', 'expense', 'transfer'
- `transaction_id` (UUID): Reference to source transaction
- `from_currency` (currency_type): Original currency
- `to_currency` (currency_type): Converted currency
- `from_amount` (NUMERIC): Original amount
- `to_amount` (NUMERIC): Converted amount
- `exchange_rate` (NUMERIC): Rate used (to_amount = from_amount * exchange_rate)
- `rate_source` (TEXT): 'manual', 'api', 'system'
- `conversion_date` (TIMESTAMPTZ): When conversion occurred
- `tenant_id` (UUID): Tenant reference
- `created_by` (UUID): User who performed conversion
- `notes` (TEXT): Additional context

**Indexes**:
- `idx_currency_conversion_log_transaction`: Fast lookup by transaction
- `idx_currency_conversion_log_tenant`: Tenant filtering
- `idx_currency_conversion_log_date`: Date-based queries

### financial_audit_log Table

**Purpose**: Automatic audit trail of all financial balance changes

**Columns**:
- `id` (UUID): Primary key
- `entity_type` (TEXT): 'account' or 'reservation'
- `entity_id` (UUID): ID of account/reservation
- `field_name` (TEXT): 'current_balance', 'paid_amount', 'balance_amount', 'total_amount'
- `old_value` (NUMERIC): Previous value (NULL for INSERT)
- `new_value` (NUMERIC): New value
- `change_amount` (NUMERIC GENERATED): Auto-calculated (new_value - old_value)
- `transaction_type` (TEXT): What triggered the change
- `transaction_id` (UUID): Reference to triggering transaction
- `tenant_id` (UUID): Tenant reference
- `changed_by` (UUID): User who made the change
- `changed_at` (TIMESTAMPTZ): When change occurred
- `notes` (TEXT): Additional context

**Indexes**:
- `idx_financial_audit_log_entity`: Fast lookup by entity
- `idx_financial_audit_log_tenant`: Tenant filtering
- `idx_financial_audit_log_date`: Date-based queries
- `idx_financial_audit_log_transaction`: Transaction correlation

### unified_transaction_history View

**Purpose**: Single ledger view of all financial transactions

**Sources**:
1. **Payments**: All payment records (credit)
2. **Income**: Only records with account_id (actual deposits, credit)
3. **Expenses**: All expense records (debit)
4. **Account Transfers**: Both FROM (debit) and TO (credit) sides

**Columns**:
- `transaction_id` (UUID): Unique transaction identifier
- `transaction_type` (TEXT): 'payment', 'income', 'expense', 'transfer_in', 'transfer_out'
- `reference_number` (TEXT): Payment number or reservation number
- `transaction_date` (TIMESTAMPTZ): When transaction occurred
- `account_id` (UUID): Account affected
- `account_name` (TEXT): Account display name
- `related_reservation_id` (UUID): Linked reservation (if applicable)
- `related_reservation_number` (TEXT): Reservation number (if applicable)
- `amount` (NUMERIC): Transaction amount
- `currency` (currency_type): Transaction currency
- `payment_method` (TEXT): How payment was made
- `entry_type` (TEXT): 'credit' or 'debit'
- `description` (TEXT): Transaction description
- `tenant_id` (UUID): Tenant reference
- `created_by` (UUID): User who created transaction
- `location_id` (UUID): Location reference

**Usage**:
```sql
-- Get all transactions for an account
SELECT * FROM unified_transaction_history 
WHERE account_id = 'account-uuid' 
ORDER BY transaction_date DESC;

-- Get account statement between dates
SELECT * FROM unified_transaction_history 
WHERE account_id = 'account-uuid'
  AND transaction_date BETWEEN '2024-01-01' AND '2024-12-31'
ORDER BY transaction_date ASC;
```

## Automatic Audit Triggers

### trigger_log_account_balance

**Fires On**: INSERT or UPDATE on `accounts` table  
**Condition**: When `current_balance` changes  
**Action**: Logs to `financial_audit_log` with:
- Entity type: 'account'
- Field name: 'current_balance'
- Old/new values
- Transaction type: 'balance_update'

### trigger_log_reservation_amounts

**Fires On**: INSERT or UPDATE on `reservations` table  
**Condition**: When `total_amount`, `paid_amount`, or `balance_amount` changes  
**Action**: Creates 3 separate audit log entries for each field that changed

## Application Helper Function

### log_currency_conversion()

**Purpose**: Manual logging from application code

**Parameters**:
- `p_transaction_type`: 'payment', 'income', 'expense', 'transfer'
- `p_transaction_id`: UUID of source transaction
- `p_from_currency`: Original currency
- `p_to_currency`: Target currency
- `p_from_amount`: Original amount
- `p_to_amount`: Converted amount
- `p_exchange_rate`: Rate used
- `p_rate_source`: 'manual', 'api', 'system'
- `p_tenant_id`: Tenant UUID
- `p_created_by`: User UUID (optional)
- `p_notes`: Additional notes (optional)

**Returns**: UUID of created log entry

**Usage**:
```typescript
const { data, error } = await supabase.rpc('log_currency_conversion', {
  p_transaction_type: 'payment',
  p_transaction_id: paymentId,
  p_from_currency: 'USD',
  p_to_currency: 'LKR',
  p_from_amount: 100,
  p_to_amount: 32500,
  p_exchange_rate: 325,
  p_rate_source: 'system',
  p_tenant_id: tenant.id,
  p_created_by: profile.id,
  p_notes: 'Payment conversion'
});
```

## Reporting Queries

### Currency Conversion History

```sql
-- All conversions for a tenant
SELECT 
  ccl.*,
  CASE 
    WHEN transaction_type = 'payment' THEN p.payment_number
    WHEN transaction_type = 'income' THEN CAST(i.id AS TEXT)
    WHEN transaction_type = 'expense' THEN CAST(e.id AS TEXT)
  END as reference
FROM currency_conversion_log ccl
LEFT JOIN payments p ON ccl.transaction_id = p.id AND ccl.transaction_type = 'payment'
LEFT JOIN income i ON ccl.transaction_id = i.id AND ccl.transaction_type = 'income'
LEFT JOIN expenses e ON ccl.transaction_id = e.id AND ccl.transaction_type = 'expense'
WHERE ccl.tenant_id = 'tenant-uuid'
ORDER BY ccl.conversion_date DESC;
```

### Account Balance Audit Trail

```sql
-- Complete balance change history for an account
SELECT 
  fal.changed_at,
  fal.old_value as previous_balance,
  fal.new_value as new_balance,
  fal.change_amount,
  fal.transaction_type,
  fal.notes,
  p.email as changed_by_email
FROM financial_audit_log fal
LEFT JOIN profiles p ON fal.changed_by = p.id
WHERE fal.entity_type = 'account'
  AND fal.entity_id = 'account-uuid'
  AND fal.field_name = 'current_balance'
ORDER BY fal.changed_at DESC;
```

### Reservation Payment History

```sql
-- All payments and balance changes for a reservation
SELECT 
  fal.changed_at,
  fal.field_name,
  fal.old_value,
  fal.new_value,
  fal.change_amount,
  fal.transaction_type,
  fal.notes
FROM financial_audit_log fal
WHERE fal.entity_type = 'reservation'
  AND fal.entity_id = 'reservation-uuid'
ORDER BY fal.changed_at ASC;
```

### Complete Account Statement

```sql
-- Full account ledger with running balance
SELECT 
  uth.transaction_date,
  uth.transaction_type,
  uth.reference_number,
  uth.description,
  CASE 
    WHEN uth.entry_type = 'debit' THEN -uth.amount
    ELSE uth.amount
  END as amount,
  uth.currency,
  SUM(CASE 
    WHEN uth.entry_type = 'debit' THEN -uth.amount
    ELSE uth.amount
  END) OVER (ORDER BY uth.transaction_date, uth.transaction_id) as running_balance
FROM unified_transaction_history uth
WHERE uth.account_id = 'account-uuid'
ORDER BY uth.transaction_date ASC;
```

## Testing Phase 3

### Test 1: Audit Logging on New Transaction

1. Create a new payment in the app
2. Check `financial_audit_log`:
```sql
SELECT * FROM financial_audit_log 
WHERE changed_at > now() - interval '5 minutes'
ORDER BY changed_at DESC;
```
3. Verify entries for:
   - Account `current_balance` change
   - Reservation `paid_amount` change
   - Reservation `balance_amount` change

### Test 2: Currency Conversion Logging

1. Make a payment with currency different from account currency
2. Check `currency_conversion_log`:
```sql
SELECT * FROM currency_conversion_log 
WHERE conversion_date > now() - interval '5 minutes';
```
3. Verify exchange rate, from/to amounts are correct

### Test 3: Unified Transaction View

1. Query recent transactions:
```sql
SELECT * FROM unified_transaction_history 
WHERE tenant_id = 'your-tenant-uuid'
  AND transaction_date > now() - interval '1 day'
ORDER BY transaction_date DESC;
```
2. Verify all transaction types appear
3. Check entry_type (credit/debit) is correct

### Test 4: Account Statement

1. Generate statement for an account:
```sql
SELECT 
  transaction_date,
  transaction_type,
  description,
  CASE WHEN entry_type = 'debit' THEN -amount ELSE amount END as amount,
  SUM(CASE WHEN entry_type = 'debit' THEN -amount ELSE amount END) 
    OVER (ORDER BY transaction_date) as balance
FROM unified_transaction_history
WHERE account_id = 'test-account-uuid'
ORDER BY transaction_date ASC;
```
2. Verify running balance matches account `current_balance`

## Rollback Plan

If issues occur, execute in Supabase SQL Editor:

```sql
-- Remove triggers
DROP TRIGGER IF EXISTS trigger_log_account_balance ON accounts;
DROP TRIGGER IF EXISTS trigger_log_reservation_amounts ON reservations;

-- Remove functions
DROP FUNCTION IF EXISTS log_account_balance_change();
DROP FUNCTION IF EXISTS log_reservation_amount_change();
DROP FUNCTION IF EXISTS log_currency_conversion(TEXT, UUID, currency_type, currency_type, NUMERIC, NUMERIC, NUMERIC, TEXT, UUID, UUID, TEXT);

-- Remove view
DROP VIEW IF EXISTS unified_transaction_history;

-- Remove tables (keeps existing data - use CASCADE to delete)
DROP TABLE IF EXISTS currency_conversion_log;
DROP TABLE IF EXISTS financial_audit_log;
```

## Performance Considerations

### Audit Log Growth

- `financial_audit_log` will grow quickly (every balance change)
- Recommended: Archive old records periodically
- Example archival query:
```sql
-- Archive records older than 1 year
DELETE FROM financial_audit_log 
WHERE changed_at < now() - interval '1 year';
```

### View Performance

- `unified_transaction_history` uses UNION ALL (efficient)
- Indexes on source tables ensure fast queries
- Always filter by `tenant_id` and add date ranges

### Trigger Impact

- Audit triggers are AFTER triggers (don't block transactions)
- Minimal performance impact
- Errors in audit logging won't rollback main transaction

## Future Enhancements

1. **Archive Strategy**: Automated archival of old audit logs
2. **Report Components**: React components for audit trail viewing
3. **Export Functionality**: CSV/PDF export of account statements
4. **Alert System**: Notifications for unusual balance changes
5. **Reconciliation Tools**: Compare audit log with actual balances

## Support

For issues with Phase 3 implementation:
1. Check Supabase SQL Editor error messages
2. Verify all Phase 1 & 2 triggers are still active
3. Review application console for JavaScript errors
4. Test queries in SQL Editor before using in application code

## Summary

Phase 3 provides:
- ✅ Complete audit trail of all balance changes
- ✅ Currency conversion tracking with exchange rates
- ✅ Unified transaction history across all tables
- ✅ Automatic logging via database triggers
- ✅ Foundation for advanced reporting and reconciliation

**Next Steps**:
1. Execute SQL migration in Supabase
2. Verify all objects created
3. Update application code for currency conversion logging
4. Test all scenarios
5. Monitor performance and audit log growth
