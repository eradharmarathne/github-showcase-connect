-- Add assigned_room_id to public_bookings table
-- This allows admins to assign a specific room when confirming a public booking request

ALTER TABLE public_bookings 
ADD COLUMN IF NOT EXISTS assigned_room_id UUID REFERENCES rooms(id) ON DELETE SET NULL;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_public_bookings_assigned_room 
ON public_bookings(assigned_room_id);

-- Add comment
COMMENT ON COLUMN public_bookings.assigned_room_id IS 'The room assigned to this booking request when confirmed by admin';
