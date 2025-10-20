# Beds24 Integration Troubleshooting Guide

## Common Issues and Solutions

### ❌ Issue: CORS Error on Token Exchange

**Error Message:**
```
Access to fetch at 'https://takovelbhvoqnvfmnhaq.supabase.co/functions/v1/channel-token-exchange' 
from origin 'http://localhost:8080' has been blocked by CORS policy: 
Response to preflight request doesn't pass access control check: It does not have HTTP ok status.
```

**Root Cause:**
Frontend code was calling a non-existent Edge Function `channel-token-exchange` instead of the actual function `beds24-token-exchange`.

**Solution:**
✅ **Fixed in commit 3d4e274** - Updated frontend to call correct function name `beds24-token-exchange`

**Verification:**
1. Check that the Edge Function exists:
   ```bash
   # List deployed Edge Functions
   supabase functions list
   
   # Should show: beds24-token-exchange (ACTIVE)
   ```

2. Test the function call:
   ```typescript
   // Correct call (requires inviteCode, locationId, and tenantId)
   await supabase.functions.invoke("beds24-token-exchange", {
     body: { 
       inviteCode: "YOUR_INVITE_CODE",
       locationId: "YOUR_LOCATION_UUID",
       tenantId: "YOUR_TENANT_UUID"
     }
   });
   ```

---

### ❌ Issue: Token Exchange Returns Error

**Error Message:**
```
Token exchange error: FunctionsFetchError: Failed to send a request to the Edge Function
```

**Possible Causes:**

#### 1. Edge Function Not Deployed
**Check:**
```bash
supabase functions list
```

**Solution:**
```bash
supabase functions deploy beds24-token-exchange
```

#### 2. Invalid Invite Code
**Check:**
- Invite code must be from Beds24 dashboard (Settings → API & Webhooks)
- Code is a long encrypted string (URL-encoded)
- Code hasn't expired

**Solution:**
Generate new invite code from Beds24:
1. Log in to Beds24 account
2. Settings → API & Webhooks → API v2
3. Generate new invite code
4. Copy the full string (including special characters)

#### 3. Network/Firewall Issues
**Check:**
- Can reach Beds24 API: `https://beds24.com/api/v2/authentication/setup`
- No firewall blocking Supabase Edge Functions
- CORS headers properly configured in Edge Function

**Solution:**
Test manually:
```bash
curl -X GET "https://beds24.com/api/v2/authentication/setup" \
  -H "accept: application/json" \
  -H "inviteCode: YOUR_INVITE_CODE"
```

---

### ❌ Issue: "No Mappings Found" During Sync

**Error Message:**
```
⚠️ No Beds24 property mappings configured yet
```

**Root Cause:**
No properties mapped between Beds24 and your locations.

**Solution:**

1. **Navigate to Booking Channels Integration page**
2. **Go to Settings tab**
3. **Add Property Mapping:**
   - Enter exact Beds24 property name
   - Select your CheckingCheckout location
   - Click "Add Property Mapping"

**Example:**
```
Beds24 Property Name: "Rusty Lake Hotel - Room 101"
CheckingCheckout Location: "Rusty Lake Kandy"
```

**Verify in Database:**
```sql
SELECT * FROM channel_property_mappings 
WHERE tenant_id = 'your-tenant-id' 
AND is_active = true;
```

---

### ❌ Issue: Bookings Not Syncing

**Symptoms:**
- "Sync Now" button completes but no bookings appear
- Total bookings shows 0

**Debugging Steps:**

#### 1. Check Property Mappings
```sql
-- Verify mappings exist
SELECT 
  cpm.channel_property_name,
  l.name as location_name,
  cpm.is_active
FROM channel_property_mappings cpm
JOIN locations l ON l.id = cpm.location_id
WHERE cpm.tenant_id = 'your-tenant-id';
```

#### 2. Check Edge Function Logs
Via Supabase Dashboard:
1. Edge Functions → `fetch-beds24-bookings` → Logs
2. Look for:
   - ✅ "Successfully synced X bookings"
   - ⚠️ "No mapping found for property ID: X"
   - ❌ "Token refresh failed"

#### 3. Verify Beds24 API Access
Test API connection:
```bash
# Check if refresh token works
curl -X GET "https://beds24.com/api/v2/authentication/token" \
  -H "accept: application/json" \
  -H "refreshToken: YOUR_REFRESH_TOKEN"
```

#### 4. Check Raw Bookings Data
```sql
-- Check if any bookings exist
SELECT 
  external_id,
  property_id,
  source,
  guest_name,
  check_in,
  check_out,
  status
FROM external_bookings
WHERE tenant_id = 'your-tenant-id'
ORDER BY created_at DESC
LIMIT 10;
```

**Common Issues:**

1. **Property ID Mismatch**
   - Beds24 property ID doesn't match mapping
   - Solution: Check property IDs in Beds24 dashboard

2. **Tenant ID Filter**
   - Bookings exist but filtered by wrong tenant
   - Solution: Verify correct tenant selected

3. **Location Selection**
   - Wrong location selected in dropdown
   - Solution: Select location that has property mappings

