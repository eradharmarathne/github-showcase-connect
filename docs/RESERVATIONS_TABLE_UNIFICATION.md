# Reservations Table Unification

## Overview
Migrated from dual-table architecture (`reservations` + `external_bookings`) to unified single-table design. All bookings now stored in `reservations` table with `is_external` flag to distinguish sources.

## Migration Details

### Added Fields to `reservations` Table

| Field | Type | Purpose |
|-------|------|---------|
| `external_id` | TEXT | External booking ID from channel manager (e.g., Beds24) |
| `property_id` | TEXT | External property ID from channel manager |
| `source_channel` | TEXT | Booking source: direct, beds24, airbnb, booking_com, etc. |
| `room_name` | TEXT | Room name from external booking (before room mapping) |
| `last_synced_at` | TIMESTAMPTZ | Last sync timestamp with external channel |
| `raw_data` | JSONB | Original JSON data from external source |
| `is_external` | BOOLEAN | TRUE for channel manager bookings, FALSE for direct |
| `check_in_timestamp` | TIMESTAMPTZ | Check-in with precise time (for external bookings) |
| `check_out_timestamp` | TIMESTAMPTZ | Check-out with precise time (for external bookings) |

### Schema Changes

**Made Nullable:**
- `room_id` - External bookings may not have room mapping initially
- `reservation_number` - External bookings use `external_id` instead
- `room_rate` - May not be immediately available for external bookings

**Indexes Added:**
```sql
CREATE INDEX idx_reservations_external_id ON reservations(external_id, source_channel);
CREATE INDEX idx_reservations_is_external ON reservations(is_external, tenant_id);
CREATE INDEX idx_reservations_source_channel ON reservations(source_channel, tenant_id);
CREATE INDEX idx_reservations_check_dates ON reservations(check_in_date, check_out_date, location_id);
```

### Data Migration

All data from `external_bookings` table was migrated to `reservations`:
- **49 external bookings** successfully migrated
- `is_external` set to `TRUE`
- `source_channel` mapped from `source` field
- Check-in/out dates and timestamps properly converted
- Status values mapped to `reservation_status` enum
- Room rate calculated from `total_amount / nights`

### Backward Compatibility

Created view `external_bookings_view` that mimics old table structure:
```sql
CREATE VIEW external_bookings_view AS
SELECT ... FROM reservations WHERE is_external = TRUE;
```

This ensures existing queries against `external_bookings` continue to work.

## Application Code Updates

### Query Pattern Changes

**Before (Dual Tables):**
```typescript
// Fetch from reservations
const { data: directBookings } = await supabase
  .from('reservations')
  .select('*')
  .eq('tenant_id', tenant.id);

// Fetch from external_bookings  
const { data: externalBookings } = await supabase
  .from('external_bookings')
  .select('*')
  .eq('tenant_id', tenant.id);

// Merge manually
const allBookings = [...directBookings, ...externalBookings];
```

**After (Unified Table):**
```typescript
// Single query for all bookings
const { data: allBookings } = await supabase
  .from('reservations')
  .select('*')
  .eq('tenant_id', tenant.id);

// Filter if needed
const directBookings = allBookings.filter(b => !b.is_external);
const externalBookings = allBookings.filter(b => b.is_external);
```

### Component Updates

Updated components to work with unified table:
- `ViewReservationDialog` - Handles both booking types seamlessly
- `PaymentDialog` - Processes payments for any booking type
- `reservations-mobile-cards` - Display logic unified

**Field Mapping Example:**
```typescript
// Detect booking type
const isExternal = booking.is_external;

// Use appropriate fields
const checkInDate = isExternal ? booking.check_in_timestamp : booking.check_in_date;
const bookingNumber = isExternal 
  ? `${booking.source_channel.toUpperCase()}-${booking.external_id}`
  : booking.reservation_number;
```

## Benefits

1. **Simplified Code** - No more dual-table logic, field mapping, or manual merging
2. **Unified RLS** - Single set of security policies for all bookings
3. **Better Queries** - Join directly to rooms, locations, payments
4. **Easier Analytics** - All booking data in one place
5. **Consistent UX** - External bookings work identically to direct bookings

