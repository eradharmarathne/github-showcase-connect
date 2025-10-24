# Beds24 Webhook Setup Guide

This guide explains how to configure Beds24 webhooks to keep your CheckingCheckout reservations synchronized with Beds24 and channel bookings.

## Webhook Configuration

### Location in Beds24
Navigate to: **Settings → Properties → Access → Booking Webhook**

### Configuration Values

#### 1. Webhook Version
**Select: Version 2** ✅

**Why Version 2?**
- Sends complete booking data as JSON in API V2 format
- Includes all booking fields in structured format
- Easier to parse and process
- Consistent with Beds24 API V2 used elsewhere in the system

❌ **DO NOT use Version 1** - it only sends `bookid` and `status` as URL parameters, requiring additional API calls to fetch full booking data.

#### 2. URL
```
https://takovelbhvoqnvfmnhaq.supabase.co/functions/v1/beds24-booking-webhook
```

**Format for your project:**
```
https://[YOUR_SUPABASE_PROJECT_REF].supabase.co/functions/v1/beds24-booking-webhook
```

Replace `[YOUR_SUPABASE_PROJECT_REF]` with your Supabase project reference ID.

#### 3. Custom Header
```
Authorization: Bearer YOUR_SUPABASE_ANON_KEY
```

**To find your Supabase Anon Key:**
1. Open your `.env.local` file
2. Copy the value of `VITE_SUPABASE_ANON_KEY`
3. Replace `YOUR_SUPABASE_ANON_KEY` with this value

**Example:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

⚠️ **IMPORTANT:** Include the word "Bearer " (with space) before the key.

#### 4. Additional Data
**Select: None** (default)

**When to use Additional Data:**
- **CVC/Token**: Only if you need credit card data AND are PCI DSS compliant
- **Most installations**: Leave as "None" for security and simplicity

## What the Webhook Does

The webhook receives notifications from Beds24 for:
- ✅ New bookings from channels (Airbnb, Booking.com, etc.)
- ✅ Booking modifications (dates, guests, amounts)
- ✅ Status changes (confirmed, cancelled)
- ✅ Cancellations from channels
- ✅ Updates made in Beds24 interface

### Webhook Behavior

#### For Existing Reservations
If a reservation with matching `beds24_booking_id` exists:
- Updates guest details (name, email, phone)
- Updates booking dates (check-in, check-out)
- Updates guest counts (adults, children)
- Updates status (tentative, confirmed, cancelled)
- Sets `beds24_synced_at` timestamp

#### For New External Bookings
If no matching reservation exists:
- Acknowledges the webhook with HTTP 200
- Booking will be fetched by the scheduled sync job (`fetch-beds24-bookings`)
- Prevents duplicate processing

## Testing the Webhook

### 1. Verify Deployment
```bash
supabase functions deploy beds24-booking-webhook
```

### 2. Test Webhook Reception
After configuring in Beds24:
1. Create a test booking in Beds24 dashboard
2. Check Supabase logs:
   ```bash
   supabase functions logs beds24-booking-webhook --tail
   ```
3. Look for: "Received Beds24 webhook:" log entry

### 3. Verify Updates
Modify an existing booking in Beds24 and confirm:
- Changes appear in CheckingCheckout reservations
- `beds24_synced_at` timestamp is updated
- Status mappings are correct

## Webhook Payload Structure (Version 2)

The webhook sends a JSON payload with this structure:
```json
{
  "timeStamp": "2025-10-24T12:00:00Z",
  "booking": {
    "id": 12345678,
    "propertyId": 123456,
    "roomId": 234567,
    "unitId": 345678,
    "status": "confirmed",
    "subStatus": "",
    "arrival": "2025-11-01",
    "departure": "2025-11-03",
    "numAdult": 2,
    "numChild": 0,
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "mobile": "+1234567890",
    "apiReference": "uuid-if-we-created-it",
    "masterId": 12345678,
    "bookingGroup": null,
    "roomQty": 1,
    "offerId": 0
    // ... many more fields available
  }
}
```

## Status Mapping

| Beds24 Status | CheckingCheckout Status |
|--------------|------------------------|
| `confirmed` | `confirmed` |
| `request` | `tentative` |
| `cancelled` | `cancelled` |
| Others | No change |

## Troubleshooting

### Webhook Not Receiving Data
1. **Check URL is correct** - must end with `/beds24-booking-webhook`
2. **Verify Authorization header** - must include "Bearer " prefix
3. **Check Supabase logs** - look for errors or failed auth
4. **Test with curl**:
   ```bash
   curl -X POST \
     https://takovelbhvoqnvfmnhaq.supabase.co/functions/v1/beds24-booking-webhook \
     -H "Authorization: Bearer YOUR_ANON_KEY" \
     -H "Content-Type: application/json" \
     -d '{
       "timeStamp": "2025-10-24T12:00:00Z",
       "booking": {
         "id": 999999,
         "propertyId": 123456,
         "status": "confirmed",
         "firstName": "Test",
         "lastName": "Booking"
       }
     }'
   ```

### Updates Not Applying
1. **Check reservation exists** - must have matching `beds24_booking_id`
2. **Verify tenant_id** - webhook only updates existing reservations
3. **Check RLS policies** - service role key should bypass RLS
4. **Review logs** - look for SQL errors or validation failures

### Beds24 Retries
If your server doesn't return HTTP 200:
- Beds24 will retry after a delay
- Returns HTTP 400+ cause retries
- Queue delays can occur during high traffic
- Ensure webhook responds quickly (<5 seconds)

## Security Notes

### Why Custom Header?
The Authorization header ensures:
- Only Beds24 can call your webhook (if you verify the token)
- Supabase RLS policies can use the auth context
- Prevents unauthorized webhook calls

### Additional Security (Optional)
For production, consider:
1. **IP Whitelisting** - Restrict to Beds24 IP ranges (check their docs)
2. **Signature Verification** - Validate webhook authenticity
3. **Rate Limiting** - Prevent abuse via Supabase Edge Function limits

## Related Documentation

- [Beds24 API V2 Documentation](https://beds24.atlassian.net/wiki/spaces/BED24DEV/pages/2564456459/API+V2)
- [Beds24 Webhook Documentation](https://beds24.atlassian.net/wiki/spaces/BED24DEV/pages/2568421629/Webhooks)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)

## Multi-Property Setup

If managing multiple properties:

### Option 1: Single Webhook with Property Parameter
Add property ID to URL:
```
https://takovelbhvoqnvfmnhaq.supabase.co/functions/v1/beds24-booking-webhook?propid=123456
```

Modify Edge Function to read `propid` from URL params.

### Option 2: Separate Webhooks per Property
Configure different webhook URLs for each property (not recommended - harder to maintain).

### Current Implementation
The webhook uses `beds24_property_mappings` table to identify which CheckingCheckout location corresponds to each Beds24 property, so a single webhook URL works for all properties.

## Summary

**Quick Setup Checklist:**
- [x] Webhook Version: **2**
- [x] URL: `https://takovelbhvoqnvfmnhaq.supabase.co/functions/v1/beds24-booking-webhook`
- [x] Custom Header: `Authorization: Bearer [YOUR_ANON_KEY]`
- [x] Additional Data: **None**
- [x] Deploy function: `supabase functions deploy beds24-booking-webhook`
- [x] Test with a booking modification
- [x] Check logs: `supabase functions logs beds24-booking-webhook --tail`

Once configured, Beds24 will automatically notify your system of all booking changes, keeping reservations synchronized in real-time! 🎉
