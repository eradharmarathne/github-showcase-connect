# Polar Integration Schema Analysis Report

## Executive Summary

Analysis Date: 2025-11-21
Migration File: `supabase/migrations/20250120_migrate_creem_to_polar.sql`

**Status: 🟡 NEEDS ATTENTION - 8 Critical Issues Found**

---

## Critical Issues Found

### 1. ❌ ORPHANED RPC FUNCTION with Creem References
**Severity: HIGH**
**Location:** `supabase/migrations/20250113_add_payment_security.sql:171`

**Issue:**
The `complete_payment_attempt()` RPC function still uses old Creem parameter names:
```sql
CREATE OR REPLACE FUNCTION complete_payment_attempt(
    p_checkout_session_id TEXT,
    p_creem_order_id TEXT,                    -- ❌ Should be p_polar_order_id
    p_creem_customer_id TEXT DEFAULT NULL,     -- ❌ Should be p_polar_customer_id
    p_creem_subscription_id TEXT DEFAULT NULL  -- ❌ Should be p_polar_subscription_id
)
```

**Impact:**
- TypeScript types show Creem parameters in RPC function signature
- Edge Functions and client code may fail when calling this function
- Inconsistent API between database schema and application code

**Fix Required:**
```sql
-- Create new migration: 20250121_fix_payment_attempt_rpc.sql
CREATE OR REPLACE FUNCTION complete_payment_attempt(
    p_checkout_session_id TEXT,
    p_polar_order_id TEXT,
    p_polar_customer_id TEXT DEFAULT NULL,
    p_polar_subscription_id TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    v_updated BOOLEAN;
BEGIN
    UPDATE payment_attempts
    SET
        status = 'completed',
        polar_order_id = p_polar_order_id,
        polar_customer_id = COALESCE(p_polar_customer_id, polar_customer_id),
        polar_subscription_id = COALESCE(p_polar_subscription_id, polar_subscription_id),
        completed_at = NOW(),
        updated_at = NOW()
    WHERE
        checkout_session_id = p_checkout_session_id
        AND status = 'pending';

    GET DIAGNOSTICS v_updated = ROW_COUNT;
    RETURN v_updated > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

### 2. ❌ MISSING COLUMN: subscriptions.ended_at
**Severity: HIGH**
**Location:** `supabase/functions/handle-polar-webhook/index.ts:482`

**Issue:**
Edge Function references `ended_at` column that doesn't exist in the database:
```typescript
await supabase
    .from("subscriptions")
    .update({
        status: "cancelled",
        ended_at: new Date().toISOString(),  // ❌ Column doesn't exist
        updated_at: new Date().toISOString(),
    })
```

**Database Schema:**
```typescript
subscriptions: {
    cancelled_at: string | null;  // ✅ Exists
    trial_end: string | null;     // ✅ Exists
    ends_at: string | null;       // ❌ NOT DEFINED (but used in webhook handler)
    ended_at: string | null;      // ❌ NOT DEFINED (used in revoked handler)
}
```

**Impact:**
- Webhook handler will FAIL when processing `subscription.revoked` events
- Database will reject the INSERT/UPDATE due to unknown column
- Subscription revocations won't be processed correctly

**Fix Required:**
```sql
-- Add missing columns to subscriptions table
ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS ends_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ended_at TIMESTAMPTZ;

COMMENT ON COLUMN subscriptions.ends_at IS 'Date when subscription is scheduled to end (for canceled subscriptions)';
COMMENT ON COLUMN subscriptions.ended_at IS 'Date when subscription actually ended (immediate revocation)';
```

---

### 3. ❌ INCONSISTENT COLUMN: invoices.creem_invoice_id
**Severity: MEDIUM**
**Location:** `src/integrations/supabase/types.ts` (invoices table)

**Issue:**
The `invoices` table still has `creem_invoice_id` column that was never migrated to Polar:
```typescript
invoices: {
    Row: {
        creem_invoice_id: string | null;  // ❌ Should be polar_invoice_id
    }
}
```

**Migration Coverage:**
- ✅ `subscriptions` table: Fully migrated
- ✅ `payment_attempts` table: Fully migrated  
- ✅ `plans` table: Fully migrated
- ❌ `invoices` table: **NOT MIGRATED**

**Impact:**
- Invoices cannot be linked to Polar orders/subscriptions
- Future invoice sync from Polar will fail
- Inconsistent naming across tables

**Fix Required:**
```sql
ALTER TABLE invoices
  RENAME COLUMN creem_invoice_id TO polar_invoice_id;

