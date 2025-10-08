-- Create Missing RPC Functions
-- Created: 2025-10-08
-- Author: Claude Code (Automated Migration)
-- Supabase Ref: takovelbhvoqnvfmnhaq
-- Purpose: Add 4 RPC functions mentioned in CLAUDE.md but missing from database

-- =====================================================================================
-- 1. get_user_permissions() - Return permission matrix for a user
-- =====================================================================================
CREATE OR REPLACE FUNCTION get_user_permissions(p_user_id UUID)
RETURNS TABLE (
  access_dashboard BOOLEAN,
  access_income BOOLEAN,
  access_expenses BOOLEAN,
  access_reports BOOLEAN,
  access_calendar BOOLEAN,
  access_bookings BOOLEAN,
  access_rooms BOOLEAN,
  access_master_files BOOLEAN,
  access_accounts BOOLEAN,
  access_users BOOLEAN,
  access_settings BOOLEAN,
  access_booking_channels BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    up.access_dashboard,
    up.access_income,
    up.access_expenses,
    up.access_reports,
    up.access_calendar,
    up.access_bookings,
    up.access_rooms,
    up.access_master_files,
    up.access_accounts,
    up.access_users,
    up.access_settings,
    up.access_booking_channels
  FROM user_permissions up
  WHERE up.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_user_permissions(UUID) IS 'Retrieves the complete permission matrix for a given user';

-- =====================================================================================
-- 2. generate_reservation_number() - Auto-increment booking references
-- =====================================================================================
CREATE OR REPLACE FUNCTION generate_reservation_number(
  p_tenant_id UUID,
  p_location_id UUID
)
RETURNS TEXT AS $$
DECLARE
  v_next_number INTEGER;
  v_location_code TEXT;
  v_reservation_number TEXT;
BEGIN
  -- Get location code (use first 3 chars of name, uppercase)
  SELECT UPPER(SUBSTRING(name FROM 1 FOR 3)) INTO v_location_code
  FROM locations
  WHERE id = p_location_id;

  -- If location not found, use default code
  IF v_location_code IS NULL THEN
    v_location_code := 'LOC';
  END IF;

  -- Get next sequential number for this tenant/location
  -- Use SELECT FOR UPDATE to avoid race conditions
  SELECT COALESCE(
    MAX(
      CAST(
        SUBSTRING(reservation_number FROM '[0-9]+$')
        AS INTEGER
      )
    ),
    0
  ) + 1 INTO v_next_number
  FROM reservations
  WHERE tenant_id = p_tenant_id
    AND location_id = p_location_id
    AND reservation_number LIKE v_location_code || '-%'
  FOR UPDATE SKIP LOCKED;

  -- Generate final reservation number: LOC-00001
  v_reservation_number := v_location_code || '-' || LPAD(v_next_number::TEXT, 5, '0');

  RETURN v_reservation_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION generate_reservation_number(UUID, UUID) IS 'Generates a unique sequential reservation number for a tenant/location combination';

-- =====================================================================================
-- 3. accept_invitation() - Atomically handle user invitation acceptance
-- =====================================================================================
CREATE OR REPLACE FUNCTION accept_invitation(
  p_invitation_id UUID,
  p_user_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_tenant_id UUID;
  v_location_id UUID;
  v_permissions JSONB;
BEGIN
  -- Get invitation details
  SELECT tenant_id, location_id, permissions
  INTO v_tenant_id, v_location_id, v_permissions
  FROM user_invitations
  WHERE id = p_invitation_id
    AND accepted_at IS NULL
    AND expires_at > NOW();

  -- If invitation not found or expired
  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Invalid or expired invitation';
  END IF;

  -- Update profile with tenant_id
  UPDATE profiles
  SET tenant_id = v_tenant_id
  WHERE id = p_user_id;

  -- Create user_permissions record if permissions provided
  IF v_permissions IS NOT NULL AND v_location_id IS NOT NULL THEN
    INSERT INTO user_permissions (
      user_id,
      tenant_id,
      location_id,
      access_dashboard,
      access_income,
      access_expenses,
      access_reports,
      access_calendar,
      access_bookings,
      access_rooms,
      access_master_files,
      access_accounts,
      access_users,
      access_settings,
      access_booking_channels
    ) VALUES (
      p_user_id,
      v_tenant_id,
      v_location_id,
      COALESCE((v_permissions->>'access_dashboard')::BOOLEAN, true),
      COALESCE((v_permissions->>'access_income')::BOOLEAN, true),
      COALESCE((v_permissions->>'access_expenses')::BOOLEAN, true),
      COALESCE((v_permissions->>'access_reports')::BOOLEAN, false),
      COALESCE((v_permissions->>'access_calendar')::BOOLEAN, true),
      COALESCE((v_permissions->>'access_bookings')::BOOLEAN, true),
      COALESCE((v_permissions->>'access_rooms')::BOOLEAN, false),
      COALESCE((v_permissions->>'access_master_files')::BOOLEAN, false),
      COALESCE((v_permissions->>'access_accounts')::BOOLEAN, false),
      COALESCE((v_permissions->>'access_users')::BOOLEAN, false),
      COALESCE((v_permissions->>'access_settings')::BOOLEAN, false),
      COALESCE((v_permissions->>'access_booking_channels')::BOOLEAN, false)
    )
    ON CONFLICT (user_id, location_id) DO NOTHING;
  END IF;

  -- Mark invitation as accepted
  UPDATE user_invitations
  SET accepted_at = NOW(),
      accepted_by = p_user_id
  WHERE id = p_invitation_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION accept_invitation(UUID, UUID) IS 'Atomically accepts an invitation, updates profile, and creates permissions';

-- =====================================================================================
-- 4. is_email_allowed() - Check if email is allowed to access a tenant
-- =====================================================================================
CREATE OR REPLACE FUNCTION is_email_allowed(
  p_email TEXT,
  p_tenant_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_invitations
    WHERE email = p_email
      AND tenant_id = p_tenant_id
      AND expires_at > NOW()
  ) OR EXISTS (
    SELECT 1 FROM profiles
    WHERE email = p_email
      AND tenant_id = p_tenant_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION is_email_allowed(TEXT, UUID) IS 'Checks if an email is allowed to access a tenant (via invitation or existing profile)';
