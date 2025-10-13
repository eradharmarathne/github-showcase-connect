-- Migration: Add Payment Security Features
-- Description: Add new subscription statuses and payment_attempts table for secure payment processing
-- Date: 2025-01-13

-- 1. Add new subscription statuses if they don't exist
DO $$
BEGIN
    -- Add 'pending_payment' status
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum e
        JOIN pg_type t ON e.enumtypid = t.oid
        WHERE t.typname = 'subscription_status' AND e.enumlabel = 'pending_payment'
    ) THEN
        ALTER TYPE subscription_status ADD VALUE 'pending_payment';
    END IF;

    -- Add 'payment_failed' status
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum e
        JOIN pg_type t ON e.enumtypid = t.oid
        WHERE t.typname = 'subscription_status' AND e.enumlabel = 'payment_failed'
    ) THEN
        ALTER TYPE subscription_status ADD VALUE 'payment_failed';
    END IF;

    -- Add 'incomplete' status (for subscriptions awaiting first payment)
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum e
        JOIN pg_type t ON e.enumtypid = t.oid
        WHERE t.typname = 'subscription_status' AND e.enumlabel = 'incomplete'
    ) THEN
        ALTER TYPE subscription_status ADD VALUE 'incomplete';
    END IF;
END$$;

-- 2. Create payment_attempts table for tracking payment status
CREATE TABLE IF NOT EXISTS payment_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    checkout_session_id TEXT UNIQUE,
    creem_order_id TEXT,
    creem_customer_id TEXT,
    creem_subscription_id TEXT,
    status TEXT NOT NULL CHECK (status IN ('pending', 'completed', 'failed', 'expired', 'cancelled')),
    amount_cents INTEGER,
    currency TEXT DEFAULT 'USD',
    plan_id TEXT,
    metadata JSONB DEFAULT '{}',
    error_message TEXT,
    payment_method TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '10 minutes',
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_payment_attempts_tenant_id ON payment_attempts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payment_attempts_user_id ON payment_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_attempts_checkout_session_id ON payment_attempts(checkout_session_id);
CREATE INDEX IF NOT EXISTS idx_payment_attempts_status ON payment_attempts(status);
CREATE INDEX IF NOT EXISTS idx_payment_attempts_expires_at ON payment_attempts(expires_at) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_payment_attempts_created_at ON payment_attempts(created_at);

-- 4. Add comment to table
COMMENT ON TABLE payment_attempts IS 'Tracks payment attempts and their verification status for secure payment processing';
COMMENT ON COLUMN payment_attempts.checkout_session_id IS 'Unique Creem checkout session ID from URL parameters';
COMMENT ON COLUMN payment_attempts.status IS 'pending: awaiting payment, completed: webhook verified, failed: payment failed, expired: timeout, cancelled: user cancelled';
COMMENT ON COLUMN payment_attempts.expires_at IS 'Payment attempt expires after 10 minutes to prevent stale records';

-- 5. Enable Row Level Security
ALTER TABLE payment_attempts ENABLE ROW LEVEL SECURITY;

-- 6. Create RLS policies

-- Users can view their own payment attempts
CREATE POLICY "Users can view own payment attempts"
    ON payment_attempts
    FOR SELECT
    USING (auth.uid() = user_id);

-- Users can insert their own payment attempts
CREATE POLICY "Users can create own payment attempts"
    ON payment_attempts
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Service role can do everything (for webhooks)
CREATE POLICY "Service role has full access to payment attempts"
    ON payment_attempts
    FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role');

-- 7. Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_payment_attempts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Create trigger to update updated_at on row update
CREATE TRIGGER payment_attempts_updated_at
    BEFORE UPDATE ON payment_attempts
    FOR EACH ROW
    EXECUTE FUNCTION update_payment_attempts_updated_at();

-- 9. Create function to cleanup expired payment attempts
CREATE OR REPLACE FUNCTION cleanup_expired_payment_attempts()
RETURNS void AS $$
BEGIN
    UPDATE payment_attempts
    SET
        status = 'expired',
        error_message = 'Payment attempt timed out after 10 minutes',
        updated_at = NOW()
    WHERE
        status = 'pending'
        AND expires_at < NOW();

    RAISE NOTICE 'Cleaned up % expired payment attempts', FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION cleanup_expired_payment_attempts() IS 'Marks pending payment attempts as expired after timeout period';