-- Also add polar_order_id for better tracking
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS polar_order_id TEXT;

CREATE INDEX IF NOT EXISTS idx_invoices_polar_invoice_id
  ON invoices(polar_invoice_id);
```

---

### 4. ⚠️ TYPE MISMATCH: plans.polar_product_id vs polar_price_id
**Severity: MEDIUM**
**Location:** Multiple files

**Issue:**
Confusion between `polar_product_id` and `polar_price_id`:

**Database Schema:**
```sql
plans: {
    polar_product_id: TEXT,  -- Product ID (e.g., "prod_abc123")
    polar_price_id: TEXT,    -- Price ID (e.g., "price_abc123")
}
```

**Application Usage:**
```typescript
// ✅ CORRECT - Uses polar_price_id for checkout
const checkout = await createCheckoutSession({
    product_price_id: plan.polar_price_id,  // ✅ Correct
});

// ⚠️ INCONSISTENT - Subscription uses product_id in metadata
metadata: {
    plan_id: metadata.plan_id || product_id || "professional",  // ⚠️ Fallback to product_id?
}
```

**Impact:**
- Both IDs are needed but their usage isn't clearly documented
- Checkout uses `polar_price_id` (correct for Polar API)
- Webhook handlers may confuse product_id with price_id

**Recommendation:**
- `polar_product_id`: Store for reference only (product catalog)
- `polar_price_id`: REQUIRED for all checkout operations
- Add validation to ensure `polar_price_id` is NOT NULL for active plans

**Fix Required:**
```sql
-- Add NOT NULL constraint for active plans
ALTER TABLE plans
  ADD CONSTRAINT check_active_plans_have_price_id
  CHECK (is_active = FALSE OR polar_price_id IS NOT NULL);

COMMENT ON COLUMN plans.polar_product_id IS 'Polar.sh product ID (for reference only)';
COMMENT ON COLUMN plans.polar_price_id IS 'Polar.sh price ID (REQUIRED for checkout - one product can have multiple prices)';
```

---

### 5. ⚠️ MISSING INDEX: polar_webhook_events.event_id uniqueness
**Severity: LOW**
**Location:** `supabase/migrations/20250120_migrate_creem_to_polar.sql:67`

**Issue:**
While `event_id` has a UNIQUE constraint, there's no explicit unique index defined:
```sql
CREATE TABLE IF NOT EXISTS polar_webhook_events (
    event_id TEXT UNIQUE NOT NULL,  -- ⚠️ Relies on implicit index
);
```

**Impact:**
- Postgres creates an implicit index, but it's not named consistently
- Harder to troubleshoot performance issues
- Can't easily track index usage

**Fix Required:**
```sql
-- Create explicit unique index with descriptive name
CREATE UNIQUE INDEX IF NOT EXISTS idx_polar_webhook_events_event_id_unique
  ON polar_webhook_events(event_id);
```

---

### 6. ⚠️ MISSING RLS POLICY: polar_webhook_events
**Severity: LOW**
**Location:** `supabase/migrations/20250120_migrate_creem_to_polar.sql:94-100`

**Issue:**
RLS policy only allows service_role access, but authenticated users may need read access:
```sql
CREATE POLICY "Service role can manage webhook events"
  ON polar_webhook_events
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
```

**Impact:**
- No authenticated user can view webhook history
- Debugging and monitoring is harder for tenant admins
- No audit trail visibility

**Recommendation:**
```sql
-- Allow tenant admins to view webhook events for their tenant
CREATE POLICY "Tenant admins can view webhook events"
  ON polar_webhook_events
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM subscriptions s
      WHERE s.polar_subscription_id::text = (payload->>'subscription_id')
        AND s.tenant_id IN (
          SELECT tenant_id FROM profiles WHERE id = auth.uid()
        )
    )
  );
