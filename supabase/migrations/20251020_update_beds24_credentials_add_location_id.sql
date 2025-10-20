-- Migration: Update Beds24 Credentials to Add Location ID
-- Date: 2025-10-20
-- Description: Add location_id to beds24_credentials for per-location credential storage
-- Reason: Each location (property) has separate Beds24 account, not one per tenant

-- =============================================================================
-- ALTER TABLE: beds24_credentials
-- Add location_id and update constraints
-- =============================================================================

-- Drop old unique constraint on tenant_id only
ALTER TABLE beds24_credentials DROP CONSTRAINT IF EXISTS unique_tenant_beds24;

-- Add location_id column
ALTER TABLE beds24_credentials 
ADD COLUMN location_id UUID REFERENCES locations(id) ON DELETE CASCADE;

-- Update existing rows to set location_id (if any exist)
-- This assumes each tenant has at least one location
UPDATE beds24_credentials 
SET location_id = (
  SELECT id FROM locations 
  WHERE locations.tenant_id = beds24_credentials.tenant_id 
  LIMIT 1
)
WHERE location_id IS NULL;

-- Make location_id NOT NULL after populating existing rows
ALTER TABLE beds24_credentials 
ALTER COLUMN location_id SET NOT NULL;

-- Create new unique constraint on tenant_id + location_id
-- Each location can have only ONE Beds24 connection
ALTER TABLE beds24_credentials 
ADD CONSTRAINT unique_tenant_location_beds24 UNIQUE(tenant_id, location_id);

-- Update table comment
COMMENT ON TABLE beds24_credentials IS 'Stores Beds24 API OAuth credentials per location for channel manager integration. Each location (property) has separate Beds24 credentials.';
COMMENT ON COLUMN beds24_credentials.location_id IS 'Location (property) these Beds24 credentials belong to';

-- =============================================================================
-- UPDATE INDEXES
-- =============================================================================

-- Drop old index on tenant_id only
DROP INDEX IF EXISTS idx_beds24_credentials_tenant_id;

-- Create composite index on tenant_id and location_id
CREATE INDEX idx_beds24_credentials_tenant_location 
  ON beds24_credentials(tenant_id, location_id);

-- Update active credentials index to include location_id
DROP INDEX IF EXISTS idx_beds24_credentials_active;
CREATE INDEX idx_beds24_credentials_active 
  ON beds24_credentials(tenant_id, location_id, is_active) 
  WHERE is_active = true;

-- =============================================================================
-- UPDATE HELPER FUNCTION
-- =============================================================================

-- Drop old function
DROP FUNCTION IF EXISTS get_beds24_credentials();

-- Create new function that accepts location_id parameter
CREATE OR REPLACE FUNCTION get_beds24_credentials(p_location_id UUID DEFAULT NULL)
RETURNS TABLE (
  id UUID,
  location_id UUID,
  refresh_token TEXT,
  access_token TEXT,
  token_expires_at TIMESTAMPTZ,
  is_active BOOLEAN,
  last_synced_at TIMESTAMPTZ,
  sync_status TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    bc.id,
    bc.location_id,
    bc.refresh_token,
    bc.access_token,
    bc.token_expires_at,
    bc.is_active,
    bc.last_synced_at,
    bc.sync_status
  FROM beds24_credentials bc
  INNER JOIN profiles p ON p.tenant_id = bc.tenant_id
  WHERE p.id = auth.uid()
    AND bc.is_active = true
    AND (p_location_id IS NULL OR bc.location_id = p_location_id)
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_beds24_credentials(UUID) TO authenticated;

COMMENT ON FUNCTION get_beds24_credentials(UUID) IS 'Get active Beds24 credentials for current user. Optionally filter by location_id. Returns first active credential if location_id is NULL.';
