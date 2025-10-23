# Beds24 Bi-Directional Sync Implementation

## Overview

This document describes the bi-directional sync architecture between CheckingCheckout and Beds24 channel manager. This enables:

1. **Direct bookings created in CheckingCheckout** → Automatically sync TO Beds24
2. **Beds24 propagates** → To all connected channels (Booking.com, Airbnb, Expedia, etc.)
3. **Dates auto-close** → Prevents double-bookings across all platforms
4. **Real-time updates** → Webhooks keep everything in sync

---

## Architecture Components

### 1. Database Schema (`reservations` table)

**New Columns:**
```sql
beds24_booking_id      BIGINT              -- Beds24 API booking ID (links to Beds24)
beds24_sync_status     beds24_sync_status  -- Enum: not_required, pending, synced, failed
beds24_synced_at       TIMESTAMPTZ         -- When successfully synced
beds24_sync_error      TEXT                -- Error message if sync failed
```

**Sync Status Values:**
- `not_required` - External channel bookings (already from Beds24/channels)
- `pending` - Waiting for sync to Beds24
- `synced` - Successfully synced to Beds24
- `failed` - Sync failed (see `beds24_sync_error` for details)

### 2. Edge Functions

#### `/supabase/functions/sync-reservation-to-beds24`

**Purpose:** Syncs direct reservations FROM CheckingCheckout TO Beds24.

**Trigger:** Called after user creates a direct booking in the app.

**Flow:**
1. Validates reservation exists and isn't already synced
2. Checks if booking source is "direct" (not external channel)
3. Maps CheckingCheckout `room_id` to Beds24 `roomId` via `beds24_property_mappings`
4. Retrieves Beds24 OAuth credentials from `beds24_credentials` table
5. Refreshes access token if expired (< 5 minutes remaining)
6. POSTs booking to `https://api.beds24.com/v2/bookings`
7. Stores returned `beds24_booking_id` in reservations table
8. Updates `beds24_sync_status` to `synced`

**API Endpoint:** `POST /bookings`

**Request Payload:**
```json
[
  {
    "roomId": 1234567,
    "status": "confirmed",
    "arrival": "2024-12-20",
    "departure": "2024-12-25",
    "numAdult": 2,
    "numChild": 1,
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "mobile": "+94771234567",
    "apiReference": "uuid-of-reservation",
    "comment": "Special requests here"
  }
]
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 7654321,
      "status": "success"
    }
  ]
}
```

**Error Handling:**
- No room mapping → Status: `failed`, Error: "No Beds24 room mapping found"
- No credentials → Status: `failed`, Error: "Beds24 credentials not found"
- Token refresh failed → Status: `failed`, Error: "Failed to refresh access token"
- API error → Status: `failed`, Error: Beds24 error message

**Retry Logic:**
- Manual retry via UI by setting `force: true`
- Or delete `beds24_sync_status` and re-trigger

---

#### `/supabase/functions/beds24-booking-webhook`

**Purpose:** Receives webhook notifications from Beds24 when bookings change.

**Trigger:** Beds24 sends POST request when:
- Booking status changes (confirmed, cancelled, etc.)
- Booking dates/guests modified
- Channel bookings updated
- Manual changes in Beds24 interface

**Configuration:**
1. Login to Beds24
2. Navigate to: **Settings → Properties → Access → Booking Webhook**
3. Set webhook URL: `https://[your-project].supabase.co/functions/v1/beds24-booking-webhook`
4. Save

**Webhook Payload:**
```json
{
  "timeStamp": "2024-12-19T10:30:00Z",
  "booking": {
    "id": 7654321,
    "propertyId": 123456,
    "roomId": 1234567,
    "status": "confirmed",
    "arrival": "2024-12-20",
    "departure": "2024-12-25",
    "numAdult": 2,
    "numChild": 1,
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "mobile": "+94771234567",
    "apiReference": "uuid-of-reservation"
  }
}
```

**Flow:**
1. Receives webhook POST from Beds24
2. Finds existing reservation by:
   - `apiReference` (if we created it) OR
   - `beds24_booking_id` (if external booking)
3. If not found → New external booking (handled by `fetch-beds24-bookings`)
4. If found → Updates local reservation with changes:
   - Guest details (name, email, phone)
   - Check-in/check-out dates
   - Adults/children counts
   - Status (confirmed, cancelled, etc.)
5. Updates `beds24_synced_at` timestamp

**Security:**
- Public endpoint (Beds24 needs access)
- Validate webhook signature if needed (TODO)
- Use service role key for database updates

---

## Integration Flow Diagrams

### Creating Direct Booking (App → Beds24 → Channels)