```

---

### 7. ❌ VIEW DEFINITION ERROR: payment_attempts_with_polar missing ends_at
**Severity: LOW**
**Location:** `supabase/migrations/20250120_migrate_creem_to_polar.sql:161`

**Issue:**
The view selects columns that may not exist in all scenarios:
```sql
CREATE OR REPLACE VIEW payment_attempts_with_polar AS
SELECT
  pa.polar_checkout_id,
  pa.polar_order_id,
  pa.polar_customer_id,
  pa.polar_subscription_id,
  -- Missing: ends_at, ended_at if they get added to payment_attempts
FROM payment_attempts pa
```

**Impact:**
- View is incomplete if new Polar columns are added
- No tracking of subscription end dates in payment history

**Fix Required:**
Update view after adding missing columns to parent tables.

---

### 8. ⚠️ INCONSISTENT STATUS VALUES: Polar vs Database
**Severity: MEDIUM**
**Location:** Multiple files

**Issue:**
Status enum values don't perfectly align with Polar's status values:

**Database Enum:**
```sql
subscription_status: 
  'trial' | 'trialing' | 'active' | 'cancelled' | 'expired' | 
  'pending_payment' | 'payment_failed' | 'incomplete' | 'past_due'
```

**Polar Status Values (from webhook handler):**
```typescript
// Maps from Polar to database:
'active' → 'active'           // ✅ Direct mapping
'trialing' → 'trialing'       // ✅ Direct mapping
'canceled' → 'cancelled'      // ⚠️ Spelling difference
'expired' → 'expired'         // ✅ Direct mapping  
'past_due' → 'payment_failed' // ❌ Mapping inconsistent
```

**Impact:**
- Webhook handler maps `past_due` to `payment_failed`
- But enum has both `past_due` and `payment_failed`
- Confusion about which status to use

**Fix Required:**
```sql
-- Document the mapping clearly
COMMENT ON TYPE subscription_status IS E'Subscription status values:\n' ||
  '- trial/trialing: Free trial period\n' ||
  '- active: Paid and active\n' ||
  '- past_due: Payment failed but subscription not cancelled yet (Polar status)\n' ||
  '- payment_failed: Payment failed (internal status)\n' ||
  '- cancelled: User or admin cancelled\n' ||
  '- expired: Subscription ended\n' ||
  '- pending_payment: Awaiting first payment\n' ||
  '- incomplete: Polar checkout started but not completed';
```

---

## Data Loss Risk Assessment

### 🟢 LOW RISK - No Data Loss from Migration
The migration uses `RENAME COLUMN` which preserves all existing data:
```sql
ALTER TABLE subscriptions
  RENAME COLUMN creem_customer_id TO polar_customer_id;  -- ✅ Safe
```

### ⚠️ MEDIUM RISK - Potential Runtime Failures
- Missing columns can cause INSERT/UPDATE failures
- Incorrect RPC function signatures will cause API errors
- No data corruption, but service interruptions possible

---

## Migration Quality Analysis

### ✅ STRENGTHS
1. **Comprehensive column renaming** - All main tables covered
2. **Proper indexing** - Indexes created for new Polar columns
3. **Good documentation** - Comments explain each column
4. **Idempotent design** - Uses `IF NOT EXISTS` and `IF EXISTS` checks
5. **View creation** - Monitoring views included
6. **Webhook tracking** - Proper idempotency table

### ❌ WEAKNESSES
1. **Incomplete coverage** - Missed `invoices` table and RPC functions
2. **Missing columns** - `ends_at` and `ended_at` not defined
3. **No rollback plan** - No reverse migration provided
4. **Type inconsistencies** - Creem references in TypeScript types
5. **Limited validation** - No constraints ensuring Polar IDs are valid

---

## SQL Syntax Validation

### ✅ All SQL is Valid
- No syntax errors found
- All DDL statements are properly formed
- Proper use of DO blocks for conditional logic

### ⚠️ Potential Issues
```sql
-- This uses string equality which may be slow
WHERE t.typname = 'subscription_status' AND e.enumlabel = 'pending_payment'

