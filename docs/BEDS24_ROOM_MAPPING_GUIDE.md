# Beds24 Room Mapping - Complete Guide

## The Problem You're Facing

When Beds24 sends bookings, it includes:
- `propertyId` (e.g., 123456) - The Beds24 property/listing
- `roomId` (e.g., 7890) - The Beds24 room within that property
- `roomName` (e.g., "Deluxe Ocean View")

But in CheckingCheckout, you have:
- `locations` (your properties)
- `rooms` (your room inventory)

**The Challenge:** How do we automatically map Beds24 rooms to your CheckingCheckout rooms so bookings appear in the correct room?

---

## What Beds24 API Returns

### Sample Beds24 GET /bookings Response:

```json
{
  "data": [
    {
      "id": 87654321,
      "propertyId": 123456,
      "roomId": 7890,
      "roomName": "Deluxe Ocean View",
      "arrival": "2024-12-20",
      "departure": "2024-12-25",
      "channel": "booking",
      "guestName": "John Doe",
      "numAdult": 2,
      "numChild": 0,
      "status": "confirmed",
      "totalAmount": 500,
      "currency": "USD"
    }
  ]
}
```

### Key Fields for Mapping:
- **`propertyId`**: Beds24's property/listing ID (maps to your location)
- **`roomId`**: Beds24's room ID within that property
- **`roomName`**: Human-readable room name from Beds24

---

## Current Mapping System (Manual)

### Table: `beds24_property_mappings`

Maps Beds24 **properties** to your **locations**:

```sql
CREATE TABLE beds24_property_mappings (
  id UUID PRIMARY KEY,
  location_id UUID REFERENCES locations(id),
  room_id UUID REFERENCES rooms(id),  -- Optional: specific room mapping
  beds24_property_id TEXT,             -- Beds24 propertyId
  beds24_property_name TEXT,           -- Human-readable name
  mapping_type TEXT,                   -- 'villa' or 'room'
  is_active BOOLEAN DEFAULT true
);
```

**Example Data:**
```
| location_id | room_id | beds24_property_id | beds24_property_name | mapping_type |
|-------------|---------|-------------------|---------------------|--------------|
| uuid-loc-1  | NULL    | 123456            | Beach Villa         | villa        |
| uuid-loc-1  | uuid-r1 | 123456            | Deluxe Ocean View   | room         |
```

### Problem with Current System:
1. **Property-level mapping only** - Maps entire Beds24 property to location
2. **No room-level mapping** - Bookings don't know which specific room in CheckingCheckout
3. **Manual setup required** - You have to configure each mapping
4. **Bookings go to `external_bookings`** - Not to `reservations` with specific room

---

## The Solution: Automatic Room Mapping

### New Table: `channel_room_mappings`

We need to map Beds24 **rooms** to CheckingCheckout **rooms**:

```sql
CREATE TABLE channel_room_mappings (
  id UUID PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id),
  location_id UUID REFERENCES locations(id),
  room_id UUID REFERENCES rooms(id),         -- Your CheckingCheckout room
  channel_room_id TEXT,                      -- Beds24 roomId (e.g., '7890')
  channel_room_name TEXT,                    -- Beds24 roomName
  channel TEXT CHECK (channel IN ('beds24', 'airbnb', 'booking_com', 'expedia', 'other')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**Example Mapping:**
```
| room_id (CCO) | channel_room_id (Beds24) | channel_room_name       | channel |
|---------------|--------------------------|------------------------|---------|
| uuid-room-101 | 7890                     | Deluxe Ocean View      | beds24  |
| uuid-room-102 | 7891                     | Standard Garden View   | beds24  |
| uuid-room-103 | 7892                     | Premium Suite          | beds24  |
```

---

## How Automatic Mapping Works

### Step 1: Fetch Beds24 Rooms (One-Time Setup)

Create Edge Function to fetch all rooms from Beds24:

```typescript
// GET https://api.beds24.com/v2/inventory/rooms?propertyId=123456