---

### ❌ Issue: Refresh Token Expired/Invalid

**Error Message:**
```
Token refresh failed: 401 Unauthorized
```

**Root Cause:**
- Refresh token expired
- Token revoked in Beds24
- Token stored incorrectly in Supabase secrets

**Solution:**

1. **Generate New Invite Code:**
   - Beds24 Dashboard → Settings → API v2
   - Generate new invite code

2. **Exchange for New Refresh Token:**
   ```bash
   # Via Edge Function
   curl -X POST "YOUR_SUPABASE_URL/functions/v1/beds24-token-exchange" \
     -H "Content-Type: application/json" \
     -H "apikey: YOUR_ANON_KEY" \
     -d '{"inviteCode": "NEW_INVITE_CODE"}'
   ```

3. **Update Supabase Secret:**
   - Supabase Dashboard → Settings → Edge Functions → Secrets
   - Update `BEDS24_REFRESH_TOKEN` with new value

4. **Test:**
   - Click "Sync Now" in Booking Channels page
   - Should sync successfully

---

### ❌ Issue: Duplicate Bookings

**Symptoms:**
- Same booking appears multiple times
- Booking count keeps increasing on sync

**Root Cause:**
Unique constraint not working properly (should be on `external_id`, `property_id`, `source`).

**Check:**
```sql
-- Find duplicates
SELECT 
  external_id,
  property_id,
  source,
  COUNT(*) as count
FROM external_bookings
WHERE tenant_id = 'your-tenant-id'
GROUP BY external_id, property_id, source
HAVING COUNT(*) > 1;
```

**Solution:**
```sql
-- Remove duplicates (keep most recent)
DELETE FROM external_bookings
WHERE id IN (
  SELECT id FROM (
    SELECT id,
      ROW_NUMBER() OVER (
        PARTITION BY external_id, property_id, source 
        ORDER BY last_synced_at DESC
      ) as rn
    FROM external_bookings
  ) t
  WHERE t.rn > 1
);
```

---

### ❌ Issue: Old Bookings Still Showing

**Symptoms:**
- Checked-out bookings appear in list
- Cancelled bookings not removed

**Expected Behavior:**
- Beds24 sync updates status automatically
- Old bookings remain in database for history

**Filtering:**
Use status filter in UI:
- "Confirmed" - Active bookings
- "Checked In" - Guests currently staying
- "Checked Out" - Past bookings
- "Cancelled" - Cancelled reservations

**Archive Old Bookings (Optional):**
```sql
-- Archive bookings older than 1 year
CREATE TABLE external_bookings_archive AS
SELECT * FROM external_bookings
WHERE check_out < NOW() - INTERVAL '1 year';

DELETE FROM external_bookings
WHERE check_out < NOW() - INTERVAL '1 year';
```

---

## Testing Checklist

Before deploying to production, verify:

- [ ] Edge Function `beds24-token-exchange` deployed and active
- [ ] Edge Function `fetch-beds24-bookings` deployed and active
- [ ] Supabase secret `BEDS24_REFRESH_TOKEN` configured
- [ ] Property mappings created for all locations
- [ ] Manual sync returns bookings successfully
- [ ] Auto-sync runs every hour (check logs)
- [ ] CORS headers working (no browser errors)
- [ ] Bookings display correctly in UI
- [ ] Filters work (source, status, search)
- [ ] Booking details modal shows raw data

---

## Development vs Production

### Development (localhost:8080)
- Use test Beds24 account
- Shorter sync interval (10 minutes) for testing
- Enable verbose logging
- Test with minimal bookings first

### Production (app.checkingcheckout.com)
- Use production Beds24 account
- Standard sync interval (1 hour)
- Production logging (errors only)
- Monitor Edge Function costs

---

## Emergency Procedures

### If Sync Completely Fails

1. **Stop Auto-Sync:**
   - Comment out interval in `useEffect`
   - Deploy updated frontend

2. **Check Beds24 Status:**
   - Visit: https://beds24.com/status
   - Check for API outages

3. **Verify Database Access:**
   ```sql
   -- Test database connectivity
   SELECT COUNT(*) FROM external_bookings;
   ```

4. **Check Supabase Status:**
   - Visit: https://status.supabase.com
   - Check Edge Functions status

5. **Rollback if Needed:**
   ```bash
   git revert HEAD
   git push origin main
   ```

### Contact Support

**Beds24 Support:**
- Email: support@beds24.com
- Dashboard: Settings → Support

**Supabase Support:**
- Dashboard: Help → Support
- Community: https://github.com/supabase/supabase/discussions

---

## Related Documentation

- [Beds24 Integration Guide](./BEDS24_INTEGRATION_GUIDE.md)
- [Edge Functions Documentation](https://supabase.com/docs/guides/functions)
- [Beds24 API v2 Docs](https://beds24.com/api/v2)

---

## Change Log

- **2025-10-20**: Fixed CORS error by correcting Edge Function name from `channel-token-exchange` to `beds24-token-exchange` (Commit: 3d4e274)
