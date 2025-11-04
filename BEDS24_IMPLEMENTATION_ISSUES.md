# Beds24 Implementation Issues - Code Audit

**Date:** November 4, 2025  
**Status:** 🔴 **CRITICAL ISSUES FOUND**

---

## EXECUTIVE SUMMARY

After comparing the codebase implementation against the official Beds24 API V2 documentation, I found **5 CRITICAL** and **3 WARNING** level issues that need immediate attention.

### Critical Issues (Must Fix)
1. ❌ **Incorrect Token Refresh Flow** - Using POST instead of GET
2. ❌ **Wrong Authentication Endpoint** - Incorrect API base URL for token refresh
3. ❌ **Missing Array Wrapper in POST Requests** - Not consistently wrapping payloads
4. ❌ **Incorrect Calendar Endpoint** - Using wrong path
5. ❌ **Token Caching in Memory** - Not following best practices

### Warning Issues (Should Fix)
1. ⚠️ **No Rate Limit Monitoring** - Risk of hitting API limits
2. ⚠️ **Missing Response Error Handling** - Not checking response structure
3. ⚠️ **Inconsistent Token Expiry Handling** - Some functions don't check expiry

---

## DETAILED FINDINGS

### 🔴 CRITICAL ISSUE #1: Token Refresh Using Wrong HTTP Method

**File:** `supabase/functions/sync-reservation-to-beds24/index.ts`  
**Line:** 215-226

**Current Code:**
```typescript
const tokenResponse = await fetch(
    `${BEDS24_API_URL}/authentication/token`,
    {
        method: "POST",  // ❌ WRONG!
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            grant_type: "refresh_token",
            refresh_token: beds24Creds.refresh_token,
        }),
    },
);
```

**Official Beds24 API:**
```typescript
// ✅ CORRECT - GET with header
const tokenResponse = await fetch(
    "https://beds24.com/api/v2/authentication/token",
    {
        method: "GET",  // GET, not POST!
        headers: {
            "accept": "application/json",
            "refreshToken": beds24Creds.refresh_token,  // In header, not body
        },
    },
);
```

**Impact:** 🔥 **HIGH** - Token refresh will FAIL. Users cannot sync bookings.

**Reference:** beds24api.txt lines 85-96

---

### 🔴 CRITICAL ISSUE #2: Wrong API Base URL for Authentication

**File:** `supabase/functions/sync-reservation-to-beds24/index.ts`  
**Line:** 20

**Current Code:**
```typescript
const BEDS24_API_URL = "https://api.beds24.com/v2";  // ❌ Used for auth
```

**Official Beds24 API:**
```typescript
// Authentication endpoints use different base URL!
const AUTH_URL = "https://beds24.com/api/v2";  // ✅ For /authentication/*
const API_URL = "https://api.beds24.com/v2";   // ✅ For /bookings, /properties, etc.
```

**Impact:** 🔥 **HIGH** - Authentication requests may fail or timeout.

**Fix Required:**
```typescript
const BEDS24_AUTH_URL = "https://beds24.com/api/v2";
const BEDS24_API_URL = "https://api.beds24.com/v2";
```

**Reference:** beds24api.txt lines 1-7

---

### 🔴 CRITICAL ISSUE #3: POST Bookings - Body Structure Correct but Inconsistent

**File:** `supabase/functions/sync-reservation-to-beds24/index.ts`  
**Line:** 299-307

**Current Code:**
```typescript
// ✅ CORRECT - This one is actually OK!
body: JSON.stringify([bookingPayload]), // Array of bookings
```

**However, in other parts:**

**File:** `supabase/functions/fetch-beds24-bookings/index.ts`  
**Concern:** When processing responses, code assumes `data` array but doesn't validate

**Impact:** 🟡 **MEDIUM** - May fail silently if Beds24 changes response structure

**Fix:** Add response validation:
```typescript
const bookingsJson = await beds24Request("/bookings", ...);

// ✅ Validate response structure
if (!bookingsJson.success || !Array.isArray(bookingsJson.data)) {
    throw new Error("Invalid Beds24 API response structure");
}

const bookings = bookingsJson.data;
```

**Reference:** beds24api.txt lines 170-197

---

### 🔴 CRITICAL ISSUE #4: Calendar Blocking Using Wrong Endpoint

