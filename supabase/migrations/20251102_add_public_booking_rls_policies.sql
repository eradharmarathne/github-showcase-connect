-- Add RLS policies to allow public access to locations, tenants, and rooms for public booking pages

-- Policy 1: Allow public (anonymous) users to SELECT locations where public_booking_enabled is true
CREATE POLICY "Public can view locations with public booking enabled"
ON public.locations
FOR SELECT
TO public
USING (public_booking_enabled = true);

-- Policy 2: Allow public (anonymous) users to SELECT tenants that have public booking enabled locations
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

-- Policy 3: Allow public (anonymous) users to SELECT active rooms in locations with public booking enabled
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
