-- Add date blocking tracking fields to reservations table
-- This tracks whether dates were successfully blocked in Beds24 calendar
-- when direct bookings are created in CheckingCheckout

ALTER TABLE reservations
ADD COLUMN IF NOT EXISTS beds24_dates_blocked BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS beds24_dates_blocked_at TIMESTAMPTZ;

-- Add comments for documentation
COMMENT ON COLUMN reservations.beds24_dates_blocked IS 'Whether dates were successfully blocked in Beds24 calendar to prevent double bookings';
COMMENT ON COLUMN reservations.beds24_dates_blocked_at IS 'Timestamp when dates were blocked in Beds24 calendar';

-- Create index for querying blocking status
CREATE INDEX IF NOT EXISTS idx_reservations_beds24_dates_blocked
ON reservations(beds24_dates_blocked)
WHERE beds24_dates_blocked = true;

-- Log the migration
DO $$
BEGIN
  RAISE NOTICE 'Added beds24_dates_blocked and beds24_dates_blocked_at columns to reservations table';
END
$$;
