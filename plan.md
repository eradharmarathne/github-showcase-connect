# iCal Integration Implementation Plan

## Current Status Summary

### ✅ Completed Tasks (via Rube MCP)
1. **Database Schema**: Added `room_id` and `is_active` columns to `booking_sync_urls` table
2. **Edge Functions Updated**:
   - `sync-ical`: Modified to use `external_bookings` table and support new parameters (tenant_id, property_id, room_id)
   - `scheduled-calendar-sync`: Updated to query database instead of hardcoded URLs
3. **TypeScript Types**: Regenerated from Supabase schema
4. **UI Implementation**: Added complete iCal sync management UI in booking-channels-integration page
   - Form inputs wired to state
   - Add/Delete/Manual sync functionality
   - Display existing sync URLs with badges
   - Last synced timestamps

### 🔄 Partially Complete
5. **Calendar Styling**: iCal legend entry added to `calendar-legend.tsx` (teal color)
   - ✅ Legend entry added
   - ❌ Source color not yet added to `external-booking-block.tsx`
   - ❌ Source filter not yet added to `timeline-view.tsx` and `enhanced-calendar.tsx`

### ⏳ Pending Tasks
6. **Add iCal source handling to calendar components**
7. **Migrate existing hardcoded URLs to database**

---

## Implementation Plan

### Task 6: Complete iCal Source Styling and Filtering

#### 6.1 Add iCal Color to `external-booking-block.tsx`
**File**: `/Users/kalana/dev/netronk/app.checkingcheckout.com/src/components/calendar/external-booking-block.tsx`

**Current State**: The `getSourceColor()` function handles `booking_com`, `airbnb`, `expedia`, `beds24`, and a default case.

**Changes Needed**:
```typescript
// In getSourceColor() function, add case before default:
case "ical":
  return {
    bg: "bg-teal-100",
    border: "border-teal-400",
    text: "text-teal-800",
    icon: "📅",
  };
```

**Why**: This ensures iCal bookings display with consistent teal styling matching the legend.

---

#### 6.2 Update Source Filters in `timeline-view.tsx`
**File**: `/Users/kalana/dev/netronk/app.checkingcheckout.com/src/components/calendar/timeline-view.tsx`

**Current State**:
- Line 277-290: `filteredExternalBookings` filter only checks `booking_com`, `airbnb`, `expedia`, `beds24`
- iCal bookings would fall into the "other" category

**Changes Needed**:
```typescript
// Update filteredExternalBookings filter logic (around line 277-290)
const filteredExternalBookings = externalBookings.filter((booking) => {
  if (sourceFilters) {
    const source = booking.source.toLowerCase();
    if (source === "booking_com" && !sourceFilters.booking_com) return false;
    if (source === "airbnb" && !sourceFilters.airbnb) return false;
    if (source === "expedia" && !sourceFilters.expedia) return false;
    if (source === "beds24" && !sourceFilters.beds24) return false;
    if (source === "ical" && !sourceFilters.ical) return false; // ADD THIS
    if (
      !["booking_com", "airbnb", "expedia", "beds24", "ical"].includes(source) && // UPDATE THIS
      !sourceFilters.other
    )
      return false;
  }
  // ... rest of filter logic
});
```

**Why**: Allows users to filter iCal bookings separately from "other" sources.

---

#### 6.3 Add iCal Filter Option in `enhanced-calendar.tsx`
**File**: `/Users/kalana/dev/netronk/app.checkingcheckout.com/src/pages/enhanced-calendar.tsx`

**Current State**:
- Lines 31-36: State for filter toggles (missing `showIcal`)
- Lines 167-174: `sourceFilters` prop passed to TimelineView (missing `ical` key)
- Lines 103-154: Filter dropdown menu (missing iCal checkbox)

**Changes Needed**:

1. Add state (after line 36):
```typescript
const [showIcal, setShowIcal] = useState(true);
```

2. Add to sourceFilters prop (update lines 167-174):
```typescript
sourceFilters={{
  direct: showDirectBookings,
  booking_com: showBookingCom,
  airbnb: showAirbnb,
  expedia: showExpedia,
  beds24: showBeds24,
  ical: showIcal, // ADD THIS
  other: showOther,
}}
```

3. Add checkbox in dropdown (after line 146):
```tsx
<DropdownMenuCheckboxItem
  checked={showIcal}
  onCheckedChange={setShowIcal}
>
  📅 iCal
</DropdownMenuCheckboxItem>
```

**Why**: Provides UI control to show/hide iCal bookings in the calendar view.

---