```
User creates booking in CheckingCheckout
    ↓
Reservation saved to database
    ↓
Call Edge Function: sync-reservation-to-beds24
    ↓
POST /bookings to Beds24 API
    ↓
Beds24 returns booking ID
    ↓
Update reservations table:
  - beds24_booking_id = 7654321
  - beds24_sync_status = 'synced'
  - beds24_synced_at = NOW()
    ↓
Beds24 AUTOMATICALLY propagates booking to:
  ✅ Booking.com
  ✅ Airbnb
  ✅ Expedia
  ✅ Other connected channels
    ↓
DATES AUTO-CLOSE on all channels
(Prevents double-bookings)
```

### External Booking Update (Beds24 → App)

```
Guest cancels booking on Booking.com
    ↓
Booking.com notifies Beds24
    ↓
Beds24 updates booking status to "cancelled"
    ↓
Beds24 sends webhook to:
https://your-app.supabase.co/functions/v1/beds24-booking-webhook
    ↓
Webhook handler finds reservation by beds24_booking_id
    ↓
Updates local reservation:
  - status = 'cancelled'
  - beds24_synced_at = NOW()
    ↓
User sees updated status in CheckingCheckout
```

---

## Setup Instructions

### Step 1: Database Migration

Already applied via Rube Supabase MCP:

```sql
-- Creates enum and adds columns to reservations table
-- Migration: 20241219_add_beds24_sync_fields_to_reservations.sql
```

### Step 2: Deploy Edge Functions

```bash
# Deploy sync function
supabase functions deploy sync-reservation-to-beds24

# Deploy webhook handler
supabase functions deploy beds24-booking-webhook

# Verify deployments
supabase functions list
```

### Step 3: Configure Beds24 Webhook

1. Login to Beds24: https://beds24.com
2. Navigate to: **Settings → Properties → [Select Property] → Access**
3. Find **"Booking Webhook"** section
4. Enter webhook URL:
   ```
   https://takovelbhvoqnvfmnhaq.supabase.co/functions/v1/beds24-booking-webhook
   ```
5. Click **Save**
6. Test webhook by creating/updating a test booking in Beds24

### Step 4: Update Frontend

**When Creating Reservation:**

```typescript
// In ReservationForm.tsx or similar
const handleSubmit = async (reservationData) => {
  // 1. Create reservation as usual
  const { data: reservation, error } = await supabase
    .from('reservations')
    .insert(reservationData)
    .select()
    .single();

  if (error) throw error;

  // 2. Trigger Beds24 sync for direct bookings
  if (['direct', 'manual', 'phone', 'email', 'walk_in'].includes(reservationData.booking_source)) {
    const { data: syncResult } = await supabase.functions.invoke(
      'sync-reservation-to-beds24',
      {
        body: { reservation_id: reservation.id }
      }
    );

    console.log('Beds24 sync result:', syncResult);
  }

  toast.success('Reservation created and synced to Beds24!');
};
```

**Display Sync Status:**

```typescript
// In ReservationList.tsx or ReservationDetails.tsx
const SyncStatusBadge = ({ reservation }) => {
  const statusColors = {
    not_required: 'bg-gray-100 text-gray-800',
    pending: 'bg-yellow-100 text-yellow-800',
    synced: 'bg-green-100 text-green-800',
    failed: 'bg-red-100 text-red-800',
  };

  const statusLabels = {
    not_required: 'Not Required',
    pending: 'Syncing...',
    synced: 'Synced',
    failed: 'Sync Failed',
  };

  return (
    <span className={`px-2 py-1 rounded text-xs ${statusColors[reservation.beds24_sync_status]}`}>
      {statusLabels[reservation.beds24_sync_status]}
      {reservation.beds24_booking_id && ` (${reservation.beds24_booking_id})`}
    </span>
  );
};
```

**Manual Retry:**

```typescript
const handleRetrySync = async (reservationId: string) => {
  const { data, error } = await supabase.functions.invoke(
    'sync-reservation-to-beds24',
    {
      body: { 
        reservation_id: reservationId,
        force: true // Force resync even if already synced
      }
    }
  );

  if (error) {
    toast.error('Failed to sync: ' + error.message);
  } else {
    toast.success('Successfully synced to Beds24!');
  }
};
```

---

## Testing

### Test Direct Booking Sync

1. Create a direct booking in CheckingCheckout
2. Check `beds24_sync_status` should be `synced`
3. Note the `beds24_booking_id`
4. Login to Beds24 and verify booking appears
5. Check connected channels (Booking.com, Airbnb) - dates should be closed

### Test Webhook Updates

