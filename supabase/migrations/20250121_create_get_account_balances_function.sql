-- Create get_account_balances RPC function
-- This function retrieves account balances for a specific tenant and location

CREATE OR REPLACE FUNCTION get_account_balances(
  p_tenant_id UUID,
  p_location_id UUID DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  account_name TEXT,
  account_type TEXT,
  balance NUMERIC,
  currency TEXT,
  location_id UUID,
  location_name TEXT,
  is_active BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    a.id,
    a.account_name,
    a.account_type,
    a.balance,
    a.currency,
    a.location_id,
    l.name as location_name,
    a.is_active,
    a.created_at,
    a.updated_at
  FROM accounts a
  LEFT JOIN locations l ON a.location_id = l.id
  WHERE a.tenant_id = p_tenant_id
    AND (p_location_id IS NULL OR a.location_id = p_location_id)
    AND a.is_active = true
  ORDER BY a.account_type, a.account_name;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_account_balances(UUID, UUID) TO authenticated;

-- Add helpful comment
COMMENT ON FUNCTION get_account_balances IS 'Retrieves account balances for a tenant, optionally filtered by location';
