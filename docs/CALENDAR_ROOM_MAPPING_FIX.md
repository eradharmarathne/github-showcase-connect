# Calendar Room Mapping Fix

## Issues Identified

### 1. **External Bookings Not Showing on Calendar**
**Problem:** Unmapped external bookings (`room_id` is `null`) don't appear on any room row in the calendar.

**Root Cause:** In `room-row.tsx` line 75:
```typescript
const roomExternalBookings = externalBookings
  .filter((booking) => booking.room_id === room.id)  // ❌ Filters out bookings with room_id = null
```

**Solution:** Add an "Unmapped Bookings" section at the top of the calendar to show all external bookings without a `room_id`.

### 2. **No Tooltips on External Bookings**
**Problem:** When you hover over external bookings (from Beds24, Airbnb, etc.), you don't see check-in/check-out dates or booking details.

**Solution:** Add `Tooltip` component to `external-booking-block.tsx` with full booking details (check-in, check-out, guests, amount, status).

### 3. **Room Mapping Not Working**
**Problem:** Beds24 sync doesn't properly map Beds24 rooms to your internal rooms.

**Root Cause:** The `fetch-beds24-bookings` Edge Function doesn't have logic to map Beds24 room IDs/names to your internal `rooms` table.

**Current behavior:**
- Property mapping works (maps Beds24 property → location)
- Room mapping doesn't exist (all bookings get `room_id: null`)

**Solution:** 
- Add room-level mappings to `beds24_property_mappings` table
- Update Edge Function to lookup room mappings
- Add UI for configuring room mappings

### 4. **Currency Display Issue**
**Problem:** Bookings show "ucurrency" instead of actual currency code.

**Status:** ✅ FIXED in previous commit
- Updated Edge Function to extract currency from `b.currency` or `b.ucurrency`
- Falls back to "USD" if no currency data

## Proposed Solutions

### Solution 1: Add Unmapped Bookings Section

Update `timeline-view.tsx` to show unmapped bookings:

```typescript
// Filter unmapped external bookings
const unmappedBookings = externalBookings.filter(booking => !booking.room_id);

// In the render:
{unmappedBookings.length > 0 && (
  <div className="bg-yellow-50 border-b-2 border-yellow-300">
    <div className="bg-yellow-100 px-2 py-1">
      <div className="font-semibold text-xs text-yellow-800">
        ⚠️ Unmapped Bookings ({unmappedBookings.length})
      </div>
    </div>
    <UnmappedBookingsRow
      calendarDays={calendarDays}
      bookings={unmappedBookings}
      onBookingClick={onBookingClick}
      getStatusColor={getStatusColor}
      getCurrencySymbol={getCurrencySymbol}
    />
  </div>
)}
```

### Solution 2: Add Room Mappings Table

Create a new table or extend `beds24_property_mappings`:

```sql
ALTER TABLE beds24_property_mappings
ADD COLUMN beds24_room_id TEXT,
ADD COLUMN beds24_room_name TEXT;

-- Now mappings can be:
-- 1. Property-level: Maps Beds24 property → location
-- 2. Room-level: Maps Beds24 property + room → location + room_id
```

### Solution 3: Update Edge Function Room Mapping

In `fetch-beds24-bookings/index.ts`:

```typescript
// After finding property mapping, lookup room mapping
const roomId = b.roomId || b.roomName;

if (roomId) {
  const { data: roomMapping } = await supabase
    .from('beds24_property_mappings')
    .select('room_id')
    .eq('tenant_id', locationMapping.tenant_id)
    .eq('location_id', locationMapping.location_id)
    .or(`beds24_room_id.eq.${roomId},beds24_room_name.eq.${roomId}`)
    .eq('is_active', true)
    .single();
  
  if (roomMapping) {
    externalBookingData.room_id = roomMapping.room_id;
  }
}
```

### Solution 4: Add Room Mapping UI

In `booking-channels-integration.tsx`:

```tsx
// Add a "Room Mappings" section under Property Mappings
<div className="space-y-3">
  <Label>Room Mappings</Label>
  <Table>
    <TableHeader>
      <TableRow>
        <TableHead>Beds24 Room</TableHead>
        <TableHead>Your Room</TableHead>
        <TableHead>Actions</TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      {roomMappings.map(mapping => (
        <TableRow key={mapping.id}>
          <TableCell>{mapping.beds24_room_name}</TableCell>
          <TableCell>
            <Select value={mapping.room_id} onChange={...}>
              {rooms.map(room => (
                <SelectItem value={room.id}>{room.room_number}</SelectItem>
              ))}
            </Select>
          </TableCell>
          <TableCell>
            <Button onClick={() => updateRoomMapping(mapping.id)}>
              Update
            </Button>
          </TableCell>
        </TableRow>
      ))}
    </TableBody>
  </Table>
</div>
```

## Implementation Plan

### Phase 1: Quick Fixes (Do Now)
1. ✅ Fix currency display (DONE)
2. Add tooltips to external bookings
3. Add unmapped bookings section to calendar

### Phase 2: Room Mapping (Requires Your Input)
1. Understand your Beds24 structure (need your answers to questions)
2. Update database schema for room mappings
3. Update Edge Function to map rooms
4. Add UI for configuring room mappings

### Phase 3: Testing
1. Test with your actual Beds24 data
2. Verify room mappings work correctly
3. Ensure calendar displays all bookings properly

## Questions Needed to Continue

1. **Room Structure:**
   - Do you have one property with multiple rooms?
   - Or multiple properties (villas)?

2. **Current Calendar View:**
   - Do you see bookings but no details?
   - Do you see yellow warning icons (⚠️)?
   - Are bookings in wrong rooms?

3. **Beds24 Room Info:**
   - What room information does Beds24 provide?
   - Room names? Room IDs? Both?

4. **Property 297214:**
   - Is this your main property?
   - How many rooms does it have?

Please answer these questions so I can implement the exact solution you need!
