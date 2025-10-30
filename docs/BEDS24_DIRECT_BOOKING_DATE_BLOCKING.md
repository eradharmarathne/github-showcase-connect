# Beds24 Direct Booking Date Blocking Implementation Plan

## Overview
When a user creates a direct booking in CheckingCheckout, the system should automatically block those dates in Beds24 to prevent double bookings across all connected channels (Airbnb, Booking.com, Expedia, etc.).

**Current State:**
- ✅ Direct bookings are synced TO Beds24 via `sync-reservation-to-beds24` Edge Function
- ✅ Beds24 bookings are synced FROM Beds24 via `fetch-beds24-bookings` Edge Function
- ✅ Room mappings exist between CheckingCheckout rooms and Beds24 rooms
- ❌ **MISSING:** Automatic date blocking for direct bookings to close availability

**Goal:**
Block dates in Beds24 calendar when direct bookings are created in CheckingCheckout to ensure availability is closed across all channels.

---

## Architecture Components

### 1. Current Direct Booking Flow
```
User creates direct booking in CheckingCheckout
    ↓
Reservation saved to `reservations` table
    ↓
`sync-reservation-to-beds24` Edge Function called
    ↓
POST /api/v2/bookings to Beds24
    ↓
Beds24 creates booking with ID
    ↓
CheckingCheckout stores `beds24_booking_id`
    ↓
✅ Beds24 SHOULD automatically close dates
```

**Problem:** Beds24 bookings created via API may not automatically close dates on all channels. We need to explicitly set availability.

---

## Solution: Beds24 Calendar API Integration

### Option A: Modify Calendar Availability (Recommended)
Use Beds24 Calendar API to explicitly block dates after creating booking.

**Endpoint:** `POST /api/v2/calendar`

**Purpose:** Set `numAvail = 0` for booked dates to close availability.

### Option B: Use Booking Override
Use booking's `override` field to block dates.

**Endpoint:** `POST /api/v2/bookings` (with override parameter)

**Note:** This is already handled when creating booking, but may need verification.

---

## Beds24 Calendar API Documentation

### Modify Calendar Data
**Endpoint:** `POST /api/v2/calendar`

**Description:** Modifies per-day calendar values for rooms, such as minimum stay, availability, and prices.

**Authentication:** OAuth access token in `token` header

**Request Body:**
```json
[
  {
    "roomId": 1234567,
    "calendar": [
      {
        "from": "2024-12-20",
        "to": "2024-12-25",
        "numAvail": 0,
        "override": "blackout"
      }
    ]
  }
]
```

**Response:**
```json
{
  "success": true,
  "type": "calendar",
  "data": []
}
```

### Calendar Schema Properties
```typescript
{
  roomId: number;              // Beds24 room ID
  calendar: [
    {
      from: string;            // Start date (YYYY-MM-DD)
      to: string;              // End date (YYYY-MM-DD)
      numAvail: number;        // Available units (set to 0 to block)
      override: string;        // "blackout" | "none" | "noCheckIn" | "noCheckOut"
      minStay?: number;        // Minimum nights
      maxStay?: number;        // Maximum nights
    }
  ]
}
```

### Override Options
- `"none"` - No restriction (default)
- `"blackout"` - Completely blocks dates (no bookings allowed)
- `"exception"` - Exception to blackout
- `"noCheckIn"` - No check-in allowed on this date
- `"noCheckOut"` - No check-out allowed on this date
- `"noCheckInOrCheckOut"` - No arrivals or departures

**For blocking dates:** Use `numAvail: 0` and/or `override: "blackout"`

---

## Implementation Plan

### Phase 1: Create Edge Function for Date Blocking

**File:** `/supabase/functions/block-beds24-dates/index.ts`

**Purpose:** Block specific dates in Beds24 calendar after direct booking creation.

**Flow:**
1. Receive reservation details (check-in, check-out, room_id)
2. Look up Beds24 room mapping from `channel_room_mappings`
3. Get Beds24 OAuth credentials
4. Calculate date range (arrival to departure - 1 day)
5. POST to Beds24 Calendar API to set `numAvail = 0`
6. Update reservation with `beds24_dates_blocked` status

**Request Payload:**
```typescript
interface BlockDatesRequest {
  reservation_id: string;
  check_in_date: string;      // YYYY-MM-DD
  check_out_date: string;     // YYYY-MM-DD
  beds24_room_id: number;     // From room mapping
}
```