1. In Beds24, modify the booking (change dates, guest name, etc.)
2. Check CheckingCheckout - changes should appear within seconds
3. Cancel booking in Beds24
4. Verify status changes to "cancelled" in CheckingCheckout

### Test Error Handling

**No Room Mapping:**
1. Create booking for room without Beds24 mapping
2. Should show `beds24_sync_status = 'failed'`
3. Error message: "No Beds24 room mapping found"

**No Credentials:**
1. Delete Beds24 credentials for location
2. Create booking
3. Should show sync failed with appropriate error

---

## Automatic Date Closing

**How it works:**

1. You create direct booking in CheckingCheckout (Dec 20-25)
2. Sync function POSTs to Beds24 API
3. Beds24 receives booking and:
   - Updates its calendar (Dec 20-25 now occupied)
   - **Automatically pushes update to ALL connected channels**:
     - Booking.com
     - Airbnb
     - Expedia
     - Vrbo
     - Agoda
     - etc.
4. Each channel updates their availability:
   - Dec 20-25 no longer available for booking
   - Prevents double-bookings

**You don't need to:**
- Manually close dates
- Call separate APIs for each channel
- Manage inventory separately

**Beds24 handles all channel propagation automatically!**

---

## Troubleshooting

### Sync Status: Failed

1. Check `beds24_sync_error` column for details
2. Common issues:
   - **"No Beds24 room mapping found"**: Configure room mapping in Booking Channels page
   - **"Beds24 credentials not found"**: Connect Beds24 OAuth in settings
   - **"Failed to refresh access token"**: Reconnect Beds24 (refresh token may be invalid)
   - **API error 400**: Check booking data (dates, guest info, room ID)

### Webhook Not Working

1. Verify webhook URL configured in Beds24
2. Check Edge Function logs:
   ```bash
   supabase functions logs beds24-booking-webhook
   ```
3. Test webhook manually:
   ```bash
   curl -X POST https://your-project.supabase.co/functions/v1/beds24-booking-webhook \
     -H "Content-Type: application/json" \
     -d '{"timeStamp":"2024-12-19T10:00:00Z","booking":{"id":123,"status":"confirmed"}}'
   ```

### Dates Not Closing on Channels

1. Verify booking was synced (`beds24_sync_status = 'synced'`)
2. Check Beds24 calendar - booking should appear
3. Verify channels are connected in Beds24:
   - Settings → Channels → Check each channel status
4. Channel propagation can take 5-15 minutes
5. Some channels require manual activation in Beds24

---

## Limitations & Future Enhancements

### Current Limitations

- No real-time sync (uses webhooks for near real-time)
- Webhook failures require manual retry
- No bulk sync for historical bookings
- No conflict resolution for simultaneous edits

### Planned Enhancements

- [ ] Automatic retry logic for failed syncs
- [ ] Bulk sync endpoint for migrating existing reservations
- [ ] Conflict detection and resolution UI
- [ ] Webhook signature verification for security
- [ ] Sync status dashboard/monitoring
- [ ] Rate limiting and quota management
- [ ] Support for booking modifications (PATCH endpoint)
- [ ] Support for grouped bookings

---

## API Reference

### Edge Function: sync-reservation-to-beds24

**Endpoint:** `POST /functions/v1/sync-reservation-to-beds24`

**Request:**
```typescript
{
  reservation_id: string;  // UUID of reservation to sync
  force?: boolean;         // Force resync even if already synced (default: false)
}
```

**Response (Success):**
```typescript
{
  success: true;
  message: "Reservation synced to Beds24";
  reservation_id: string;
  beds24_booking_id: number;
  beds24_response: object;
}
```

**Response (Error):**
```typescript
{
  error: string;
  details?: string;
}
```

### Edge Function: beds24-booking-webhook

**Endpoint:** `POST /functions/v1/beds24-booking-webhook`

**Request:** (Sent by Beds24)
```typescript
{
  timeStamp: string;
  booking: {
    id: number;
    status: string;
    arrival: string;
    departure: string;
    // ... other booking fields
  };
}
```

**Response:**
```typescript
{
  success: true;
  message: string;
  reservation_id?: string;
  beds24_booking_id: number;
}
```

---

## Support

For issues or questions:
1. Check this documentation
2. Review Edge Function logs via Supabase dashboard
3. Consult Beds24 API documentation: https://beds24.com/api/v2
4. Check `beds24_sync_error` column for specific error messages
5. Contact support with:
   - Reservation ID
   - Beds24 booking ID (if available)
   - Error message from database
   - Edge Function logs

---

**Last Updated:** December 19, 2024  
**Version:** 1.0.0