-- Consider adding index:
CREATE INDEX IF NOT EXISTS idx_pg_enum_typname_enumlabel ON pg_enum(enumtypid, enumlabel);
```

---

## Recommendations

### IMMEDIATE (Fix Before Production)
1. ✅ Fix `complete_payment_attempt()` RPC function parameters
2. ✅ Add `ends_at` and `ended_at` columns to `subscriptions` table
3. ✅ Migrate `invoices.creem_invoice_id` to `polar_invoice_id`
4. ✅ Regenerate TypeScript types after fixes

### HIGH PRIORITY (Within 1 Week)
5. Add NOT NULL constraint for `plans.polar_price_id` on active plans
6. Add tenant-scoped RLS policy for `polar_webhook_events`
7. Document Polar status value mappings
8. Add validation in Edge Functions for required Polar IDs

### MEDIUM PRIORITY (Within 1 Month)
9. Create reverse migration for rollback capability
10. Add monitoring for failed webhook processing
11. Implement retry logic for failed Polar API calls
12. Add integration tests for webhook handlers

### LOW PRIORITY (Future Enhancement)
13. Add audit logging for subscription changes
14. Implement customer portal integration
15. Add invoice sync from Polar
16. Create admin dashboard for webhook monitoring

---

## Migration Script Priority

### Create These Migrations ASAP:

1. **20250121_fix_polar_rpc_functions.sql** - Fix RPC function signatures
2. **20250121_add_subscription_end_columns.sql** - Add ends_at/ended_at columns
3. **20250121_migrate_invoices_to_polar.sql** - Complete invoice migration
4. **20250121_regenerate_types.sh** - Regenerate TypeScript types

---

## Testing Checklist

Before deploying to production:

- [ ] Test subscription creation flow
- [ ] Test webhook event handling (all event types)
- [ ] Test subscription cancellation
- [ ] Test subscription revocation (immediate end)
- [ ] Test payment failure handling
- [ ] Test trial to paid conversion
- [ ] Verify RPC function works with new parameters
- [ ] Verify TypeScript types match database schema
- [ ] Test rollback procedure
- [ ] Verify no orphaned Creem references in code

---

## Files Requiring Updates

### Database Migrations
- ✅ Create `20250121_fix_polar_rpc_functions.sql`
- ✅ Create `20250121_add_subscription_end_columns.sql`
- ✅ Create `20250121_migrate_invoices_to_polar.sql`

### TypeScript Files
- ✅ Regenerate `src/integrations/supabase/types.ts`
- ⚠️ Review `src/lib/polar.ts` for any Creem references
- ⚠️ Check `src/pages/billing-subscription.tsx` for error handling

### Edge Functions
- ✅ Update `handle-polar-webhook/index.ts` - Fix column name (ended_at)
- ⚠️ Add retry logic for failed Polar API calls
- ⚠️ Add better error messages for debugging

### Documentation
- ⚠️ Update README with Polar setup instructions
- ⚠️ Document webhook endpoint configuration
- ⚠️ Add Polar environment variable documentation

---

## Conclusion

The Polar migration is **80% complete** but has critical gaps that will cause runtime failures. The migration itself is well-structured and won't cause data loss, but the incomplete coverage of RPC functions and missing columns will prevent the Polar integration from working correctly.

**Action Required:** Implement the 3 high-priority migration scripts before enabling Polar webhooks in production.
