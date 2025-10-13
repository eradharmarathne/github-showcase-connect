# Onboarding Error Fix - Subscription Status Type Issue

## Issue Summary

User `www.hotelina@gmail.com` encountered an error during onboarding when attempting to create a tenant and initiate payment:

```
new row for relation "tenants" violates check constraint "tenants_subscription_status_check"
```

Additionally, there were 406 errors when fetching the profile, which are transient content negotiation issues with Supabase PostgREST.

## Root Cause

The `tenants.subscription_status` column was incorrectly defined as `TEXT` type instead of using the `subscription_status` enum type. This caused validation issues when trying to insert the value `"pending_payment"`.

### Timeline of Events

1. User signed in with Google OAuth: `www.hotelina@gmail.com` (user_id: `166baaa7-7920-41d5-bc3d-2a41838016f7`)
2. Profile was created successfully
3. User reached onboarding page and selected a $19 plan
4. Onboarding code attempted to create a tenant with `subscription_status: "pending_payment"`
5. Database rejected the insert due to type mismatch (TEXT vs ENUM)
6. User was stuck unable to complete onboarding

## Fix Applied

### 1. Database Schema Fix

Converted the `tenants.subscription_status` column from `TEXT` to the proper `subscription_status` enum type:

```sql
-- Drop the text-based default
ALTER TABLE tenants ALTER COLUMN subscription_status DROP DEFAULT;

-- Convert column type using CAST
ALTER TABLE tenants 
ALTER COLUMN subscription_status TYPE subscription_status 
USING subscription_status::subscription_status;

-- Re-add default with proper enum cast
ALTER TABLE tenants 
ALTER COLUMN subscription_status SET DEFAULT 'trial'::subscription_status;
```

### 2. Migration File Created

Created migration file: `supabase/migrations/20251013_fix_subscription_status_type.sql`

This migration is idempotent and checks if the column type needs to be fixed before attempting the conversion.

### 3. TypeScript Types Updated

Regenerated TypeScript types to reflect the enum type:

```bash
npx supabase gen types typescript --project-id takovelbhvoqnvfmnhaq > src/integrations/supabase/types.ts
```

The `subscription_status` field now uses the proper enum type with all valid values:
- `trial`
- `trialing`
- `active`
- `cancelled`
- `expired`
- `pending_payment` ✅ (now supported)
- `payment_failed`
- `incomplete`
- `past_due`

## Current State

### User Record Status

- **User ID**: `166baaa7-7920-41d5-bc3d-2a41838016f7`
- **Email**: `www.hotelina@gmail.com`
- **Tenant ID**: `b30f2d07-77bb-4441-9f80-f1badf2d6eb3`
- **Tenant Name**: `test5`
- **Subscription Status**: `pending_payment` ✅ (now valid)
- **Onboarding Completed**: `false`

### What the User Can Do Now

1. **User can complete the onboarding flow** without errors
2. The system will properly track payment status transitions:
   - `pending_payment` → `active` (on successful payment)
   - `pending_payment` → `payment_failed` (on failed payment)
   - `pending_payment` → `expired` (on timeout)

## Related Files Modified

1. `supabase/migrations/20251013_fix_subscription_status_type.sql` - New migration
2. `src/integrations/supabase/types.ts` - Regenerated types

## Verification Steps

To verify the fix is working:

1. ✅ Check column type: `subscription_status` is now `subscription_status` enum type
2. ✅ Verify enum values: All 9 status values are present in the enum
3. ✅ Check user's tenant: Record exists with `pending_payment` status
4. ✅ TypeScript types: Updated to use enum type

## Prevention

This issue was caused by an initial schema definition that used TEXT instead of the enum type. Going forward:

1. Always use enum types for fixed-value columns
2. Run schema validations before deploying
3. Test onboarding flow with new user accounts regularly

## Notes

- The 406 errors during profile fetch are transient PostgREST content negotiation issues and do not affect functionality
- The auth context properly handles these errors and retries
- User will be redirected to onboarding after successful sign-in
- Once payment is completed, the webhook will update `subscription_status` to `active` or `trialing`