#### 6.4 Update TypeScript Interface in `timeline-view.tsx`
**File**: `/Users/kalana/dev/netronk/app.checkingcheckout.com/src/components/calendar/timeline-view.tsx`

**Current State**: Lines 58-65 define `SourceFilters` interface without `ical` property.

**Changes Needed**:
```typescript
interface SourceFilters {
  direct: boolean;
  booking_com: boolean;
  airbnb: boolean;
  expedia: boolean;
  beds24: boolean;
  ical: boolean; // ADD THIS
  other: boolean;
}
```

**Why**: Maintains TypeScript type safety for the new filter option.

---

### Task 7: Migrate Existing Hardcoded URLs to Database

**Context**: The previous `scheduled-calendar-sync` implementation may have had hardcoded URLs that are no longer being synced after database migration.

**Investigation Steps**:
1. Check git history for previous hardcoded URLs in `scheduled-calendar-sync/index.ts`
2. Review any existing iCal URLs in environment variables or config files
3. Identify all URLs that need migration

**Migration Steps**:
1. Create a migration script or use Supabase SQL editor to insert existing URLs:
```sql
-- Example migration SQL
INSERT INTO booking_sync_urls (tenant_id, location_id, ical_url, source, is_active)
VALUES
  ('tenant-uuid', 'location-uuid', 'https://ical.booking.com/...', 'booking_com', true),
  ('tenant-uuid', 'location-uuid', 'https://airbnb.com/calendar/ical/...', 'airbnb', true);
```

2. Test each URL by triggering manual sync via UI
3. Verify bookings are imported correctly
4. Remove any old hardcoded URLs from codebase

**Alternative Approach**: If no hardcoded URLs existed, this task can be marked as "Not Applicable" after verification.

---

## Testing Checklist

### Unit Testing
- [ ] Calendar legend displays iCal entry with teal color
- [ ] iCal bookings render with teal styling in timeline
- [ ] iCal filter toggle works in enhanced calendar
- [ ] iCal bookings filtered correctly when toggle is off

### Integration Testing
- [ ] Add new iCal URL via UI
- [ ] Trigger manual sync for iCal URL
- [ ] Verify bookings appear in `external_bookings` table
- [ ] Verify bookings display on calendar with correct styling
- [ ] Delete sync URL (soft delete with `is_active = false`)
- [ ] Verify deleted URL no longer syncs

### Edge Cases
- [ ] Multiple iCal URLs for same location
- [ ] iCal URL with invalid/expired content
- [ ] iCal bookings overlapping with direct bookings
- [ ] Room mapping for iCal bookings (room_id nullable)
- [ ] Scheduled sync runs successfully (test cron trigger)

---

## Files to Modify

1. **`src/components/calendar/external-booking-block.tsx`** (Lines 12-51)
   - Add iCal case to `getSourceColor()` function

2. **`src/components/calendar/timeline-view.tsx`** (Lines 58-65, 277-290)
   - Update `SourceFilters` interface to include `ical: boolean`
   - Update `filteredExternalBookings` filter logic to handle iCal source

3. **`src/pages/enhanced-calendar.tsx`** (Lines 31-36, 103-154, 167-174)
   - Add `showIcal` state
   - Add iCal checkbox to filter dropdown
   - Add `ical` to `sourceFilters` prop

4. **Migration (Optional)**: `supabase/migrations/` or SQL editor
   - Only if existing hardcoded URLs need to be migrated

---

## Success Criteria

✅ **Visual**: iCal bookings display with teal color (bg-teal-100, border-teal-400)
✅ **Functional**: Users can add/edit/delete iCal sync URLs via UI
✅ **Filtering**: iCal filter toggle works independently in calendar
✅ **Sync**: Manual and scheduled syncs import iCal bookings correctly
✅ **Data Integrity**: All bookings have correct `source`, `tenant_id`, `location_id`
✅ **Type Safety**: No TypeScript errors after changes

---

## Rollback Plan

If issues occur:
1. Revert changes to calendar components (keep UI and Edge Functions)
2. iCal bookings will still be imported but styled as "other" (gray)
3. Database schema and Edge Functions are safe to keep (backward compatible)

---

## Notes

- **Color Choice**: Teal was chosen to distinguish iCal from other channels (blue=booking.com, pink=airbnb, yellow=expedia, purple=beds24)
- **Source Standardization**: Ensure sync-ical function uses lowercase "ical" as source value
- **Performance**: Current implementation fetches external bookings with 30-second cache (staleTime: 30000)
- **Room Mapping**: iCal bookings support optional `room_id` - unmapped bookings show warning icon