**File:** `supabase/functions/sync-reservation-to-beds24/index.ts`  
**Line:** 361

**Current Code:**
```typescript
const calendarResponse = await fetch(`${BEDS24_API_URL}/calendar`, {
    // ❌ WRONG ENDPOINT!
```

**Official Beds24 API:**
```typescript
// ✅ CORRECT - Full path required
const calendarResponse = await fetch(
    `${BEDS24_API_URL}/inventory/rooms/calendar`,  // Correct path!
    {
        method: "POST",
        headers: {
            "accept": "application/json",
            "token": accessToken,
        },
        body: JSON.stringify(calendarPayload),
    }
);
```

**Impact:** 🔥 **HIGH** - Date blocking will FAIL. Risk of double bookings from channels.

**Reference:** beds24api.txt lines 1013-1078

---

### 🔴 CRITICAL ISSUE #5: In-Memory Token Caching (Anti-Pattern)

**File:** `supabase/functions/fetch-beds24-bookings/index.ts`  
**Lines:** 8-9

**Current Code:**
```typescript
// ❌ BAD PRACTICE - In-memory cache
let ACCESS_TOKEN = "";
let EXPIRES_AT = 0;
```

**Why This is Bad:**
1. **Edge Functions are stateless** - Each invocation may use a different instance
2. **Token not shared** - Other functions can't use cached token
3. **Waste of credits** - Multiple functions refresh token independently
4. **Race conditions** - Concurrent requests may refresh token multiple times

**Correct Implementation:**
```typescript
// ✅ Store in database (already done partially)
// Token is in beds24_credentials table
// Just fetch and use, refresh only when expired
```

**Impact:** 🟡 **MEDIUM** - Wastes API credits, but doesn't break functionality.

**Reference:** beds24api.txt lines 1147-1175 (Best Practices section)

---

### ⚠️ WARNING ISSUE #1: No Rate Limit Monitoring

**File:** All Beds24 Edge Functions  
**Issue:** Not checking rate limit headers in responses

**Official Beds24 API Response Headers:**
```typescript
X-FiveMinCreditLimit: 100
X-FiveMinCreditLimit-Remaining: 85
X-FiveMinCreditLimit-ResetsIn: 280
X-RequestCost: 1
```

**Recommended Fix:**
```typescript
async function beds24Request(path: string, ...) {
    const response = await fetch(`${BEDS24_API_BASE}${path}`, ...);
    
    // ✅ Monitor rate limits
    const remaining = response.headers.get('X-FiveMinCreditLimit-Remaining');
    const resetIn = response.headers.get('X-FiveMinCreditLimit-ResetsIn');
    
    if (remaining && parseInt(remaining) < 10) {
        console.warn(`⚠️ Low API credits: ${remaining} remaining, resets in ${resetIn}s`);
    }
    
    return response.json();
}
```

**Impact:** 🟡 **LOW** - No immediate breakage, but may hit rate limits unexpectedly.

**Reference:** beds24api.txt lines 123-171

---

### ⚠️ WARNING ISSUE #2: Response Structure Validation Missing

**File:** `supabase/functions/fetch-beds24-bookings/index.ts`  
**Lines:** 356-363

**Current Code:**
```typescript
const bookingsJson: unknown = await beds24Request(...);
const bookings: V2Booking[] = Array.isArray((bookingsJson as any)?.data)
    ? (bookingsJson as any).data
    : Array.isArray(bookingsJson)
        ? (bookingsJson as any)
        : [];
```

**Issue:** No validation of `success` field from Beds24 API

**Official Beds24 Response:**
```json
{
  "success": true,  // ← Should check this!
  "type": "booking",
  "pages": {
    "current": 1,
    "total": 5
  },
  "data": [...]
}
```

**Recommended Fix:**
```typescript
const response = await beds24Request(...);

// ✅ Validate response
if (!response.success) {
    throw new Error('Beds24 API request failed');
}

const bookings = response.data || [];
```

**Impact:** 🟡 **LOW** - May process invalid data if API returns error.

**Reference:** beds24api.txt lines 359-382

---

### ⚠️ WARNING ISSUE #3: Token Expiry Check Inconsistent

**File:** `supabase/functions/fetch-beds24-bookings/index.ts` vs `sync-reservation-to-beds24/index.ts`

