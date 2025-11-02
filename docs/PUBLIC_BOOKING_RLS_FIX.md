# Public Booking Page RLS Fix

## Issue
The public booking page (`/r/:locationSlug`) was returning a 406 error when accessed by unauthenticated users:
```
Failed to load resource: the server responded with a status of 406 ()
Error fetching data: code: "PGRST116"
details: "The result contains 0 rows"
message: "Cannot coerce the result to a single JSON object"
```

## Root Cause
The Row Level Security (RLS) policies on the `locations`, `tenants`, and `rooms` tables required authentication. When a user who was logged out tried to access the public booking page, the queries failed because the RLS policies blocked access.

### Previous RLS Policies
- **locations**: Only allowed authenticated users from the same tenant to SELECT
- **tenants**: Only allowed authenticated users who owned or were part of the tenant to SELECT
- **rooms**: Only allowed authenticated users from the same tenant to SELECT

## Solution
Added three new RLS policies to allow public (unauthenticated) access:

### 1. Public Access to Locations
```sql
CREATE POLICY "Public can view locations with public booking enabled"
ON public.locations
FOR SELECT
TO public
USING (public_booking_enabled = true);
```
Allows anyone to view locations where `public_booking_enabled = true`.

### 2. Public Access to Tenants
```sql
CREATE POLICY "Public can view tenants with public booking locations"
ON public.tenants
FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1 
    FROM public.locations 
    WHERE locations.tenant_id = tenants.id 
    AND locations.public_booking_enabled = true
  )
);
```
Allows anyone to view tenant information if that tenant has at least one location with public booking enabled.

### 3. Public Access to Rooms
```sql
CREATE POLICY "Public can view rooms in public booking locations"
ON public.rooms
FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1 
    FROM public.locations 
    WHERE locations.id = rooms.location_id 
    AND locations.tenant_id = rooms.tenant_id
    AND locations.public_booking_enabled = true
  )
  AND is_active = true
);
```
Allows anyone to view active rooms in locations where public booking is enabled.

## Security Considerations

### Data Exposure
These policies only expose:
- Locations that have explicitly enabled public booking
- Tenant information (name, username) for tenants with public booking locations
- Active rooms in public booking locations

### Protected Data
All other data remains protected:
- Reservations, income, expenses, and financial data require authentication
- Locations with `public_booking_enabled = false` remain private
- Inactive rooms are not exposed to the public
- User permissions and profiles require authentication

### Public Bookings Table
The `public_bookings` table already had the correct policy:
```sql
CREATE POLICY "Allow public insert"
ON public.public_bookings
FOR INSERT
TO public
USING (true);
```
This allows unauthenticated users to submit booking requests.

## Testing
After applying these policies, you can test by:

1. **Logout from the application**
2. **Navigate to** `http://localhost:8080/r/bylake-kandy` (or any location slug with public booking enabled)
3. **Verify that:**
   - The location name, address, and contact information load correctly
   - Room types are displayed (if `show_room_prices` is enabled, prices are shown)
   - The booking form is accessible and functional
   - Submission creates a record in `public_bookings`

## Migration Applied
Migration file: `supabase/migrations/20251102_add_public_booking_rls_policies.sql`

The migration has been applied to the production database and committed to version control.

## Related Files
- `/src/pages/public-page.tsx` - Public booking page component
- `/src/components/settings/public-booking-settings.tsx` - Settings for configuring public booking
- `/src/components/reservation/public-bookings-manager.tsx` - Managing submitted booking requests

## Future Enhancements
Consider adding:
- Rate limiting on public booking submissions to prevent spam
- CAPTCHA on the booking form for additional security
- Analytics tracking for public booking page views
- Custom branding/theming for public booking pages per location
