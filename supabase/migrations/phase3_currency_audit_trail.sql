-- Phase 3: Currency Conversion History, Audit Trail, and Transaction View
-- Execute these SQL statements in Supabase SQL Editor

-- =====================================================
-- 1. Currency Conversion Log Table
-- =====================================================
-- Tracks all currency conversions with exchange rates used

CREATE TABLE IF NOT EXISTS currency_conversion_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_type TEXT NOT NULL, -- 'payment', 'income', 'expense', 'transfer'
  transaction_id UUID NOT NULL, -- ID of the source transaction
  from_currency currency_type NOT NULL,
  to_currency currency_type NOT NULL,
  from_amount NUMERIC NOT NULL,
  to_amount NUMERIC NOT NULL,
  exchange_rate NUMERIC NOT NULL,
  rate_source TEXT, -- 'manual', 'api', 'system'
  conversion_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_currency_conversion_log_transaction 
  ON currency_conversion_log(transaction_type, transaction_id);
CREATE INDEX IF NOT EXISTS idx_currency_conversion_log_tenant 
  ON currency_conversion_log(tenant_id);
CREATE INDEX IF NOT EXISTS idx_currency_conversion_log_date 
  ON currency_conversion_log(conversion_date DESC);

COMMENT ON TABLE currency_conversion_log IS 'Tracks all currency conversions with exchange rates used';
COMMENT ON COLUMN currency_conversion_log.exchange_rate IS 'Rate used: to_amount = from_amount * exchange_rate';

-- =====================================================
-- 2. Financial Audit Log Table
-- =====================================================
-- Audit trail of all financial balance changes

CREATE TABLE IF NOT EXISTS financial_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL, -- 'account', 'reservation'
  entity_id UUID NOT NULL,
  field_name TEXT NOT NULL, -- 'current_balance', 'paid_amount', 'balance_amount', 'total_amount'
  old_value NUMERIC,
  new_value NUMERIC NOT NULL,
  change_amount NUMERIC GENERATED ALWAYS AS (new_value - COALESCE(old_value, 0)) STORED,
  transaction_type TEXT NOT NULL, -- 'payment', 'income', 'expense', 'transfer', 'service_add', 'manual_adjustment'
  transaction_id UUID, -- Reference to triggering transaction
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  changed_by UUID REFERENCES profiles(id),
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_financial_audit_log_entity 
  ON financial_audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_financial_audit_log_tenant 
  ON financial_audit_log(tenant_id);
