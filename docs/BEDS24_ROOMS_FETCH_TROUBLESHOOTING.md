# Beds24 Rooms Fetch Troubleshooting Guide

This guide helps diagnose and fix issues when fetching rooms from Beds24 for room mapping configuration.

## Common Issues and Solutions

### Issue: HTTP 500 Error from Beds24 API

**Symptoms:**
- Error message: "Failed to fetch rooms for property [name/id]: 500"
- No rooms appearing in Room Mappings tab

**Possible Causes:**

#### 1. Invalid or Expired Access Token
**Solution:**
- The Edge Function automatically refreshes tokens if expired
- Check `beds24_credentials` table: `token_expires_at` should be in the future
- Verify `is_active = true` for the credentials
- Try re-authenticating via Booking Channels Integration → Settings → Reconnect Beds24

**SQL to check:**
```sql
SELECT 
  location_id,
  is_active,
  token_expires_at,
  token_expires_at > now() as is_valid,
  now() - token_expires_at as expired_duration
FROM beds24_credentials
WHERE location_id = 'YOUR_LOCATION_ID';
```

#### 2. Incorrect Property ID in Mappings
**Solution:**
- Verify the `beds24_property_id` in `beds24_property_mappings` matches actual Beds24 property ID
- Property ID is a number (e.g., 297214)
- Check in Beds24 dashboard: Settings → Properties → Select Property → URL shows ID

**SQL to check:**
```sql
SELECT 
  location_id,
  beds24_property_id,
  beds24_property_name,
  is_active
FROM beds24_property_mappings
WHERE location_id = 'YOUR_LOCATION_ID';
```

#### 3. API Rate Limiting
**Solution:**
- Beds24 API V2 has 5-minute credit limits
- Check response headers in logs: `X-FiveMinCreditLimit-Remaining`
- If 0, wait for `X-FiveMinCreditLimit-ResetsIn` seconds
- Reduce frequency of "Fetch Rooms" clicks

#### 4. Missing Organization Header (for Integration Partners)
**Solution:**
- If you're an integration partner, the API requires `organization` header
- Most users don't need this - only add if Beds24 support instructed
- Add to Edge Function headers if needed:
  ```typescript
  headers: {
    token: accessToken,
    organization: "YOUR_ORG_NAME",
    "Content-Type": "application/json",
  }
  ```

#### 5. Property Not Connected to Account
**Solution:**
- Verify property is accessible with the OAuth token
- Test: Get properties via API
  ```bash
  curl -X GET \
    "https://api.beds24.com/v2/properties" \
    -H "token: YOUR_ACCESS_TOKEN"
  ```
- Response should include your property ID in the data array

### Issue: "No Beds24 rooms found" but API Returns 200

**Symptoms:**
- API call succeeds (200 status)
- But rooms array is empty
- Property has rooms visible in Beds24 dashboard

**Possible Causes:**

#### 1. Room Response Format Mismatch
**Solution:**
- Beds24 API returns: `{ success: true, type: "room", data: [...rooms] }`
- Edge Function expects `data` array
- Check logs for: "Found X rooms for property [name]"
- If shows 0 but property has rooms, response format may have changed

**Debug in Edge Function:**
```typescript
const roomsData = await roomsResponse.json();
console.log("API Response structure:", JSON.stringify(roomsData, null, 2));

const rooms: Beds24Room[] = Array.isArray(roomsData?.data)
  ? roomsData.data
  : Array.isArray(roomsData)
    ? roomsData
    : [];
```

#### 2. Rooms Not Assigned to Property
**Solution:**
- In Beds24 dashboard: Settings → Properties → [Property] → Rooms
- Verify rooms are linked to the correct property
- Room might be created but not assigned

### Issue: Rooms Fetch Works but Mapping Doesn't Save

**Symptoms:**
- Rooms appear in dropdown
- Selection doesn't persist
- No error shown

**Possible Causes:**

#### 1. RLS Policy Blocking Insert
**Solution:**
- Check `channel_room_mappings` RLS policies
- User needs INSERT permission for their tenant/location
- Service role bypasses RLS (used for fetching)
- But UI uses user's session (respects RLS)

**SQL to check:**
```sql
-- Check if user can insert mappings
INSERT INTO channel_room_mappings (
  tenant_id, location_id, channel, channel_room_id, room_id, is_active
) VALUES (
  'YOUR_TENANT_ID', 
  'YOUR_LOCATION_ID', 
  'beds24', 
  'TEST_CHANNEL_ROOM_ID', 
  'YOUR_ROOM_ID', 
  true
);
-- If this fails, RLS policy needs updating
```

## Debugging Steps

### Step 1: Check Supabase Function Logs
```bash
# Watch logs in real-time
supabase functions logs fetch-beds24-rooms --tail

# Or view in Supabase Dashboard
# Project → Edge Functions → fetch-beds24-rooms → Logs
```

**Look for:**
- "Fetching rooms from: [URL]" - Verify URL is correct
- "API Error Response: [text]" - Beds24 API error details
- "Found X rooms for property [name]" - How many rooms returned
- Token refresh messages - Auth issues

