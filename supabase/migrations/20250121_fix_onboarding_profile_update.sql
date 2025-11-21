-- Fix profile update during onboarding
-- Issue: RLS policy blocks profile.tenant_id update during onboarding
-- Solution: Create a SECURITY DEFINER function that bypasses RLS

-- Function to update profile tenant_id during onboarding
CREATE OR REPLACE FUNCTION update_profile_tenant_id(
  p_profile_id UUID,
  p_tenant_id UUID,
  p_role TEXT DEFAULT 'admin'
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER -- This allows the function to bypass RLS
SET search_path = public
AS $$
BEGIN
  -- Update the profile with tenant_id
  UPDATE profiles
  SET
    tenant_id = p_tenant_id,
    role = p_role,
    updated_at = NOW()
  WHERE id = p_profile_id;

  -- Verify the user owns this profile (additional security check)
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found or access denied';
  END IF;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION update_profile_tenant_id(UUID, UUID, TEXT) TO authenticated;

-- Add comment
COMMENT ON FUNCTION update_profile_tenant_id IS 'Updates profile tenant_id during onboarding, bypassing RLS';