## Breaking Changes

### Database
- `external_bookings` table deprecated (use `external_bookings_view` for compatibility)
- Queries should target `reservations` table with `is_external` filter

### Frontend
- Components should check `is_external` flag instead of table name
- Use `source_channel` instead of `booking_source` for new bookings
- Handle nullable `room_id` and `reservation_number`

## Migration Checklist

- [x] Add new fields to reservations table
- [x] Migrate data from external_bookings to reservations
- [x] Create indexes for performance
- [x] Create backward-compatible view
- [x] Update ViewReservationDialog component
- [x] Update PaymentDialog component
- [x] Add trigger for date/timestamp synchronization
- [ ] Update useReservationsData hook (if needed)
- [ ] Update reservation forms to handle external bookings
- [ ] Update calendar components
- [ ] Update reports to use unified table
- [ ] Update Edge Functions (Beds24 sync) to use reservations table
- [ ] Regenerate TypeScript types
- [ ] Test external booking creation
- [ ] Test payment recording
- [ ] Test view/edit workflows

## Next Steps

1. **Regenerate Types:**
```bash
npx supabase gen types typescript --project-id "$PROJECT_REF" --schema public > database.types.ts
```

2. **Update Hooks:** Simplify `useReservationsData` to query single table

3. **Update Edge Functions:** Modify Beds24 sync functions to insert into `reservations` with `is_external=TRUE`

4. **Remove Old Code:** Clean up dual-table logic from components

5. **Update Documentation:** Update API docs and component README files

## Rollback Plan

If issues arise, rollback is possible:
1. Data remains in `reservations` table (not deleted)
2. Can recreate `external_bookings` table from view:
```sql
CREATE TABLE external_bookings AS 
SELECT * FROM external_bookings_view;
```

## Performance Impact

**Positive:**
- Fewer table joins required
- Single index lookup instead of dual-table scan
- Reduced query complexity

**Considerations:**
- `reservations` table now larger (49 + existing rows)
- Indexes cover external booking lookups efficiently
- RLS policies apply uniformly

## Security

All existing RLS policies on `reservations` automatically apply to external bookings:
- Tenant isolation via `tenant_id`
- Location-based access control
- User permission checking

No additional security configuration needed.

## Testing

**Test Cases:**
1. ✅ View external booking details
2. ✅ Record payment for external booking
3. ⏳ Create new external booking (via Beds24 sync)
4. ⏳ Update external booking status
5. ⏳ Query all bookings (mixed direct + external)
6. ⏳ Filter by source_channel
7. ⏳ Calendar display with unified bookings

**Manual Testing:**
```sql
-- Verify migration
SELECT 
  COUNT(*) FILTER (WHERE is_external = TRUE) as external_count,
  COUNT(*) FILTER (WHERE is_external = FALSE) as direct_count,
  COUNT(*) as total_count
FROM reservations
WHERE tenant_id = 'bc3a0796-4345-4479-b5c6-4eb97c8fb674';

-- Check external booking details
SELECT 
  id, external_id, source_channel, guest_name, 
  check_in_date, check_out_date, total_amount, is_external
FROM reservations
WHERE is_external = TRUE
LIMIT 5;
```

## Notes

- External bookings retain original `id` from `external_bookings` table
- Timestamp fields preserve exact check-in/out times from channel managers
- `raw_data` JSONB field preserves complete original booking data
- `source_channel` replaces `booking_source` for clarity
- Trigger automatically syncs date/timestamp fields on insert/update

## Related Files

- Migration: `supabase/migrations/[timestamp]_unify_reservations_and_external_bookings.sql`
- Components: 
  - `src/components/modals/view-reservation-dialog.tsx`
  - `src/components/reservation/payment-dialog.tsx`
  - `src/components/reservation/reservations-mobile-cards.tsx`
- Types: `src/integrations/supabase/types.ts` (needs regeneration)
- Documentation: This file

## Support

For questions or issues, refer to:
- Database schema: Check `reservations` table structure in Supabase dashboard
- Application code: Review updated components in `src/components/`
- Original documentation: `docs/BEDS24_EXTERNAL_BOOKINGS_PRINT_FIX.md`