**API Call:**
```typescript
const calendarPayload = [
  {
    roomId: beds24RoomId,
    calendar: [
      {
        from: check_in_date,
        to: check_out_date,
        numAvail: 0,
        override: "blackout"
      }
    ]
  }
];

await fetch("https://api.beds24.com/v2/calendar", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "token": accessToken
  },
  body: JSON.stringify(calendarPayload)
});
```

---

### Phase 2: Update sync-reservation-to-beds24 Edge Function

**File:** `/supabase/functions/sync-reservation-to-beds24/index.ts`

**Changes:**
1. After successfully creating Beds24 booking
2. Call Calendar API to block dates
3. Update reservation with blocking status

**Code Addition (after line 351):**
```typescript
// After Beds24 booking is created successfully
console.log("Blocking dates in Beds24 calendar");

// Calculate date range (arrival to departure - 1 day for last night)
const lastNight = new Date(reservation.check_out_date);
lastNight.setDate(lastNight.getDate() - 1);
const toDate = lastNight.toISOString().split('T')[0];

const calendarPayload = [
  {
    roomId: Number.parseInt(roomMapping.channel_room_id),
    calendar: [
      {
        from: reservation.check_in_date,
        to: toDate, // Last night booked (day before checkout)
        numAvail: 0,
        override: "blackout"
      }
    ]
  }
];

const calendarResponse = await fetch(`${BEDS24_API_URL}/calendar`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "token": accessToken
  },
  body: JSON.stringify(calendarPayload)
});

const calendarData = await calendarResponse.json();

if (!calendarResponse.ok) {
  console.error("Failed to block dates in calendar:", calendarData);
  // Don't fail entire sync - booking is already created
} else {
  console.log("Successfully blocked dates in Beds24 calendar");
}

// Update reservation with blocking status
await supabase
  .from("reservations")
  .update({
    beds24_booking_id: beds24BookingId,
    beds24_sync_status: "synced",
    beds24_synced_at: new Date().toISOString(),
    beds24_sync_error: null,
    beds24_dates_blocked: true, // New field
    beds24_dates_blocked_at: new Date().toISOString()
  })
  .eq("id", reservation_id);
```

---

### Phase 3: Database Schema Update

**Migration:** Add fields to track date blocking status

**File:** `supabase/migrations/YYYYMMDDHHMMSS_add_beds24_date_blocking.sql`

```sql
-- Add date blocking tracking fields to reservations table
ALTER TABLE reservations
ADD COLUMN IF NOT EXISTS beds24_dates_blocked BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS beds24_dates_blocked_at TIMESTAMPTZ;

-- Add comment for documentation
COMMENT ON COLUMN reservations.beds24_dates_blocked IS 'Whether dates were successfully blocked in Beds24 calendar';
COMMENT ON COLUMN reservations.beds24_dates_blocked_at IS 'Timestamp when dates were blocked in Beds24';

-- Create index for querying blocking status
CREATE INDEX IF NOT EXISTS idx_reservations_beds24_dates_blocked 
ON reservations(beds24_dates_blocked) 
WHERE beds24_dates_blocked = true;
```

---

### Phase 4: Handle Date Unblocking on Cancellation

When a reservation is cancelled, we should unblock the dates in Beds24.

**Implementation:**
1. Modify `sync-reservation-to-beds24` to handle cancellations
2. When status changes to `cancelled`, set `numAvail` back to available quantity
3. OR rely on Beds24 webhook to handle cancellations automatically

**Code:**
```typescript
// In sync-reservation-to-beds24/index.ts
if (reservation.status === "cancelled") {
  // Unblock dates in calendar
  const unblockPayload = [
    {
      roomId: Number.parseInt(roomMapping.channel_room_id),
      calendar: [
        {
          from: reservation.check_in_date,
          to: toDate,
          numAvail: 1, // Or get from room's default availability
          override: "none"
        }
      ]
    }
  ];

  await fetch(`${BEDS24_API_URL}/calendar`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "token": accessToken
    },
    body: JSON.stringify(unblockPayload)
  });
}
```

---

## Beds24 API Rate Limits

**Important:** Beds24 API has rate limiting:
- Header: `X-FiveMinCreditLimit` - Available credit limit
- Header: `X-FiveMinCreditLimit-ResetsIn` - Seconds until reset
- Header: `X-FiveMinCreditLimit-Remaining` - Remaining credits
- Header: `X-RequestCost` - Cost of current request

