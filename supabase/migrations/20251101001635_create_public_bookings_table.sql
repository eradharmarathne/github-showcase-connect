-- Create public_bookings table for storing booking requests from public booking form
CREATE TABLE IF NOT EXISTS public_bookings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  
  -- Guest Information
  guest_name TEXT NOT NULL,
  guest_email TEXT NOT NULL,
  guest_phone TEXT,
  guest_address TEXT,
  guest_nationality TEXT,
  
  -- Booking Preferences
  check_in_date DATE NOT NULL,
  check_out_date DATE NOT NULL,
  adults INTEGER DEFAULT 1,
  children INTEGER DEFAULT 0,
  room_type_preference TEXT,
  special_requests TEXT,
  
  -- Status tracking
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'rejected', 'converted')),
  converted_reservation_id UUID REFERENCES reservations(id) ON DELETE SET NULL,
  
  -- Additional metadata
  source TEXT DEFAULT 'public_form',
  ip_address TEXT,
  user_agent TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT valid_dates CHECK (check_out_date > check_in_date)
);

-- Add RLS policies
ALTER TABLE public_bookings ENABLE ROW LEVEL SECURITY;

-- Policy: Allow public insert (anyone can submit a booking request)
CREATE POLICY "Allow public insert" ON public_bookings
  FOR INSERT
  WITH CHECK (true);

-- Policy: Tenant members can view their bookings
CREATE POLICY "Tenant members can view" ON public_bookings
  FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id 
      FROM profiles 
      WHERE id = auth.uid()
    )
  );

-- Policy: Tenant members can update their bookings
CREATE POLICY "Tenant members can update" ON public_bookings
  FOR UPDATE
  USING (
    tenant_id IN (
      SELECT tenant_id 
      FROM profiles 
      WHERE id = auth.uid()
    )
  );

-- Create index for better query performance
CREATE INDEX idx_public_bookings_tenant_location ON public_bookings(tenant_id, location_id);
CREATE INDEX idx_public_bookings_status ON public_bookings(status);
CREATE INDEX idx_public_bookings_dates ON public_bookings(check_in_date, check_out_date);

-- Add updated_at trigger
CREATE TRIGGER update_public_bookings_updated_at
  BEFORE UPDATE ON public_bookings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
