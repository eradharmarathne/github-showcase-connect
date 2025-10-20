# Beds24 Sync Function Fix

**Date:** 2025-01-20  
**Issue:** Edge Function returning 500 error when clicking sync button  
**Status:** ✅ RESOLVED

## Problem

When clicking the "Sync" button in Booking Channels Integration page, the `fetch-beds24-bookings` Edge Function was returning a 500 Internal Server Error.

### Root Cause

The Edge Function was trying to use Beds24 API credentials from **Deno environment variables** (`BEDS24_REFRESH_TOKEN`), but the application architecture stores credentials in the **`beds24_credentials` database table** per location. This caused the function to fail immediately when trying to refresh the access token.

```typescript
// OLD CODE (BROKEN)
async function refreshAccessToken() {
  const refreshToken = Deno.env.get("BEDS24_REFRESH_TOKEN"); // ❌ Doesn't exist
  if (!refreshToken) {
    throw new Error("Missing Beds24 refresh token (BEDS24_REFRESH_TOKEN)");
  }
  // ...
}
```

## Solution

### 1. Updated Edge Function Architecture

**File:** `supabase/functions/fetch-beds24-bookings/index.ts`

#### Changes:
- **Added credential fetching from database:**
  ```typescript
  // Fetch Beds24 credentials from database
  let credQuery = supabase
    .from("beds24_credentials")
    .select("*")
    .eq("is_active", true);
  
  if (tenantId) {
    credQuery = credQuery.eq("tenant_id", tenantId);
  }
  if (locationId) {
    credQuery = credQuery.eq("location_id", locationId);
  }
  
  const { data: credentials, error: credError } = await credQuery.limit(1).single();
  ```

- **Updated token management functions to use database credentials:**
  ```typescript
  async function refreshAccessToken(
    supabase: any,
    credentialId: string,
    refreshToken: string,
  ) {
    // Refresh token logic
    // ...
    
    // Update database with new access token
    const { error: updateError } = await supabase
      .from("beds24_credentials")
      .update({
        access_token: newAccessToken,
        token_expires_at: expiresAt.toISOString(),
      })
      .eq("id", credentialId);
  }
  ```

- **Updated API request function to accept credentials as parameters:**
  ```typescript
  async function beds24Request(
    path: string,
    supabase: any,
    credentialId: string,
    accessToken: string,
    tokenExpiresAt: Date,
    refreshToken: string,
  )
  ```

- **Added `location_id` parameter support** (previously only accepted `tenant_id`)

- **Added error handling for missing credentials:**
  ```typescript
  if (credError || !credentials) {
    return new Response(
      JSON.stringify({
        success: false,
        error: "No Beds24 credentials configured. Please connect your Beds24 account first.",
        code: "NO_CREDENTIALS",
        timestamp: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  }
  ```

### 2. Updated Frontend

**File:** `src/pages/booking-channels-integration.tsx`

#### Changes:
- **Frontend now passes both `tenant_id` AND `location_id`:**
  ```typescript
  const response = await supabase.functions.invoke("fetch-beds24-bookings", {
    body: {
      tenant_id: tenant.id,
      location_id: selectedLocation, // ✅ Added
    },
  });
  ```

- **Added location validation before sync:**
  ```typescript
  if (!selectedLocation) {
    toast.error("Please select a location first");
    return;
  }
  ```

- **Added error handling for NO_CREDENTIALS:**
  ```typescript
  if (responseData?.code === "NO_CREDENTIALS") {
    toast.error("Please connect your Beds24 account first in the Settings tab");
  } else if (responseData?.code === "NO_MAPPINGS") {
    toast.error("Please configure Beds24 property mappings in the Settings tab first");
  }
  ```

## Database Architecture

### `beds24_credentials` Table
Stores OAuth credentials per location:
```sql
CREATE TABLE beds24_credentials (
  id UUID PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id),
  location_id UUID REFERENCES locations(id), -- Per-location credentials
  refresh_token TEXT NOT NULL,
  access_token TEXT,
  token_expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  last_synced_at TIMESTAMPTZ,
  sync_status TEXT,
  CONSTRAINT unique_tenant_location_beds24 UNIQUE(tenant_id, location_id)
);
```

### Flow Diagram
```
Frontend (Booking Channels Page)
  ↓ Passes: tenant_id + location_id
Edge Function (fetch-beds24-bookings)
  ↓ Queries: beds24_credentials table
Database
  ↓ Returns: refresh_token, access_token, token_expires_at
Edge Function
  ↓ Calls: Beds24 API v2 with token
Beds24 API
  ↓ Returns: Bookings JSON
Edge Function
  ↓ Upserts: external_bookings table
Database
```

## Testing

### Prerequisites
1. ✅ Beds24 account connected (credentials in `beds24_credentials`)
2. ✅ Property mappings configured (entries in `beds24_property_mappings`)
3. ✅ Active location selected in frontend

### Test Steps
1. Navigate to Booking Channels Integration page
2. Select a location that has Beds24 connected
3. Click "Sync" button
4. Expected result: Success toast with number of bookings synced

### Error Scenarios
- **No credentials:** Returns `NO_CREDENTIALS` error code
- **No property mappings:** Returns `NO_MAPPINGS` error code
- **Token expired:** Automatically refreshes token and retries
- **Beds24 API error:** Returns error with status details

## Deployment

```bash
# Deploy updated Edge Function
supabase functions deploy fetch-beds24-bookings
```

**Deployment Date:** 2025-01-20  
**Deployment Status:** ✅ Success  
**Project:** takovelbhvoqnvfmnhaq

## Related Files

### Edge Functions
- `supabase/functions/fetch-beds24-bookings/index.ts` - Main sync function (UPDATED)
- `supabase/functions/beds24-token-exchange/index.ts` - OAuth token exchange (Already updated)

### Frontend
- `src/pages/booking-channels-integration.tsx` - UI and sync trigger (UPDATED)

### Database Migrations
- `supabase/migrations/20251020_update_beds24_credentials_add_location_id.sql` - Location-level credentials
- `supabase/migrations/20251020155826_fix_beds24_property_mappings_rls_policies.sql` - RLS policies fix

## Git Commits

1. `f015f4f` - fix: use 'villa' instead of 'location' for mapping_type
2. `d6c60a7` - fix: fetch-beds24-bookings function now uses database credentials instead of env variables

## Key Learnings

1. **Multi-tenant architecture requires location-level credential isolation** - Each location has separate Beds24 accounts
2. **Edge Functions must query database for dynamic credentials** - Cannot rely on static environment variables
3. **Token management should update database** - Allows credential reuse across function invocations
4. **Consistent parameter passing** - Both frontend and Edge Function must use same filter parameters (tenant_id + location_id)

## Next Steps

- [ ] Monitor sync success rate in production
- [ ] Add automated tests for Edge Function
- [ ] Consider adding retry logic for transient Beds24 API failures
- [ ] Add sync status tracking in UI (last sync time, success/failure count)