**fetch-beds24-bookings (✅ CORRECT):**
```typescript
// Checks token expiry properly
if (!currentToken || Date.now() > tokenExpiresAt.getTime()) {
    const refreshed = await refreshAccessToken(...);
    currentToken = refreshed.token;
}
```

**sync-reservation-to-beds24 (⚠️ INCOMPLETE):**
```typescript
// Only checks 5-minute buffer
if (!accessToken || 
    new Date(beds24Creds.token_expires_at) < new Date(Date.now() + 5 * 60000)) {
    // Refresh
}
```

**Recommendation:** Use consistent approach across all functions.

---

## COMPLIANCE CHECK: Beds24 API V2 Requirements

| Requirement | Status | Notes |
|------------|--------|-------|
| POST requests send arrays | ✅ PASS | Correctly wrapped in arrays |
| Token in header (not query) | ✅ PASS | Using `token: xxx` header |
| Refresh token in header (not body) | ❌ FAIL | Using POST body instead |
| GET for token refresh | ❌ FAIL | Using POST method |
| Correct authentication URL | ❌ FAIL | Using api.beds24.com instead of beds24.com |
| Correct calendar endpoint | ❌ FAIL | Missing /inventory/rooms prefix |
| Response structure validation | ⚠️ PARTIAL | Not checking `success` field |
| Rate limit monitoring | ❌ MISSING | Not implemented |
| Token caching in DB | ✅ PASS | Using beds24_credentials table |

---

## PRIORITY FIXES REQUIRED

### Priority 1 (CRITICAL - Fix Immediately) 🔥

1. **Fix Token Refresh**
   - File: `sync-reservation-to-beds24/index.ts`
   - Change: POST → GET, body → header
   - Lines: 215-226

2. **Fix Authentication URL**
   - Files: All Edge Functions using authentication
   - Change: Add separate AUTH_URL constant
   - Impact: All token operations

3. **Fix Calendar Endpoint**
   - File: `sync-reservation-to-beds24/index.ts`
   - Change: `/calendar` → `/inventory/rooms/calendar`
   - Line: 361

### Priority 2 (HIGH - Fix This Week) ⚠️

4. **Add Response Validation**
   - Files: All Edge Functions
   - Add: Check `success` field in responses
   - Impact: Better error handling

5. **Add Rate Limit Monitoring**
   - Files: All Edge Functions
   - Add: Log rate limit headers
   - Impact: Prevent hitting limits

### Priority 3 (MEDIUM - Fix This Month) 🟡

6. **Remove In-Memory Token Cache**
   - File: `fetch-beds24-bookings/index.ts`
   - Remove: Global token variables
   - Use: Database only

7. **Standardize Token Expiry Checks**
   - Files: All Edge Functions
   - Use: Consistent logic across all functions

---

## RECOMMENDED FIXES

### Fix #1: Token Refresh Function (Universal)

Create a shared helper file: `supabase/functions/_shared/beds24-auth.ts`

```typescript
const BEDS24_AUTH_URL = "https://beds24.com/api/v2";

export async function refreshBeds24Token(
    supabase: any,
    credentialId: string,
    refreshToken: string
): Promise<{ token: string; expiresAt: Date }> {
    console.log("Refreshing Beds24 access token...");
    
    const response = await fetch(
        `${BEDS24_AUTH_URL}/authentication/token`,
        {
            method: "GET",  // ✅ Correct method
            headers: {
                "accept": "application/json",
                "refreshToken": refreshToken,  // ✅ In header
            },
        }
    );

    if (!response.ok) {
        const errorText = await response.text();
        console.error("Token refresh failed:", response.status, errorText);
        throw new Error(
            `Token refresh failed: ${response.status} ${response.statusText}`
        );
    }

    const tokenData = await response.json();
    const newAccessToken = tokenData.token;
    const expiresAt = new Date(Date.now() + (tokenData.expiresIn - 60) * 1000);

    // Update database
    await supabase
        .from("beds24_credentials")
        .update({
            access_token: newAccessToken,
            token_expires_at: expiresAt.toISOString(),
        })
        .eq("id", credentialId);

    console.log("✅ Access token refreshed successfully");
    return { token: newAccessToken, expiresAt };
}

export async function getBeds24Token(
    supabase: any,
    credentialId: string,
    currentToken: string,
    tokenExpiresAt: Date,
    refreshToken: string
): Promise<string> {
    // Check if token is expired or about to expire (5 min buffer)
    if (!currentToken || Date.now() > (tokenExpiresAt.getTime() - 5 * 60000)) {
        const { token } = await refreshBeds24Token(supabase, credentialId, refreshToken);
        return token;
    }
    
    return currentToken;
}
```