-- 10. Create function to record payment attempt
CREATE OR REPLACE FUNCTION create_payment_attempt(
    p_tenant_id UUID,
    p_user_id UUID,
    p_checkout_session_id TEXT,
    p_plan_id TEXT,
    p_amount_cents INTEGER DEFAULT NULL,
    p_currency TEXT DEFAULT 'USD',
    p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
    v_attempt_id UUID;
BEGIN
    INSERT INTO payment_attempts (
        tenant_id,
        user_id,
        checkout_session_id,
        plan_id,
        status,
        amount_cents,
        currency,
        metadata
    ) VALUES (
        p_tenant_id,
        p_user_id,
        p_checkout_session_id,
        p_plan_id,
        'pending',
        p_amount_cents,
        p_currency,
        p_metadata
    )
    RETURNING id INTO v_attempt_id;

    RETURN v_attempt_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION create_payment_attempt IS 'Creates a new payment attempt record with pending status';

-- 11. Create function to mark payment as completed
CREATE OR REPLACE FUNCTION complete_payment_attempt(
    p_checkout_session_id TEXT,
    p_creem_order_id TEXT,
    p_creem_customer_id TEXT DEFAULT NULL,
    p_creem_subscription_id TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    v_updated BOOLEAN;
BEGIN
    UPDATE payment_attempts
    SET
        status = 'completed',
        creem_order_id = p_creem_order_id,
        creem_customer_id = COALESCE(p_creem_customer_id, creem_customer_id),
        creem_subscription_id = COALESCE(p_creem_subscription_id, creem_subscription_id),
        completed_at = NOW(),
        updated_at = NOW()
    WHERE
        checkout_session_id = p_checkout_session_id
        AND status = 'pending';

    GET DIAGNOSTICS v_updated = ROW_COUNT;

    RETURN v_updated > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION complete_payment_attempt IS 'Marks a payment attempt as completed when webhook is verified';

-- 12. Create view for monitoring payment attempts
CREATE OR REPLACE VIEW payment_attempts_summary AS
SELECT
    pa.id,
    pa.tenant_id,
    t.name as tenant_name,
    pa.user_id,
    p.email as user_email,
    pa.status,
    pa.plan_id,
    pa.amount_cents,
    pa.currency,
    pa.checkout_session_id,
    pa.error_message,
    pa.created_at,
    pa.completed_at,
    pa.expires_at,
    EXTRACT(EPOCH FROM (NOW() - pa.created_at)) as age_seconds,
    CASE
        WHEN pa.status = 'completed' THEN
            EXTRACT(EPOCH FROM (pa.completed_at - pa.created_at))
        ELSE NULL
    END as completion_time_seconds
FROM payment_attempts pa
LEFT JOIN tenants t ON pa.tenant_id = t.id
LEFT JOIN auth.users u ON pa.user_id = u.id
LEFT JOIN profiles p ON pa.user_id = p.id
ORDER BY pa.created_at DESC;

COMMENT ON VIEW payment_attempts_summary IS 'Summary view of payment attempts with tenant and user information for monitoring';

-- 13. Grant permissions
GRANT SELECT ON payment_attempts_summary TO authenticated;

-- 14. Add helpful indexes for the view
CREATE INDEX IF NOT EXISTS idx_tenants_name ON tenants(name) WHERE name IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email) WHERE email IS NOT NULL;

-- 15. Update trial period to 14 days for existing records (optional - be careful!)
-- Uncomment if you want to update existing trial periods
-- UPDATE tenants
-- SET trial_ends_at = created_at + INTERVAL '14 days'
-- WHERE subscription_status = 'trial'
--   AND trial_ends_at = created_at + INTERVAL '7 days';

-- 16. Create function to check if payment is verified
CREATE OR REPLACE FUNCTION is_payment_verified(p_tenant_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM tenants
        WHERE id = p_tenant_id
          AND subscription_status IN ('active', 'trialing')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION is_payment_verified IS 'Checks if a tenant has verified payment (active or trialing status)';

-- 17. Create function to get payment attempt status
CREATE OR REPLACE FUNCTION get_payment_attempt_status(p_checkout_session_id TEXT)
RETURNS TEXT AS $$
DECLARE
    v_status TEXT;
BEGIN
    SELECT status INTO v_status
    FROM payment_attempts
    WHERE checkout_session_id = p_checkout_session_id
    ORDER BY created_at DESC
    LIMIT 1;

    RETURN COALESCE(v_status, 'not_found');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_payment_attempt_status IS 'Returns the current status of a payment attempt by checkout session ID';

-- 18. Final verification
DO $$
BEGIN
    -- Verify table was created
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payment_attempts') THEN
        RAISE NOTICE '✅ payment_attempts table created successfully';
    ELSE
        RAISE EXCEPTION '❌ Failed to create payment_attempts table';
    END IF;

    -- Verify indexes were created
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'payment_attempts' AND indexname = 'idx_payment_attempts_tenant_id') THEN
        RAISE NOTICE '✅ Indexes created successfully';
    ELSE
        RAISE WARNING '⚠️ Some indexes may not have been created';
    END IF;

    -- Verify RLS is enabled
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'payment_attempts' AND rowsecurity = true) THEN
        RAISE NOTICE '✅ Row Level Security enabled';
    ELSE
        RAISE WARNING '⚠️ Row Level Security may not be enabled';
    END IF;

    RAISE NOTICE '✅ Payment security migration completed successfully!';
END$$;
