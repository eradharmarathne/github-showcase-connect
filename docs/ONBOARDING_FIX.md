# Onboarding Profile Update Fix

## Issue
During onboarding in production, creating a tenant fails with RLS policy error:
```
new row violates row-level security policy for table "profiles"
```

This happens when trying to update `profiles.tenant_id` during the onboarding flow.

## Root Cause
The RLS policy on the `profiles` table blocks updates when the user doesn't yet have a `tenant_id`. During onboarding, the user is creating their first tenant, so they don't have one yet - creating a chicken-and-egg problem.

## Solution
Created a SECURITY DEFINER function that bypasses RLS for this specific operation.

### Step 1: Run this SQL in Supabase SQL Editor

Go to: https://supabase.com/dashboard/project/takovelbhvoqnvfmnhaq/sql/new

```sql
-- Fix profile update during onboarding
-- Issue: RLS policy blocks profile.tenant_id update during onboarding
-- Solution: Create a SECURITY DEFINER function that bypasses RLS

-- Function to update profile tenant_id during onboarding
CREATE OR REPLACE FUNCTION update_profile_tenant_id(
  p_profile_id UUID,
  p_tenant_id UUID,
  p_role TEXT DEFAULT 'admin'
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER -- This allows the function to bypass RLS
SET search_path = public
AS $$
BEGIN
  -- Update the profile with tenant_id
  UPDATE profiles
  SET
    tenant_id = p_tenant_id,
    role = p_role,
    updated_at = NOW()
  WHERE id = p_profile_id;

  -- Verify the user owns this profile (additional security check)
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found or access denied';
  END IF;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION update_profile_tenant_id(UUID, UUID, TEXT) TO authenticated;

-- Add comment
COMMENT ON FUNCTION update_profile_tenant_id IS 'Updates profile tenant_id during onboarding, bypassing RLS';
```

### Step 2: Code Changes (Already Applied)

Updated `src/pages/onboarding.tsx` to use the RPC function instead of direct update:

**Before:**
```typescript
const { error: profileError } = await supabase
  .from("profiles")
  .update({
    tenant_id: tenant.id,
    role: "admin",
  })
  .eq("id", user!.id);
```

**After:**
```typescript
const { error: profileError } = await supabase.rpc(
  "update_profile_tenant_id",
  {
    p_profile_id: user!.id,
    p_tenant_id: tenant.id,
    p_role: "admin",
  },
);
```

## Testing

After running the SQL:
1. Go to production onboarding page
2. Create a new tenant
3. Subscribe to a plan
4. Should now successfully create tenant and update profile

## Security Note

The `SECURITY DEFINER` function is safe because:
1. It only updates the specific user's own profile (`p_profile_id` must match the authenticated user)
2. It only updates `tenant_id` and `role` fields
3. It includes a NOT FOUND check for additional security
4. It's only granted to `authenticated` users (not anonymous)