Response:
{
  "data": [
    {
      "id": 7890,
      "name": "Deluxe Ocean View",
      "propertyId": 123456,
      "maxOccupancy": 2,
      "description": "..."
    },
    {
      "id": 7891,
      "name": "Standard Garden View",
      "propertyId": 123456,
      "maxOccupancy": 2
    }
  ]
}
```

### Step 2: Smart Name Matching

When fetching Beds24 rooms, auto-match to CheckingCheckout rooms by:

1. **Exact name match**
   - Beds24: "Deluxe Ocean View"
   - CCO: "Deluxe Ocean View" ✅

2. **Fuzzy match** (contains, similar)
   - Beds24: "Deluxe Ocean View Room"
   - CCO: "Ocean View Deluxe" ✅ (80% similarity)

3. **Manual mapping** (fallback)
   - Show UI with dropdowns to match manually

### Step 3: Update Fetch Function

Modify `fetch-beds24-bookings` to use room mappings:

```typescript
// After getting booking from Beds24:
const beds24RoomId = String(booking.roomId);

// Look up CheckingCheckout room
const roomMapping = await supabase
  .from('channel_room_mappings')
  .select('room_id')
  .eq('channel_room_id', beds24RoomId)
  .eq('channel', 'beds24')
  .eq('is_active', true)
  .single();

// Now we know which room in CheckingCheckout!
const checkingCheckoutRoomId = roomMapping?.data?.room_id;

// Save to external_bookings with room_id
await supabase.from('external_bookings').upsert({
  ...bookingData,
  room_id: checkingCheckoutRoomId,  // ✅ Specific room mapped!
  room_name: booking.roomName
});
```

---

## Implementation Plan

### Phase 1: Create Room Mapping UI

**Page:** Booking Channels Integration → Room Mappings Tab

**Features:**
1. **Fetch Beds24 Rooms** button
2. **Auto-match suggestions** (name similarity)
3. **Manual mapping dropdowns**
4. **Save mappings** to `channel_room_mappings`

### Phase 2: Update Fetch Function

Modify `fetch-beds24-bookings/index.ts` to:
1. Query `channel_room_mappings` for each booking
2. Use `room_id` if mapping exists
3. Fall back to `room_name` only if no mapping

### Phase 3: Sync Reservation Creation

When external booking has `room_id`:
1. Option to "Convert to Reservation"
2. Auto-fill room field
3. Create in `reservations` table instead of `external_bookings`

---

## Example UI Flow

### Setup (One-Time):

1. **Go to:** Booking Channels Integration
2. **Click:** "Map Rooms" tab
3. **Select:** Your location (e.g., "Beach Villa")
4. **Click:** "Fetch Beds24 Rooms"
5. **See table:**

```
| Beds24 Room Name      | Beds24 Room ID | CheckingCheckout Room | Status        |
|-----------------------|----------------|----------------------|---------------|
| Deluxe Ocean View     | 7890           | [Dropdown ▼]         | Not Mapped    |
| Standard Garden View  | 7891           | [Dropdown ▼]         | Not Mapped    |
| Premium Suite         | 7892           | Room 103 (Premium)   | Auto-Matched ✅|
```

6. **Select rooms** from dropdowns
7. **Click:** "Save Mappings"
8. **Done!** Future bookings auto-assign to correct rooms

---

## Benefits of This Approach

### Before (Current):
❌ External bookings have no room assignment  
❌ Manual work to assign each booking to room  
❌ Calendar doesn't show channel bookings in correct rooms  
❌ Risk of double-booking same room  

### After (With Mapping):
✅ External bookings auto-assign to correct room  
✅ Calendar shows all bookings in their actual rooms  
✅ Availability tracking works correctly  
✅ No manual intervention needed  
✅ Room-level reporting accurate  

---

## Let Me Build This For You

I'll create:

1. ✅ **Migration** - Add/update `channel_room_mappings` table
2. ✅ **Edge Function** - `fetch-beds24-rooms` to get room list from Beds24
3. ✅ **UI Component** - Room mapping interface with auto-match
4. ✅ **Update fetch function** - Use mappings when processing bookings
5. ✅ **Documentation** - Setup guide for users

This will make your system **fully automatic** - you just map rooms once, then all future bookings go to the correct room!

Should I implement this now?
