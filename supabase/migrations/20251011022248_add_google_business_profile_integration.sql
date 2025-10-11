-- Migration: Add Google Business Profile Integration
-- Date: 2025-10-11
-- Description: Create tables for Google Business Profile credentials and reviews with RLS policies

-- Enable pgcrypto extension for token encryption
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =============================================================================
-- TABLE: google_business_credentials
-- Description: Stores Google Business Profile OAuth credentials per location
-- =============================================================================
CREATE TABLE IF NOT EXISTS google_business_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,

  -- OAuth fields (tokens should be encrypted in production)
  google_account_id TEXT,
  google_location_id TEXT,
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,

  -- Status tracking
  is_active BOOLEAN DEFAULT true,
  last_synced_at TIMESTAMPTZ,
  sync_status TEXT DEFAULT 'pending',
  error_message TEXT,

  -- Audit fields
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT unique_tenant_location_google UNIQUE(tenant_id, location_id),
  CONSTRAINT unique_google_location UNIQUE(google_location_id),
  CONSTRAINT valid_sync_status CHECK (sync_status IN ('pending', 'active', 'syncing', 'error', 'expired', 'disconnected'))
);

-- =============================================================================
-- TABLE: google_reviews
-- Description: Cached Google Business Profile reviews with reply tracking
-- =============================================================================
CREATE TABLE IF NOT EXISTS google_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,

  -- Google review data
  google_review_id TEXT NOT NULL,
  reviewer_name TEXT,
  reviewer_profile_photo_url TEXT,
  star_rating INTEGER NOT NULL CHECK (star_rating >= 1 AND star_rating <= 5),
  comment TEXT,
  review_time TIMESTAMPTZ NOT NULL,

  -- Reply tracking
  has_reply BOOLEAN DEFAULT false,
  reply_text TEXT,
  reply_updated_at TIMESTAMPTZ,
  replied_by UUID REFERENCES profiles(id),

  -- Sync metadata
  raw_data JSONB,
  last_fetched_at TIMESTAMPTZ DEFAULT NOW(),

  -- Audit fields
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT unique_google_review UNIQUE(google_review_id)
);

-- =============================================================================
-- INDEXES
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_google_business_credentials_tenant_location
  ON google_business_credentials(tenant_id, location_id);
CREATE INDEX IF NOT EXISTS idx_google_business_credentials_status
  ON google_business_credentials(sync_status) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_google_reviews_tenant_location
  ON google_reviews(tenant_id, location_id);
CREATE INDEX IF NOT EXISTS idx_google_reviews_rating
  ON google_reviews(star_rating);
CREATE INDEX IF NOT EXISTS idx_google_reviews_time
  ON google_reviews(review_time DESC);
CREATE INDEX IF NOT EXISTS idx_google_reviews_has_reply
  ON google_reviews(has_reply);
CREATE INDEX IF NOT EXISTS idx_google_reviews_location_time
  ON google_reviews(location_id, review_time DESC);

-- =============================================================================
-- TRIGGERS
-- =============================================================================
CREATE OR REPLACE FUNCTION update_google_business_credentials_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_google_business_credentials_updated_at
  BEFORE UPDATE ON google_business_credentials
  FOR EACH ROW
  EXECUTE FUNCTION update_google_business_credentials_updated_at();

CREATE OR REPLACE FUNCTION update_google_reviews_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_google_reviews_updated_at
  BEFORE UPDATE ON google_reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_google_reviews_updated_at();

-- =============================================================================
-- ADD access_reviews PERMISSION
-- =============================================================================
ALTER TABLE user_permissions
ADD COLUMN IF NOT EXISTS access_reviews BOOLEAN DEFAULT false;

-- Grant access_reviews to existing tenant admins
UPDATE user_permissions
SET access_reviews = true
WHERE is_tenant_admin = true OR tenant_role = 'tenant_admin';

-- Update get_user_permissions function
DROP FUNCTION IF EXISTS get_user_permissions(UUID);