**Handling:**
- Check rate limit headers before making calls
- Implement retry logic with exponential backoff
- Queue date blocking if rate limit reached

---

## Testing Checklist

### Manual Testing
1. **Create Direct Booking:**
   - [ ] Create new reservation with `booking_source = "direct"`
   - [ ] Verify Beds24 booking created (`beds24_booking_id` populated)
   - [ ] Check Beds24 calendar shows dates blocked (numAvail = 0)
   - [ ] Verify `beds24_dates_blocked = true`

2. **Cancel Booking:**
   - [ ] Change reservation status to `cancelled`
   - [ ] Trigger sync to Beds24
   - [ ] Verify Beds24 booking status = `cancelled`
   - [ ] Check Beds24 calendar dates unblocked (numAvail restored)

3. **Modify Booking:**
   - [ ] Change check-in or check-out dates
   - [ ] Verify old dates unblocked
   - [ ] Verify new dates blocked

4. **Rate Limiting:**
   - [ ] Create multiple bookings in quick succession
   - [ ] Verify rate limit handling
   - [ ] Check all dates eventually blocked

### Edge Cases
1. **No Room Mapping:**
   - Booking should sync but date blocking should fail gracefully
   - Status: `beds24_sync_status = "synced"`, `beds24_dates_blocked = false`

2. **Beds24 API Failure:**
   - Booking created in Beds24 but calendar update fails
   - Status: `beds24_sync_status = "synced"`, `beds24_dates_blocked = false`
   - Log error for manual review

3. **Multi-Room Bookings:**
   - If future feature supports multiple rooms per booking
   - Block dates for ALL mapped Beds24 rooms

---

## Frontend Updates

### Display Blocking Status

**File:** `src/pages/reservation-details.tsx`

Show Beds24 sync and blocking status:
```tsx
{reservation.beds24_booking_id && (
  <div className="mt-2 space-y-1">
    <div className="flex items-center gap-2 text-sm">
      <CheckCircle className="h-4 w-4 text-green-600" />
      <span>Synced to Beds24 (ID: {reservation.beds24_booking_id})</span>
    </div>
    
    {reservation.beds24_dates_blocked ? (
      <div className="flex items-center gap-2 text-sm text-green-600">
        <Lock className="h-4 w-4" />
        <span>Dates blocked in Beds24</span>
      </div>
    ) : (
      <div className="flex items-center gap-2 text-sm text-amber-600">
        <AlertCircle className="h-4 w-4" />
        <span>Dates not blocked - check Beds24 manually</span>
      </div>
    )}
  </div>
)}
```

---

## Error Handling

### Possible Errors

1. **Invalid Room Mapping:**
   - Error: "No Beds24 room mapping found"
   - Action: Don't block dates, log warning

2. **API Authentication Failed:**
   - Error: "Beds24 token expired"
   - Action: Refresh token, retry

3. **Calendar Update Failed:**
   - Error: "Failed to update calendar"
   - Action: Log error, flag for manual review

4. **Invalid Date Range:**
   - Error: "Invalid date range"
   - Action: Validate dates before API call

### Logging Strategy
```typescript
console.log("Date blocking attempt:", {
  reservation_id,
  beds24_booking_id,
  beds24_room_id,
  check_in_date,
  check_out_date,
  success: true/false,
  error: errorMessage
});
```

---

## Alternative: Verify Automatic Blocking

**Before implementing custom blocking:**
1. Create test direct booking via API
2. Check if Beds24 automatically blocks dates
3. If automatic blocking works, this implementation may not be needed

**Verification Steps:**
1. POST to `/api/v2/bookings` with direct booking
2. Check `GET /api/v2/calendar` for `numAvail` on those dates
3. Check Beds24 UI calendar view
4. Check channel (Airbnb/Booking.com) availability

**If automatic blocking works:**
- Document finding
- Monitor for edge cases
- Only implement custom blocking if issues found

---

## Beds24 API Endpoints Used

### 1. Create Booking
**Endpoint:** `POST /api/v2/bookings`
**Status:** ✅ Already implemented

### 2. Modify Calendar
**Endpoint:** `POST /api/v2/calendar`
**Status:** ❌ To be implemented

