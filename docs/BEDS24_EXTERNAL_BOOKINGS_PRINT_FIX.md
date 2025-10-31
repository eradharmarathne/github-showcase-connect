# Beds24 External Bookings Print Issue Fix

## Problem

When trying to print a Beds24 booking (external booking), the application returns a 406 error and displays "There is nothing to print".

### Error Details

```
GET /rest/v1/reservations?select=*%2Clocations%28*%29%2Crooms%28*%29&id=eq.085f5737-8bf5-4ed1-8f9b-573afa049477
Status: 406 (Not Acceptable)
```

### Root Cause

The issue occurs because:

1. **Beds24 bookings are stored in `external_bookings` table**, not `reservations` table
2. The ID `085f5737-8bf5-4ed1-8f9b-573afa049477` exists in `external_bookings`
3. Some component or browser prefetch is trying to query the `reservations` table with this ID
4. Since the ID doesn't exist in `reservations`, the query returns empty results
5. PostgREST returns a 406 error when it cannot fulfill the request as formatted

### Data Structure Differences

**External Bookings Schema:**
- `id` (UUID)
- `external_id` (text) - Beds24 booking ID
- `check_in` (timestamp) - NOT `check_in_date`
- `check_out` (timestamp) - NOT `check_out_date`
- `room_id` (UUID) - May reference a room or be NULL
- `room_name` (text) - Beds24 room name
- No `reservation_number` field
- No `nights` field (must be calculated)

**Reservations Schema:**
- `id` (UUID)
- `reservation_number` (text)
- `check_in_date` (date)
- `check_out_date` (date)
- `nights` (integer)
- `room_id` (UUID) - Always references a room

## Current Implementation

The `useReservationsData` hook correctly:
1. Fetches both `reservations` and `external_bookings`
2. Transforms external bookings to match the `ReservationWithJoins` type
3. Merges them into a single array

**Transformation Example:**
```typescript
reservation_number: `${booking.source.toUpperCase()}-${booking.external_id}`
// e.g., "BOOKING_COM-77302639"
```

## Investigation Results

### Query Results

ID `085f5737-8bf5-4ed1-8f9b-573afa049477` found in `external_bookings`:
- **Guest:** Beth Allison
- **Source:** booking_com  
- **Beds24 ID:** 77302639
- **Check-in:** 2025-10-22
- **Check-out:** 2025-10-24
- **Room:** Room 102 (Deluxe)
- **Location:** bylake kandy
- **Status:** new

### All Beds24 Bookings Found

8 external bookings from booking.com for tenant `bc3a0796-4345-4479-b5c6-4eb97c8fb674`:
1. Andrew Hitchfield - Oct 24-25, 2025
2. Seve Dominguez - Jan 1-3, 2026 (duplicate)
3. Julia Fischer - Dec 30-31, 2025
4. Deborah Eichner - Nov 21-22, 2025
5. **Beth Allison - Oct 22-24, 2025** (the problematic one)
6. Grigorii Pavlenko - Dec 22-24, 2025
7. Thomas Schneider - Mar 24-26, 2026

## Solution

The print functionality should work because:
1. `useReservationsData` already transforms external bookings correctly
2. The data is passed to `printReservation` via `handlePrintReservation`
3. The print component receives the transformed data, not a fresh API call

### Why the 406 Error Occurs

The 406 error is likely caused by:
1. Browser prefetching/preloading the URL
2. A React Query refetch
3. A component effect trying to fetch fresh data
4. React-to-print trying to fetch data before printing

### Recommended Fix

**Option 1: Ensure Complete Data is Passed (Recommended)**

Make sure the `transformToPrintableData` function in `reservations-mobile-cards.tsx` includes ALL required fields from external bookings:

```typescript
const transformToPrintableData = (reservation: any): PrintableReservationData => {
  return {
    id: reservation.id,
    reservation_number: reservation.reservation_number,
    location_id: reservation.location_id,
    room_id: reservation.room_id || '',
    guest_name: reservation.guest_name || '',
    guest_email: reservation.guest_email || null,
    // ... rest of fields
    // Ensure all transformed fields from external_bookings are included
  };
};
```

**Option 2: Add Error Handling for Missing Data**

Add a check before printing to ensure all required data is present:

```typescript
const handlePrintReservation = (reservation: any) => {
  if (!reservation.id || !reservation.reservation_number) {
    toast({
      title: "Cannot Print",
      description: "Reservation data is incomplete",
      variant: "destructive"
    });
    return;
  }
  
  const printableData = transformToPrintableData(reservation);
  printReservation(printableData);
};
```

**Option 3: Disable Browser Prefetching**

Add `rel="nofollow"` or handle click events to prevent URL prefetching.

## Testing Checklist

- [ ] Print a regular reservation (from `reservations` table) ✅ Should work
- [ ] Print a Beds24 booking (from `external_bookings` table) ❌ Currently failing
- [ ] Verify all booking sources work: direct, airbnb, booking.com, beds24
- [ ] Check print preview renders all fields correctly
- [ ] Verify no 406 errors in browser console

## Related Files

- `/src/hooks/use-reservations-data.tsx` - Fetches and transforms data
- `/src/hooks/use-reservation-print.tsx` - Print functionality
- `/src/components/reservation/reservations-mobile-cards.tsx` - Print trigger
- `/src/components/reservation/reservation-printable-view.tsx` - Print template

## Database Tables

### external_bookings
Stores bookings from channel managers (Beds24, Airbnb, Booking.com, etc.)

### reservations  
Stores direct bookings created in the app

### beds24_property_mappings
Maps Beds24 properties to CheckingCheckout locations

## Next Steps

1. Investigate what component/code is making the REST API call
2. Add comprehensive error handling for print operations
3. Consider adding a loading state while data is being prepared for print
4. Add telemetry to track which bookings fail to print and why