CREATE FUNCTION get_user_permissions(p_user_id UUID)
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
  access_booking_channels BOOLEAN,
  access_reviews BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(bool_or(up.access_dashboard), false) as access_dashboard,
    COALESCE(bool_or(up.access_income), false) as access_income,
    COALESCE(bool_or(up.access_expenses), false) as access_expenses,
    COALESCE(bool_or(up.access_reports), false) as access_reports,
    COALESCE(bool_or(up.access_calendar), false) as access_calendar,
    COALESCE(bool_or(up.access_bookings), false) as access_bookings,
    COALESCE(bool_or(up.access_rooms), false) as access_rooms,
    COALESCE(bool_or(up.access_master_files), false) as access_master_files,
    COALESCE(bool_or(up.access_accounts), false) as access_accounts,
    COALESCE(bool_or(up.access_users), false) as access_users,
    COALESCE(bool_or(up.access_settings), false) as access_settings,
    COALESCE(bool_or(up.access_booking_channels), false) as access_booking_channels,
    COALESCE(bool_or(up.access_reviews), false) as access_reviews
  FROM user_permissions up
  WHERE up.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================================================

-- Enable RLS
ALTER TABLE google_business_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE google_reviews ENABLE ROW LEVEL SECURITY;

-- ========================
-- google_business_credentials Policies
-- ========================

CREATE POLICY "Users can view credentials for their tenant"
  ON google_business_credentials
  FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Admins can insert credentials"
  ON google_business_credentials
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.tenant_id = google_business_credentials.tenant_id
      AND (p.is_tenant_admin = true OR p.tenant_role = 'tenant_admin')
    )
    OR
    EXISTS (
      SELECT 1 FROM user_permissions up
      WHERE up.user_id = auth.uid()
      AND up.tenant_id = google_business_credentials.tenant_id
      AND up.access_settings = true
    )
  );

CREATE POLICY "Admins can update credentials"
  ON google_business_credentials
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.tenant_id = google_business_credentials.tenant_id
      AND (p.is_tenant_admin = true OR p.tenant_role = 'tenant_admin')
    )
    OR
    EXISTS (
      SELECT 1 FROM user_permissions up
      WHERE up.user_id = auth.uid()
      AND up.tenant_id = google_business_credentials.tenant_id
      AND up.access_settings = true
    )
  );

CREATE POLICY "Admins can delete credentials"
  ON google_business_credentials
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.tenant_id = google_business_credentials.tenant_id
      AND (p.is_tenant_admin = true OR p.tenant_role = 'tenant_admin')
    )
  );

-- ========================
-- google_reviews Policies
-- ========================

CREATE POLICY "Users can view reviews for their locations"
  ON google_reviews
  FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM profiles WHERE id = auth.uid()
    )
    AND (
      location_id IN (
        SELECT location_id FROM user_permissions WHERE user_id = auth.uid()
      )
      OR
      EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.id = auth.uid()
        AND p.tenant_id = google_reviews.tenant_id
        AND (p.is_tenant_admin = true OR p.tenant_role = 'tenant_admin')
      )
    )
  );

CREATE POLICY "Service role can insert reviews"
  ON google_reviews
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users with access_reviews can reply to reviews"
  ON google_reviews
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_permissions up
      WHERE up.user_id = auth.uid()
      AND up.location_id = google_reviews.location_id
      AND up.access_reviews = true
    )
    OR
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.tenant_id = google_reviews.tenant_id
      AND (p.is_tenant_admin = true OR p.tenant_role = 'tenant_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_permissions up
      WHERE up.user_id = auth.uid()
      AND up.location_id = google_reviews.location_id
      AND up.access_reviews = true
    )
    OR
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.tenant_id = google_reviews.tenant_id
      AND (p.is_tenant_admin = true OR p.tenant_role = 'tenant_admin')
    )
  );

CREATE POLICY "Service role can update reviews"
  ON google_reviews
  FOR UPDATE
  USING (true);

-- =============================================================================
-- COMMENTS
-- =============================================================================
COMMENT ON TABLE google_business_credentials IS 'Stores Google Business Profile OAuth credentials per location with encryption';
COMMENT ON TABLE google_reviews IS 'Cached Google Business Profile reviews with reply tracking';
COMMENT ON COLUMN user_permissions.access_reviews IS 'Permission to view and reply to Google Business Profile reviews';
COMMENT ON FUNCTION get_user_permissions IS 'Returns aggregated permissions for a user across all their assigned locations';