CREATE INDEX IF NOT EXISTS idx_financial_audit_log_date 
  ON financial_audit_log(changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_financial_audit_log_transaction 
  ON financial_audit_log(transaction_type, transaction_id);

COMMENT ON TABLE financial_audit_log IS 'Audit trail of all financial balance changes';
COMMENT ON COLUMN financial_audit_log.change_amount IS 'Automatically calculated: new_value - old_value';

-- =====================================================
-- 3. Unified Transaction History View
-- =====================================================
-- Consolidated view of all financial transactions

CREATE OR REPLACE VIEW unified_transaction_history AS
-- Payments
SELECT 
  p.id as transaction_id,
  'payment' as transaction_type,
  p.payment_number as reference_number,
  p.created_at as transaction_date,
  p.account_id,
  a.name as account_name,
  p.reservation_id as related_reservation_id,
  r.reservation_number as related_reservation_number,
  p.amount,
  p.currency,
  p.payment_method,
  'credit' as entry_type, -- Payment increases account balance
  p.notes as description,
  p.tenant_id,
  p.created_by,
  NULL::UUID as location_id
FROM payments p
LEFT JOIN accounts a ON p.account_id = a.id
LEFT JOIN reservations r ON p.reservation_id = r.id

UNION ALL

-- Income (only those with account_id - actual payments/deposits)
SELECT 
  i.id as transaction_id,
  'income' as transaction_type,
  NULL as reference_number,
  i.created_at as transaction_date,
  i.account_id,
  a.name as account_name,
  i.booking_id as related_reservation_id,
  r.reservation_number as related_reservation_number,
  i.amount,
  i.currency,
  i.payment_method,
  'credit' as entry_type,
  i.note as description,
  i.tenant_id,
  NULL as created_by,
  i.location_id
FROM income i
LEFT JOIN accounts a ON i.account_id = a.id
LEFT JOIN reservations r ON i.booking_id = r.id
WHERE i.account_id IS NOT NULL -- Only actual income, not "add to bill" items

UNION ALL

-- Expenses
SELECT 
  e.id as transaction_id,
  'expense' as transaction_type,
  NULL as reference_number,
  e.created_at as transaction_date,
  e.account_id,
  a.name as account_name,
  NULL as related_reservation_id,
  NULL as related_reservation_number,
  e.amount,
  e.currency,
  NULL as payment_method,
  'debit' as entry_type, -- Expense decreases account balance
  CONCAT(e.main_type, ' - ', e.sub_type, COALESCE(': ' || e.note, '')) as description,
  e.tenant_id,
  NULL as created_by,
  e.location_id
FROM expenses e
LEFT JOIN accounts a ON e.account_id = a.id

UNION ALL

-- Account Transfers (FROM side - debit)
SELECT 
  at.id as transaction_id,
  'transfer_out' as transaction_type,
  NULL as reference_number,
  at.created_at as transaction_date,
  at.from_account_id as account_id,
  a.name as account_name,
  NULL as related_reservation_id,
  NULL as related_reservation_number,
  at.amount,
  a.currency,
  NULL as payment_method,
  'debit' as entry_type,
  CONCAT('Transfer to ', ta.name, COALESCE(': ' || at.note, '')) as description,
  at.tenant_id,
  NULL as created_by,
  NULL as location_id
FROM account_transfers at
LEFT JOIN accounts a ON at.from_account_id = a.id
LEFT JOIN accounts ta ON at.to_account_id = ta.id

UNION ALL

-- Account Transfers (TO side - credit)
SELECT 
  at.id as transaction_id,
  'transfer_in' as transaction_type,
  NULL as reference_number,
  at.created_at as transaction_date,
  at.to_account_id as account_id,
  a.name as account_name,
  NULL as related_reservation_id,
  NULL as related_reservation_number,
  at.amount * at.conversion_rate as amount,
  a.currency,
  NULL as payment_method,
  'credit' as entry_type,
  CONCAT('Transfer from ', fa.name, COALESCE(': ' || at.note, '')) as description,
  at.tenant_id,
  NULL as created_by,
  NULL as location_id
FROM account_transfers at
LEFT JOIN accounts a ON at.to_account_id = a.id
LEFT JOIN accounts fa ON at.from_account_id = fa.id

ORDER BY transaction_date DESC;

COMMENT ON VIEW unified_transaction_history IS 'Unified view of all financial transactions across payments, income, expenses, and transfers';

-- =====================================================
-- 4. Audit Logging Functions
-- =====================================================

-- Function to log account balance changes
CREATE OR REPLACE FUNCTION log_account_balance_change()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'UPDATE' AND OLD.current_balance IS DISTINCT FROM NEW.current_balance) OR TG_OP = 'INSERT' THEN
    INSERT INTO financial_audit_log (
      entity_type,
      entity_id,
      field_name,
      old_value,
      new_value,
      transaction_type,
      transaction_id,
      tenant_id,
      changed_by,
      notes
    ) VALUES (
      'account',
      NEW.id,
      'current_balance',
      CASE WHEN TG_OP = 'UPDATE' THEN OLD.current_balance ELSE NULL END,
      NEW.current_balance,
      'balance_update',
      NULL, -- Will be populated by application if needed
      NEW.tenant_id,
      NULL, -- Can be populated by application
      CASE 
        WHEN TG_OP = 'INSERT' THEN 'Account created with initial balance'
        ELSE 'Balance updated'
      END
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to log reservation amount changes
CREATE OR REPLACE FUNCTION log_reservation_amount_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Log total_amount changes
  IF (TG_OP = 'UPDATE' AND OLD.total_amount IS DISTINCT FROM NEW.total_amount) OR TG_OP = 'INSERT' THEN
    INSERT INTO financial_audit_log (
      entity_type,
      entity_id,
      field_name,
      old_value,
      new_value,
      transaction_type,
      tenant_id,
      notes
    ) VALUES (
      'reservation',
      NEW.id,
      'total_amount',
      CASE WHEN TG_OP = 'UPDATE' THEN OLD.total_amount ELSE NULL END,
      NEW.total_amount,
      'reservation_update',
      NEW.tenant_id,
      CASE 
        WHEN TG_OP = 'INSERT' THEN 'Reservation created'
        ELSE 'Total amount updated'
      END
    );
  END IF;

  -- Log paid_amount changes
  IF (TG_OP = 'UPDATE' AND OLD.paid_amount IS DISTINCT FROM NEW.paid_amount) OR TG_OP = 'INSERT' THEN
    INSERT INTO financial_audit_log (
      entity_type,
      entity_id,
      field_name,
      old_value,
      new_value,
      transaction_type,
      tenant_id,
      notes
    ) VALUES (
      'reservation',
      NEW.id,
      'paid_amount',
      CASE WHEN TG_OP = 'UPDATE' THEN OLD.paid_amount ELSE 0 END,
      NEW.paid_amount,
      'payment_received',
      NEW.tenant_id,
      'Payment amount changed'
    );
  END IF;

  -- Log balance_amount changes
  IF (TG_OP = 'UPDATE' AND OLD.balance_amount IS DISTINCT FROM NEW.balance_amount) OR TG_OP = 'INSERT' THEN
    INSERT INTO financial_audit_log (
      entity_type,
      entity_id,
      field_name,
      old_value,
      new_value,
      transaction_type,
      tenant_id,
      notes
    ) VALUES (
      'reservation',
      NEW.id,
      'balance_amount',
      CASE WHEN TG_OP = 'UPDATE' THEN OLD.balance_amount ELSE NEW.total_amount END,
      NEW.balance_amount,
      'balance_calculation',
      NEW.tenant_id,
      'Balance recalculated'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 5. Create Audit Triggers
-- =====================================================

-- Trigger for account balance changes
DROP TRIGGER IF EXISTS trigger_log_account_balance ON accounts;
CREATE TRIGGER trigger_log_account_balance
AFTER INSERT OR UPDATE ON accounts
FOR EACH ROW EXECUTE FUNCTION log_account_balance_change();

-- Trigger for reservation amount changes
DROP TRIGGER IF EXISTS trigger_log_reservation_amounts ON reservations;
CREATE TRIGGER trigger_log_reservation_amounts
AFTER INSERT OR UPDATE ON reservations
FOR EACH ROW EXECUTE FUNCTION log_reservation_amount_change();

-- =====================================================
-- 6. Helper Function: Log Currency Conversion
-- =====================================================
-- Call this from application code when performing currency conversions

CREATE OR REPLACE FUNCTION log_currency_conversion(
  p_transaction_type TEXT,
  p_transaction_id UUID,
  p_from_currency currency_type,
  p_to_currency currency_type,
  p_from_amount NUMERIC,
  p_to_amount NUMERIC,
  p_exchange_rate NUMERIC,
  p_rate_source TEXT,
  p_tenant_id UUID,
  p_created_by UUID DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO currency_conversion_log (
    transaction_type,
    transaction_id,
    from_currency,
    to_currency,
    from_amount,
    to_amount,
    exchange_rate,
    rate_source,
    tenant_id,
    created_by,
    notes
  ) VALUES (
    p_transaction_type,
    p_transaction_id,
    p_from_currency,
    p_to_currency,
    p_from_amount,
    p_to_amount,
    p_exchange_rate,
    p_rate_source,
    p_tenant_id,
    p_created_by,
    p_notes
  ) RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION log_currency_conversion IS 'Logs currency conversion with exchange rate. Call from application code.';

-- =====================================================
-- 7. Example Queries for Reporting
-- =====================================================

-- Example: Get all transactions for an account
-- SELECT * FROM unified_transaction_history 
-- WHERE account_id = 'account-uuid-here' 
-- AND tenant_id = 'tenant-uuid-here'
-- ORDER BY transaction_date DESC;

-- Example: Get audit trail for a specific reservation
-- SELECT * FROM financial_audit_log 
-- WHERE entity_type = 'reservation' 
-- AND entity_id = 'reservation-uuid-here'
-- ORDER BY changed_at DESC;

-- Example: Get all currency conversions for a tenant
-- SELECT * FROM currency_conversion_log 
-- WHERE tenant_id = 'tenant-uuid-here'
-- ORDER BY conversion_date DESC;

-- Example: Get balance change history for an account
-- SELECT * FROM financial_audit_log 
-- WHERE entity_type = 'account' 
-- AND entity_id = 'account-uuid-here'
-- AND field_name = 'current_balance'
-- ORDER BY changed_at DESC;

GRANT SELECT ON unified_transaction_history TO authenticated;
GRANT SELECT ON financial_audit_log TO authenticated;
GRANT SELECT, INSERT ON currency_conversion_log TO authenticated;
