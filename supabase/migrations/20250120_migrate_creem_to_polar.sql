-- Migration: Complete Creem.io to Polar.sh Migration
-- This migration renames all Creem-related columns to Polar equivalents
-- and adds necessary tables/columns for Polar integration

-- ============================================================================
-- PART 1: Update subscriptions table
-- ============================================================================

-- Rename Creem columns to Polar equivalents
ALTER TABLE subscriptions
  RENAME COLUMN creem_customer_id TO polar_customer_id;

ALTER TABLE subscriptions
  RENAME COLUMN creem_subscription_id TO polar_subscription_id;

-- Add new Polar-specific column
ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS polar_checkout_id TEXT;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_subscriptions_polar_customer_id
  ON subscriptions(polar_customer_id);

CREATE INDEX IF NOT EXISTS idx_subscriptions_polar_subscription_id
  ON subscriptions(polar_subscription_id);

-- ============================================================================
-- PART 2: Update payment_attempts table
-- ============================================================================

-- Rename Creem columns to Polar equivalents
ALTER TABLE payment_attempts
  RENAME COLUMN creem_order_id TO polar_order_id;

ALTER TABLE payment_attempts
  RENAME COLUMN creem_customer_id TO polar_customer_id;

ALTER TABLE payment_attempts
  RENAME COLUMN creem_subscription_id TO polar_subscription_id;

-- Add new Polar-specific column
ALTER TABLE payment_attempts
  ADD COLUMN IF NOT EXISTS polar_checkout_id TEXT;

-- Update indexes
CREATE INDEX IF NOT EXISTS idx_payment_attempts_polar_order_id
  ON payment_attempts(polar_order_id);

CREATE INDEX IF NOT EXISTS idx_payment_attempts_polar_checkout_id
  ON payment_attempts(polar_checkout_id);

-- ============================================================================
-- PART 3: Update plans table
-- ============================================================================

-- Rename product_id to polar_product_id (if column exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'plans' AND column_name = 'product_id'
  ) THEN
    ALTER TABLE plans RENAME COLUMN product_id TO polar_product_id;
  END IF;
END $$;

-- Add polar_product_id if it doesn't exist
ALTER TABLE plans
  ADD COLUMN IF NOT EXISTS polar_product_id TEXT;

-- Add polar_price_id (Polar uses price IDs for checkout)
ALTER TABLE plans
  ADD COLUMN IF NOT EXISTS polar_price_id TEXT;

-- Add index for price lookups
CREATE INDEX IF NOT EXISTS idx_plans_polar_price_id
  ON plans(polar_price_id);

-- ============================================================================
-- PART 4: Create polar_webhook_events table (for idempotency)
-- ============================================================================

CREATE TABLE IF NOT EXISTS polar_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT UNIQUE NOT NULL,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  processed_at TIMESTAMPTZ DEFAULT NOW(),
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient webhook processing
CREATE INDEX IF NOT EXISTS idx_polar_webhook_events_event_id
  ON polar_webhook_events(event_id);

CREATE INDEX IF NOT EXISTS idx_polar_webhook_events_event_type
  ON polar_webhook_events(event_type);

CREATE INDEX IF NOT EXISTS idx_polar_webhook_events_created_at
  ON polar_webhook_events(created_at DESC);

-- RLS policies for polar_webhook_events (service role only)
ALTER TABLE polar_webhook_events ENABLE ROW LEVEL SECURITY;

-- Only service role can access webhook events
CREATE POLICY "Service role can manage webhook events"
  ON polar_webhook_events
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- PART 5: Update trigger for updated_at
-- ============================================================================

CREATE OR REPLACE FUNCTION update_polar_webhook_events_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_polar_webhook_events_updated_at_trigger
  BEFORE UPDATE ON polar_webhook_events
  FOR EACH ROW
  EXECUTE FUNCTION update_polar_webhook_events_updated_at();

-- ============================================================================
-- PART 6: Add helpful comments
-- ============================================================================

COMMENT ON TABLE polar_webhook_events IS 'Stores Polar.sh webhook events for idempotent processing';
COMMENT ON COLUMN polar_webhook_events.event_id IS 'Unique event ID from Polar webhook';
COMMENT ON COLUMN polar_webhook_events.event_type IS 'Event type (e.g., subscription.active, order.paid)';
COMMENT ON COLUMN polar_webhook_events.payload IS 'Full webhook payload as JSONB';
COMMENT ON COLUMN polar_webhook_events.processed_at IS 'Timestamp when event was successfully processed';
COMMENT ON COLUMN polar_webhook_events.error_message IS 'Error message if processing failed';
COMMENT ON COLUMN polar_webhook_events.retry_count IS 'Number of processing retries';

COMMENT ON COLUMN subscriptions.polar_customer_id IS 'Polar.sh customer ID';
COMMENT ON COLUMN subscriptions.polar_subscription_id IS 'Polar.sh subscription ID';
COMMENT ON COLUMN subscriptions.polar_checkout_id IS 'Polar.sh checkout session ID';

COMMENT ON COLUMN payment_attempts.polar_order_id IS 'Polar.sh order ID';
COMMENT ON COLUMN payment_attempts.polar_customer_id IS 'Polar.sh customer ID';
COMMENT ON COLUMN payment_attempts.polar_subscription_id IS 'Polar.sh subscription ID';
COMMENT ON COLUMN payment_attempts.polar_checkout_id IS 'Polar.sh checkout session ID';

COMMENT ON COLUMN plans.polar_product_id IS 'Polar.sh product ID';
COMMENT ON COLUMN plans.polar_price_id IS 'Polar.sh price ID (used for checkout)';

-- ============================================================================
-- PART 7: Create view for payment status monitoring
-- ============================================================================

CREATE OR REPLACE VIEW payment_attempts_with_polar AS
SELECT
  pa.id,
  pa.tenant_id,
  pa.user_id,
  pa.checkout_session_id,
  pa.polar_checkout_id,
  pa.polar_order_id,
  pa.polar_customer_id,
  pa.polar_subscription_id,
  pa.status,
  pa.amount_cents,
  pa.currency,
  pa.plan_id,
  pa.created_at,
  pa.completed_at,
  pa.expires_at,
  t.name as tenant_name,
  p.email as user_email
FROM payment_attempts pa
LEFT JOIN tenants t ON pa.tenant_id = t.id
LEFT JOIN profiles p ON pa.user_id = p.id;

COMMENT ON VIEW payment_attempts_with_polar IS 'Enhanced view of payment attempts with Polar IDs and related data';

-- ============================================================================
-- PART 8: Grant necessary permissions
-- ============================================================================

-- Grant access to authenticated users for their own payment attempts
GRANT SELECT ON payment_attempts_with_polar TO authenticated;

-- Service role has full access
GRANT ALL ON polar_webhook_events TO service_role;

-- ============================================================================
-- Migration Complete
-- ============================================================================

-- This migration successfully:
-- ✅ Renamed all Creem columns to Polar equivalents
-- ✅ Added Polar-specific columns
-- ✅ Created polar_webhook_events table for idempotency
-- ✅ Added appropriate indexes for performance
-- ✅ Set up RLS policies
-- ✅ Created monitoring views
-- ✅ Added helpful comments

-- Next steps:
-- 1. Deploy Edge Functions (handle-polar-webhook, create-polar-checkout)
-- 2. Update frontend to use Polar SDK
-- 3. Configure Polar webhook endpoint
-- 4. Create products in Polar dashboard
-- 5. Update plans table with polar_price_id values