### Step 2: Test API Directly with cURL

```bash
# 1. Get your access token from database
# Run in Supabase SQL Editor:
SELECT access_token FROM beds24_credentials 
WHERE location_id = 'YOUR_LOCATION_ID' AND is_active = true;

# 2. Test rooms endpoint
curl -X GET \
  "https://api.beds24.com/v2/rooms?propertyId=297214" \
  -H "token: YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -v

# 3. Check response
# - HTTP 200 = Success
# - HTTP 401 = Invalid/expired token
# - HTTP 403 = Permission issue
# - HTTP 500 = Beds24 internal error
```

**Expected Success Response:**
```json
{
  "success": true,
  "type": "room",
  "data": [
    {
      "id": 620937,
      "propertyId": 297214,
      "name": "Double or Twin Room",
      "description": "...",
      "roomQty": 1,
      "maxOccupancy": 2
    }
  ],
  "pages": {
    "nextPageExists": false
  }
}
```

### Step 3: Verify Database State

```sql
-- Check OAuth credentials
SELECT 
  location_id,
  is_active,
  token_expires_at > now() as token_valid,
  created_at,
  updated_at
FROM beds24_credentials
WHERE location_id = 'YOUR_LOCATION_ID';

-- Check property mappings
SELECT 
  location_id,
  beds24_property_id,
  beds24_property_name,
  is_active,
  created_at
FROM beds24_property_mappings
WHERE location_id = 'YOUR_LOCATION_ID';

-- Check existing room mappings
SELECT 
  crm.channel_room_id,
  crm.room_id,
  r.room_number,
  r.room_type,
  crm.is_active
FROM channel_room_mappings crm
LEFT JOIN rooms r ON crm.room_id = r.id
WHERE crm.location_id = 'YOUR_LOCATION_ID'
  AND crm.channel = 'beds24';
```

### Step 4: Test Edge Function Locally (Optional)

```bash
# Start Supabase locally
supabase start

# Serve function locally
supabase functions serve fetch-beds24-rooms --env-file .env.local

# Test with curl
curl -X POST \
  http://localhost:54321/functions/v1/fetch-beds24-rooms \
  -H "Authorization: Bearer YOUR_SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"location_id": "YOUR_LOCATION_ID"}'
```

## Resolution Checklist

Before reporting an issue, verify:

- [ ] Beds24 OAuth connection is active (`beds24_credentials.is_active = true`)
- [ ] Access token is not expired (`token_expires_at > now()`)
- [ ] Property mappings exist for location (`beds24_property_mappings` has records)
- [ ] Property ID in mappings matches Beds24 dashboard
- [ ] Property has rooms visible in Beds24 dashboard
- [ ] Supabase function logs show the API call and response
- [ ] Direct API test with cURL returns expected data
- [ ] RLS policies allow current user to read/write mappings

## Error Messages Reference

| Error Message | Cause | Solution |
|--------------|-------|----------|
| "Beds24 credentials not found" | No active credentials in DB | Connect Beds24 in Settings |
| "No Beds24 property mappings found" | No properties mapped | Configure property mappings in Settings |
| "Failed to refresh Beds24 access token" | Refresh token invalid | Re-authenticate Beds24 |
| "Failed to fetch rooms: 401" | Invalid/expired token | Token refresh failed, re-auth |
| "Failed to fetch rooms: 403" | Permission denied | Check property access rights |
| "Failed to fetch rooms: 500" | Beds24 API internal error | See troubleshooting above |
| "No Beds24 rooms found" | Empty response or wrong format | Check API response structure |

## API Rate Limit Details

Beds24 API V2 uses a 5-minute rolling credit system:

- **Credit Limit**: Varies by account (check `X-FiveMinCreditLimit` header)
- **Request Cost**: Each API call costs credits (check `X-RequestCost` header)
- **Remaining**: Track with `X-FiveMinCreditLimit-Remaining` header
- **Reset**: Credits reset after period (check `X-FiveMinCreditLimit-ResetsIn`)

**Best Practices:**
- Cache room data in frontend (don't fetch on every page load)
- Only call "Fetch Rooms" when needed (not repeatedly)
- Implement retry with exponential backoff if rate limited

## Contact Support

If issues persist after troubleshooting:

1. **Collect Diagnostic Info:**
   - Supabase function logs (last 10 entries)
   - Direct API test results (cURL output)
   - Database query results (credentials, mappings)
   - Beds24 property ID and visible room count

2. **Check Beds24 Status:**
   - Visit: https://beds24.com/status
   - API V2 service status
   - Scheduled maintenance windows

3. **Contact Channels:**
   - CheckingCheckout Support: [Your support email]
   - Beds24 API Support: https://beds24.com/support
   - Include collected diagnostic info

## Related Documentation

- [Beds24 Integration Guide](./BEDS24_INTEGRATION_GUIDE.md)
- [Beds24 API V2 Documentation](https://beds24.com/api/v2)
- [Beds24 Webhook Setup](./BEDS24_WEBHOOK_SETUP.md)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
