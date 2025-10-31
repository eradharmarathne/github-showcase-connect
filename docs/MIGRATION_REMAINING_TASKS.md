# Remaining Files to Update - External Bookings Migration

## Summary
The following files still query the old `external_bookings` table and need to be updated to use the unified `reservations` table with the `is_external` flag.

## Files to Update

### 1. ✅ COMPLETED - Core Application
- `src/hooks/use-reservations-data.tsx` - ✅ Updated
- `src/components/modals/view-reservation-dialog.tsx` - ✅ Updated  
- `src/components/reservation/payment-dialog.tsx` - ✅ Updated

### 2. 🔄 Calendar & Timeline Components

#### `src/hooks/use-calendar-data.tsx` (2 occurrences)
**Current:**
```typescript
.from("external_bookings")
```

**Update to:**
```typescript
.from("reservations")
.eq("is_external", true)
```

#### `src/components/calendar/timeline-view.tsx` (1 occurrence)
**Current:**
```typescript
.from("external_bookings")
```

**Update to:**
```typescript
.from("reservations")
.eq("is_external", true)
```

### 3. 🔄 Master Files Components

#### `src/components/master-files/locations-tab.tsx` (2 occurrences)
**Current:**
```typescript
.from("external_bookings")
```

**Update to:**
```typescript
.from("reservations")
.eq("is_external", true)
```

### 4. 🔄 Booking Channels Integration

#### `src/pages/booking-channels-integration.tsx` (2 occurrences)
**Current:**
```typescript
.from("external_bookings")
```

**Update to:**
```typescript
.from("reservations")
.eq("is_external", true)
```

### 5. 🔄 Financial Hooks

#### `src/hooks/use-reservation-financials.tsx` (1 occurrence)
**Current:**
```typescript
.from("external_bookings")
```

**Update to:**
```typescript
.from("reservations")
.eq("is_external", true)
```

### 6. 🔄 Edge Functions (CRITICAL)

#### `supabase/functions/fetch-beds24-bookings/index.ts` (1 occurrence)
**Current:**
```typescript
.from("external_bookings")
.upsert({...})
```

**Update to:**
```typescript
.from("reservations")
.upsert({
  ...existingFields,
  is_external: true,
  source_channel: 'beds24',
  external_id: booking.id,
  property_id: booking.propertyId,
  raw_data: booking,
  // ... other fields
})
```

#### `supabase/functions/sync-ical/index.ts` (3 occurrences)
**Current:**
```typescript
.from("external_bookings")
.upsert({...})
```

**Update to:**
```typescript
.from("reservations")
.upsert({
  ...existingFields,
  is_external: true,
  source_channel: 'ical', // or booking source
  raw_data: booking,
  // ... other fields
})
```

### 7. 📚 Documentation (No Action Needed)
- `docs/BEDS24_INTEGRATION_GUIDE.md` - Documentation only
- `docs/RESERVATIONS_TABLE_UNIFICATION.md` - Documentation only
- `docs/BEDS24_ROOM_MAPPING_GUIDE.md` - Documentation only

## Update Pattern

### For SELECT Queries
```typescript
// OLD
const { data } = await supabase
  .from("external_bookings")
  .select("*")
  .eq("location_id", locationId);

// NEW
const { data } = await supabase
  .from("reservations")
  .select("*")
  .eq("is_external", true)
  .eq("location_id", locationId);
```

### For INSERT/UPSERT Operations
```typescript
// OLD
await supabase.from("external_bookings").insert({
  external_id: booking.id,
  source: 'beds24',
  guest_name: booking.guestName,
  check_in: booking.checkIn,
  check_out: booking.checkOut,
  total_amount: booking.totalAmount,
  // ...
});

// NEW
await supabase.from("reservations").insert({
  is_external: true,
  external_id: booking.id,
  source_channel: 'beds24',
  guest_name: booking.guestName,
  check_in_timestamp: booking.checkIn,
  check_out_timestamp: booking.checkOut,
  check_in_date: new Date(booking.checkIn).toISOString().split('T')[0],
  check_out_date: new Date(booking.checkOut).toISOString().split('T')[0],
  total_amount: booking.totalAmount,
  raw_data: booking, // Store complete original data
  // ...
});
```

### Important Field Mappings

| Old Field | New Field | Notes |
|-----------|-----------|-------|
| `source` | `source_channel` | Use enum: 'direct', 'beds24', 'airbnb', etc. |
| `check_in` | `check_in_timestamp` + `check_in_date` | Timestamp for external, date for direct |
| `check_out` | `check_out_timestamp` + `check_out_date` | Timestamp for external, date for direct |
| N/A | `is_external` | **Required:** Set to `true` for all external bookings |
| N/A | `raw_data` | Store complete original booking JSON |
| N/A | `room_rate` | Calculate from `total_amount / nights` |

## Priority Order

1. **HIGH PRIORITY - Edge Functions**
   - `fetch-beds24-bookings/index.ts` - Affects live sync
   - `sync-ical/index.ts` - Affects calendar sync

2. **MEDIUM PRIORITY - Hooks**
   - `use-calendar-data.tsx` - Calendar display
   - `use-reservation-financials.tsx` - Financial calculations

3. **LOW PRIORITY - UI Components**
   - `booking-channels-integration.tsx` - Admin page
   - `locations-tab.tsx` - Settings page
   - `timeline-view.tsx` - Alternative calendar view

## Testing Checklist

After updates:
- [ ] Test Beds24 booking sync
- [ ] Test iCal calendar sync
- [ ] Verify calendar display shows all bookings
- [ ] Confirm financial reports include external bookings
- [ ] Check booking channels integration page
- [ ] Verify location deletion checks all booking types
- [ ] Test timeline view displays correctly

## Database Cleanup

Once all code is migrated and tested:
```sql
-- Drop the old table (AFTER thorough testing)
DROP TABLE IF EXISTS external_bookings CASCADE;

-- Drop the compatibility view
DROP VIEW IF EXISTS external_bookings_view;
```

## Rollback Plan

If issues occur:
1. Revert code changes via git
2. Data is still in `reservations` table (not lost)
3. Can recreate `external_bookings` from `external_bookings_view` if needed