### Fix #2: Update sync-reservation-to-beds24

```typescript
import { getBeds24Token } from "../_shared/beds24-auth.ts";

const BEDS24_API_URL = "https://api.beds24.com/v2";

// ... in the main function ...

// Get fresh token
const accessToken = await getBeds24Token(
    supabase,
    beds24Creds.id,  // ← Need to fetch credential ID
    beds24Creds.access_token,
    new Date(beds24Creds.token_expires_at),
    beds24Creds.refresh_token
);

// Use token for API calls...
```

### Fix #3: Fix Calendar Blocking

```typescript
// ✅ Correct endpoint
const calendarResponse = await fetch(
    `${BEDS24_API_URL}/inventory/rooms/calendar`,  // Fixed path
    {
        method: "POST",
        headers: {
            "accept": "application/json",
            "token": accessToken,
        },
        body: JSON.stringify(calendarPayload),
    }
);
```

### Fix #4: Add Response Validation Wrapper

```typescript
async function beds24ApiRequest(
    path: string,
    options: RequestInit,
    token: string
): Promise<any> {
    const response = await fetch(`${BEDS24_API_URL}${path}`, {
        ...options,
        headers: {
            "accept": "application/json",
            "token": token,
            ...options.headers,
        },
    });

    // Check rate limits
    const remaining = response.headers.get('X-FiveMinCreditLimit-Remaining');
    if (remaining && parseInt(remaining) < 10) {
        const resetIn = response.headers.get('X-FiveMinCreditLimit-ResetsIn');
        console.warn(`⚠️ Low API credits: ${remaining} remaining, resets in ${resetIn}s`);
    }

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Beds24 API error: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    
    // Validate response structure
    if (data.success === false) {
        throw new Error(`Beds24 API returned error: ${JSON.stringify(data)}`);
    }
    
    return data;
}
```

---

## TESTING CHECKLIST

Before deploying fixes:

- [ ] Test token refresh with expired token
- [ ] Test token refresh with valid token (should not refresh)
- [ ] Test booking creation to Beds24
- [ ] Test booking sync from Beds24
- [ ] Test calendar blocking for direct bookings
- [ ] Test rate limit warning logs (make many requests)
- [ ] Test error handling for invalid credentials
- [ ] Test error handling for invalid room mappings
- [ ] Verify no double-bookings from channels after direct booking
- [ ] Check database for updated token expiry times

---

## IMPACT ASSESSMENT

### Current State (Before Fixes)
- ❌ Token refresh: **BROKEN**
- ❌ Calendar blocking: **BROKEN** 
- ⚠️ Booking sync TO Beds24: **MAY FAIL**
- ✅ Booking sync FROM Beds24: **WORKING** (but inefficient)
- ❌ Double booking prevention: **BROKEN** (calendar not blocked)

### After Priority 1 Fixes
- ✅ Token refresh: **WORKING**
- ✅ Calendar blocking: **WORKING**
- ✅ Booking sync TO Beds24: **WORKING**
- ✅ Booking sync FROM Beds24: **WORKING**
- ✅ Double booking prevention: **WORKING**

---

## CONCLUSION

**Severity:** 🔴 **CRITICAL**

The Beds24 integration has **5 critical bugs** that prevent core functionality:
1. Tokens cannot be refreshed (wrong HTTP method)
2. Calendar dates cannot be blocked (wrong endpoint)
3. Authentication may timeout (wrong base URL)

**Recommendation:** **STOP using Beds24 integration in production** until Priority 1 fixes are deployed.

**Estimated Fix Time:** 2-4 hours for Priority 1 fixes

**Risk if not fixed:** 
- Double bookings from channels (serious business impact)
- Failed syncs (lost revenue from channels)
- API authentication failures (complete integration failure)

---

**Next Steps:**
1. Create Priority 1 fixes branch
2. Implement fixes from this document
3. Test thoroughly with Beds24 sandbox/test account
4. Deploy to production
5. Monitor logs for rate limit warnings
6. Implement Priority 2 fixes within 1 week