### 3. Get Calendar
**Endpoint:** `GET /api/v2/calendar`
**Status:** Can be used for verification

### 4. Get Bookings
**Endpoint:** `GET /api/v2/bookings`
**Status:** ✅ Already implemented

---

## Implementation Priority

### Phase 1: Critical (Do First)
1. ✅ Research Beds24 Calendar API (DONE)
2. ✅ Document blocking approach (DONE)
3. Add database fields for tracking
4. Update `sync-reservation-to-beds24` with blocking logic
5. Test with real Beds24 account

### Phase 2: Important (Do Next)
1. Handle cancellations (unblock dates)
2. Handle date modifications
3. Frontend status display
4. Error handling and logging

### Phase 3: Nice to Have
1. Standalone `block-beds24-dates` Edge Function
2. Retry mechanism for failed blocks
3. Admin dashboard for blocking status
4. Bulk re-blocking for existing reservations

---

## API Reference Summary

### Beds24 Calendar API v2

**Base URL:** `https://api.beds24.com/v2`

**Authentication:** 
- Header: `token: <access_token>`
- Use OAuth access token from `beds24_credentials` table

**Block Dates Request:**
```bash
POST /calendar
Content-Type: application/json
token: <access_token>

[
  {
    "roomId": 1234567,
    "calendar": [
      {
        "from": "2024-12-20",
        "to": "2024-12-24",
        "numAvail": 0,
        "override": "blackout"
      }
    ]
  }
]
```

**Success Response:**
```json
{
  "success": true,
  "type": "calendar",
  "data": []
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "Error message",
  "details": "Additional details"
}
```

---

## Key Considerations

### 1. Date Calculation
- Beds24 uses **last night booked** not checkout date
- Check-in: 2024-12-20
- Check-out: 2024-12-25
- **Block dates:** 2024-12-20 to 2024-12-24 (5 nights)

### 2. Multiple Room Availability
- If room has `roomQty > 1` (multiple units)
- Reduce `numAvail` by 1 instead of setting to 0
- Requires fetching current availability first

### 3. Channel Propagation
- Beds24 should auto-propagate blocks to channels
- Monitor channels to verify
- May take up to 15 minutes for channels to update

### 4. Booking Status Sync
- Only block for `confirmed` and `checked_in` statuses
- Don't block for `tentative` (request) bookings
- Consider blocking for `pending` if payment expected

---

## Questions for Testing

1. **Does Beds24 automatically block dates when booking created via API?**
   - Test: Create booking, check calendar availability
   - If YES: This implementation may be redundant
   - If NO: Proceed with custom blocking

2. **How long does channel propagation take?**
   - Create booking in CheckingCheckout
   - Monitor Airbnb/Booking.com availability
   - Document timing for user expectations

3. **What happens with overlapping bookings?**
   - Create booking via CheckingCheckout
   - Create overlapping booking on Airbnb
   - Verify Beds24 prevents double booking

4. **How to handle multi-unit rooms?**
   - Room with 3 units
   - 1 booking should reduce availability to 2
   - Verify API behavior

---

## Success Criteria

✅ **Implementation Complete When:**
1. Direct bookings automatically block dates in Beds24
2. Cancelled bookings automatically unblock dates
3. Modified bookings update blocked dates accordingly
4. Status tracked in database (`beds24_dates_blocked`)
5. Frontend displays blocking status
6. Error handling for API failures
7. Documentation updated
8. Tests passing

---

## References

- [Beds24 API v2 Documentation](https://beds24.com/api/v2)
- [Current Beds24 Integration Guide](./BEDS24_INTEGRATION_GUIDE.md)
- [Beds24 Bidirectional Sync Implementation](./BEDS24_BIDIRECTIONAL_SYNC.md)
- [Beds24 Room Mapping Complete](./BEDS24_ROOM_MAPPING_COMPLETE.md)

---

## Next Steps

1. **Review this plan** with stakeholders
2. **Test automatic blocking** with current implementation
3. **Create migration** for database fields
4. **Implement blocking logic** in `sync-reservation-to-beds24`
5. **Test thoroughly** with real Beds24 account
6. **Monitor** channel propagation
7. **Document** findings and edge cases

---

**Created:** 2025-10-30  
**Status:** Planning Phase  
**Priority:** High  
**Estimated Effort:** 2-3 days  
**Dependencies:** Beds24 OAuth credentials, Room mappings configured
