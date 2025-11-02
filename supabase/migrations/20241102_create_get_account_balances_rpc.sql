-- Migration: Create get_account_balances RPC function
-- Purpose: Optimize account balance calculations with single database query
-- Replaces N+1 queries in account-balances component

CREATE OR REPLACE FUNCTION get_account_balances(
  p_tenant_id UUID,
  p_location_ids UUID[]
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  currency TEXT,
  initial_balance NUMERIC,
  current_balance NUMERIC,
  location_access UUID[],
  total_income NUMERIC,
  total_expenses NUMERIC,
  total_incoming_transfers NUMERIC,
  total_outgoing_transfers NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.id,
    a.name,
    a.currency::TEXT,
    a.initial_balance,
    a.current_balance,
    a.location_access,
    COALESCE(SUM(i.amount), 0) AS total_income,
    COALESCE(SUM(e.amount), 0) AS total_expenses,
    COALESCE(SUM(at_in.amount * COALESCE(at_in.conversion_rate, 1)), 0) AS total_incoming_transfers,
    COALESCE(SUM(at_out.amount), 0) AS total_outgoing_transfers
  FROM accounts a
  LEFT JOIN income i ON i.account_id = a.id AND i.tenant_id = p_tenant_id
  LEFT JOIN expenses e ON e.account_id = a.id AND e.tenant_id = p_tenant_id
  LEFT JOIN account_transfers at_in ON at_in.to_account_id = a.id AND at_in.tenant_id = p_tenant_id
  LEFT JOIN account_transfers at_out ON at_out.from_account_id = a.id AND at_out.tenant_id = p_tenant_id
  WHERE a.tenant_id = p_tenant_id
    AND a.location_access && p_location_ids  -- Array overlap operator
  GROUP BY a.id, a.name, a.currency, a.initial_balance, a.current_balance, a.location_access;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_account_balances(UUID, UUID[]) TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION get_account_balances IS 'Calculates account balances with income, expenses, and transfers in a single query for performance optimization';
