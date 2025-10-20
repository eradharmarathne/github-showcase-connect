-- Migration: Add Beds24 Channel Integration
-- Date: 2025-10-20
-- Description: Create table for Beds24 OAuth credentials per tenant with RLS policies

-- Enable pgcrypto extension for token encryption
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =============================================================================
-- TABLE: beds24_credentials
-- Description: Stores Beds24 API OAuth credentials per tenant
-- Security: Each tenant has ONE Beds24 account connection
-- =============================================================================
CREATE TABLE IF NOT EXISTS beds24_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Beds24 OAuth tokens (encrypted at rest)
  refresh_token TEXT NOT NULL,
  access_token TEXT,
  token_expires_at TIMESTAMPTZ,

  -- Beds24 API status tracking
  is_active BOOLEAN DEFAULT true,
  last_synced_at TIMESTAMPTZ,
  sync_status TEXT DEFAULT 'pending',
  error_message TEXT,

  -- Audit fields
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES profiles(id),

  -- Constraints
  CONSTRAINT unique_tenant_beds24 UNIQUE(tenant_id),
  CONSTRAINT valid_sync_status CHECK (sync_status IN ('pending', 'active', 'syncing', 'error', 'expired', 'disconnected'))
);

-- =============================================================================
-- ROW LEVEL SECURITY POLICIES
-- =============================================================================

-- Enable RLS
ALTER TABLE beds24_credentials ENABLE ROW LEVEL SECURITY;

-- Policy: Tenants can only read their own credentials
CREATE POLICY "Tenants can view own Beds24 credentials"
  ON beds24_credentials
  FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id 
      FROM profiles 
      WHERE id = auth.uid()
    )
  );

-- Policy: Tenants can insert their own credentials
CREATE POLICY "Tenants can insert own Beds24 credentials"
  ON beds24_credentials
  FOR INSERT
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id 
      FROM profiles 
      WHERE id = auth.uid()
    )
  );

-- Policy: Tenants can update their own credentials
CREATE POLICY "Tenants can update own Beds24 credentials"
  ON beds24_credentials
  FOR UPDATE
  USING (
    tenant_id IN (
      SELECT tenant_id 
      FROM profiles 
      WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id 
      FROM profiles 
      WHERE id = auth.uid()
    )
  );

-- Policy: Tenants can delete their own credentials
CREATE POLICY "Tenants can delete own Beds24 credentials"
  ON beds24_credentials
  FOR DELETE
  USING (
    tenant_id IN (
      SELECT tenant_id 
      FROM profiles 
      WHERE id = auth.uid()
    )
  );

-- =============================================================================
-- INDEXES
-- =============================================================================

-- Index for quick tenant lookup
CREATE INDEX idx_beds24_credentials_tenant_id 
  ON beds24_credentials(tenant_id);

-- Index for active credentials
CREATE INDEX idx_beds24_credentials_active 
  ON beds24_credentials(tenant_id, is_active) 
  WHERE is_active = true;

-- Index for sync status monitoring
CREATE INDEX idx_beds24_credentials_sync_status 
  ON beds24_credentials(sync_status, last_synced_at);

-- =============================================================================
-- TRIGGERS
-- =============================================================================

-- Trigger: Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_beds24_credentials_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  NEW.updated_by = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER beds24_credentials_updated_at
  BEFORE UPDATE ON beds24_credentials
  FOR EACH ROW
  EXECUTE FUNCTION update_beds24_credentials_updated_at();

-- =============================================================================
-- HELPER FUNCTIONS
-- =============================================================================

-- Function: Get active Beds24 credentials for current tenant
CREATE OR REPLACE FUNCTION get_beds24_credentials()
RETURNS TABLE (
  id UUID,
  refresh_token TEXT,
  access_token TEXT,
  token_expires_at TIMESTAMPTZ,
  is_active BOOLEAN,
  last_synced_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    bc.id,
    bc.refresh_token,
    bc.access_token,
    bc.token_expires_at,
    bc.is_active,
    bc.last_synced_at
  FROM beds24_credentials bc
  INNER JOIN profiles p ON p.tenant_id = bc.tenant_id
  WHERE p.id = auth.uid()
    AND bc.is_active = true
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_beds24_credentials() TO authenticated;

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON TABLE beds24_credentials IS 'Stores Beds24 API OAuth credentials per tenant for channel manager integration';
COMMENT ON COLUMN beds24_credentials.refresh_token IS 'Beds24 OAuth refresh token (long-lived, used to get access tokens)';
COMMENT ON COLUMN beds24_credentials.access_token IS 'Beds24 OAuth access token (short-lived, used for API calls)';
COMMENT ON COLUMN beds24_credentials.token_expires_at IS 'When the current access token expires';
COMMENT ON COLUMN beds24_credentials.is_active IS 'Whether this Beds24 integration is currently active';
COMMENT ON COLUMN beds24_credentials.sync_status IS 'Current sync status: pending, active, syncing, error, expired, disconnected';
COMMENT ON COLUMN beds24_credentials.last_synced_at IS 'Last successful sync with Beds24 API';
