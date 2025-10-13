# 🔐 Secure Payment Flow Implementation Plan

## 🚨 Critical Security Issue

### Current Vulnerability:
The onboarding payment flow has a **critical security flaw** where users receive pro access BEFORE payment verification:

```typescript
// CURRENT (INSECURE):
User clicks "Pay Now"
  → completeOnboarding() creates tenant with trial
  → User gets 7-day trial + full access
  → THEN redirects to Creem.io
  → Payment might fail, but user already has access! 🚨
```

**Impact:**
- Users can bypass payment and get free pro access
- No verification that payment actually succeeded
- Potential revenue loss and abuse

---

## ✅ Proposed Secure Flow

### Architecture Diagram:

```
┌─────────────────────────────────────────────────────────────────┐
│ PHASE 1: Pre-Payment (User in Onboarding)                      │
└─────────────────────────────────────────────────────────────────┘
User fills form → Clicks "Pay Now"
         ↓
Create "pending_payment" tenant
  - status: "pending_payment"
  - NO trial granted
  - NO pro access
         ↓
Generate Creem checkout with metadata:
  - tenant_id: "abc123"
  - user_id: "user_xyz"
  - plan_id: "pro"
         ↓
Open Creem.io in NEW TAB (window.open)
  - User stays on onboarding page
  - Shows "Waiting for payment..." UI
         ↓

┌─────────────────────────────────────────────────────────────────┐
│ PHASE 2: Payment Processing (User on Creem.io)                 │
└─────────────────────────────────────────────────────────────────┘
User enters card details on Creem.io
         ↓
Creem processes payment
         ↓
         ├─ SUCCESS ────────────┐
         │                      ↓
         │               Creem sends SIGNED webhook
         │               to /handle-creem-webhook
         │                      ↓
         │               Edge Function verifies Svix signature
         │                      ↓
         │               IF VALID: Update tenant status
         │                 - status: "active" (or "trialing")
         │                 - Grant pro access
         │                 - Update subscription
         │                      ↓
         │               Creem redirects to success_url
         │                      ↓
         └──────────────> User returns to app

┌─────────────────────────────────────────────────────────────────┐
│ PHASE 3: Post-Payment (User back on Onboarding)                │
└─────────────────────────────────────────────────────────────────┘
Onboarding page polls database every 3s
         ↓
Checks if tenant.status changed from "pending_payment"
         ↓
         ├─ VERIFIED ────> Show success! Redirect to dashboard
         │
         ├─ TIMEOUT (10min) ────> Show error, payment failed
         │
         └─ STILL PENDING ────> Keep polling...
```

---

## 📋 Implementation Checklist

### 1️⃣ Add Svix Webhook Verification

**File:** `supabase/functions/handle-creem-webhook/index.ts`

**Changes:**
```typescript
import { Webhook } from "https://esm.sh/svix@1.15.0"

// Get webhook secret from env
const SVIX_WEBHOOK_SECRET = Deno.env.get('SVIX_WEBHOOK_SECRET')

// Verify signature
const wh = new Webhook(SVIX_WEBHOOK_SECRET)
const payload = await req.text()
const headers = {
  'svix-id': req.headers.get('svix-id'),
  'svix-timestamp': req.headers.get('svix-timestamp'),
  'svix-signature': req.headers.get('svix-signature'),
}

try {
  const verifiedPayload = wh.verify(payload, headers)
  // Process verified webhook...
} catch (err) {
  console.error('Webhook verification failed:', err)
  return new Response('Invalid signature', { status: 401 })
}
```

**Why:** Prevents attackers from faking webhooks to activate subscriptions

---

### 2️⃣ Update Onboarding Payment Flow

**File:** `src/pages/onboarding.tsx`

**Current (INSECURE):**
```typescript
const handlePayNow = async () => {
  // ❌ BAD: Creates tenant BEFORE payment
  await completeOnboarding()

  // ❌ BAD: Same tab redirect
  window.location.href = checkoutSession.checkoutUrl
}
```

**New (SECURE):**
```typescript
const handlePayNow = async () => {
  // ✅ GOOD: Create "pending_payment" tenant
  const tenant = await createPendingTenant()

  // ✅ GOOD: Open Creem in NEW TAB
  window.open(checkoutSession.checkoutUrl, '_blank')

  // ✅ GOOD: Start polling for payment verification
  setPaymentStatus('waiting')
  startPaymentPolling(tenant.id)
}

// Poll database every 3 seconds
const startPaymentPolling = (tenantId) => {
  const interval = setInterval(async () => {
    const tenant = await fetchTenantStatus(tenantId)

    if (tenant.status === 'active' || tenant.status === 'trialing') {
      // ✅ Verified by webhook!
      clearInterval(interval)
      setPaymentStatus('verified')
      navigate('/dashboard')
    } else if (Date.now() - startTime > 10 * 60 * 1000) {
      // ❌ Timeout after 10 minutes
      clearInterval(interval)
      setPaymentStatus('failed')
    }
  }, 3000)
}
```

---

### 3️⃣ Create Payment Status Hook

**New File:** `src/hooks/use-payment-status.tsx`

```typescript
export const usePaymentStatus = (tenantId: string) => {
  const [status, setStatus] = useState<'pending' | 'verified' | 'failed'>('pending')

  useEffect(() => {
    const interval = setInterval(async () => {
      const { data } = await supabase
        .from('tenants')
        .select('subscription_status')
        .eq('id', tenantId)
        .single()

      if (data?.subscription_status === 'active' || data?.subscription_status === 'trialing') {
        setStatus('verified')
        clearInterval(interval)
      }
    }, 3000) // Poll every 3 seconds

    // Timeout after 10 minutes
    setTimeout(() => {
      setStatus('failed')
      clearInterval(interval)
    }, 10 * 60 * 1000)

    return () => clearInterval(interval)
  }, [tenantId])

  return { status, isPending: status === 'pending', isVerified: status === 'verified' }
}
```

---

### 4️⃣ Database Migration

**Add new subscription statuses:**

```sql
-- Add new statuses
ALTER TYPE subscription_status ADD VALUE IF NOT EXISTS 'pending_payment';
ALTER TYPE subscription_status ADD VALUE IF NOT EXISTS 'payment_failed';

-- Create payment tracking table
CREATE TABLE payment_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  checkout_session_id TEXT UNIQUE,
  creem_order_id TEXT,
  status TEXT NOT NULL CHECK (status IN ('pending', 'completed', 'failed', 'expired')),
  amount_cents INTEGER,
  currency TEXT DEFAULT 'USD',
  plan_id TEXT,
  metadata JSONB DEFAULT '{}',
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '10 minutes'
);

-- Indexes for fast lookups
CREATE INDEX idx_payment_attempts_tenant_id ON payment_attempts(tenant_id);
CREATE INDEX idx_payment_attempts_checkout_session_id ON payment_attempts(checkout_session_id);
CREATE INDEX idx_payment_attempts_status ON payment_attempts(status);
CREATE INDEX idx_payment_attempts_expires_at ON payment_attempts(expires_at) WHERE status = 'pending';

-- RLS policies
ALTER TABLE payment_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own payment attempts"
  ON payment_attempts FOR SELECT
  USING (auth.uid() = user_id);

-- Cleanup expired payment attempts (run via cron)
CREATE OR REPLACE FUNCTION cleanup_expired_payment_attempts()
RETURNS void AS $$
BEGIN
  UPDATE payment_attempts
  SET status = 'expired',
      error_message = 'Payment attempt timed out'
  WHERE status = 'pending'
    AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

### 5️⃣ Update Billing Success Page

**File:** `src/pages/billing-success.tsx`

**Current (INSECURE):**
```typescript
// ❌ BAD: Direct database update from URL params
const { error } = await supabase
  .from('subscriptions')
  .update({ status: 'active' })  // Anyone can fake this!
```

**New (SECURE):**
```typescript
// ✅ GOOD: Only show UI, let webhook handle updates
const [verificationStatus, setVerificationStatus] = useState('checking')

useEffect(() => {
  // Poll database to check if webhook processed
  const checkWebhookProcessed = async () => {
    const { data } = await supabase
      .from('payment_attempts')
      .select('status')
      .eq('checkout_session_id', sessionId)
      .single()

    if (data?.status === 'completed') {
      setVerificationStatus('verified')
    } else if (timeout) {
      setVerificationStatus('failed')
    }
  }

  const interval = setInterval(checkWebhookProcessed, 2000)
  return () => clearInterval(interval)
}, [sessionId])

// Show loading spinner until webhook processes
if (verificationStatus === 'checking') {
  return <div>Verifying payment... Please wait.</div>
}
```

---

### 6️⃣ Update Creem Lib

**File:** `src/lib/creem.ts`

**Add metadata structure:**
```typescript
export const createCheckoutSession = async (params: {
  product_id: string
  success_url: string
  metadata: {
    tenant_id: string      // REQUIRED for webhook verification
    user_id: string        // REQUIRED
    plan_id: string        // REQUIRED
    source: 'onboarding' | 'billing'  // REQUIRED
    timestamp: string      // REQUIRED for replay attack prevention
  }
  customer: {
    email: string
  }
}) => {
  // Add timestamp to prevent replay attacks
  params.metadata.timestamp = new Date().toISOString()

  // Create checkout session via Edge Function
  const { data, error } = await supabase.functions.invoke('create-creem-checkout', {
    body: params
  })

  return data
}
```

---

### 7️⃣ Update Webhook Handler

**File:** `supabase/functions/handle-creem-webhook/index.ts`

**Complete secure implementation:**

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { Webhook } from "https://esm.sh/svix@1.15.0"

serve(async (req) => {
  try {
    // 1. Verify Svix signature
    const SVIX_SECRET = Deno.env.get('SVIX_WEBHOOK_SECRET')
    const wh = new Webhook(SVIX_SECRET)

    const payload = await req.text()
    const headers = {
      'svix-id': req.headers.get('svix-id') || '',
      'svix-timestamp': req.headers.get('svix-timestamp') || '',
      'svix-signature': req.headers.get('svix-signature') || '',
    }

    let event
    try {
      event = wh.verify(payload, headers)
    } catch (err) {
      console.error('❌ Webhook signature verification failed:', err)
      return new Response('Invalid signature', { status: 401 })
    }

    console.log('✅ Webhook signature verified:', event.type)

    // 2. Process verified webhook
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    if (event.type === 'checkout.session.completed') {
      const { metadata, customer_id, subscription_id, id: checkout_id } = event.data

      // 3. Validate metadata
      if (!metadata?.tenant_id || !metadata?.user_id) {
        console.error('❌ Missing required metadata:', metadata)
        return new Response('Invalid metadata', { status: 400 })
      }

      // 4. Update payment attempt
      await supabase
        .from('payment_attempts')
        .update({
          status: 'completed',
          creem_order_id: checkout_id,
          completed_at: new Date().toISOString()
        })
        .eq('checkout_session_id', checkout_id)

      // 5. Update tenant status
      const { error: tenantError } = await supabase
        .from('tenants')
        .update({
          subscription_status: 'active',
          trial_ends_at: null,
        })
        .eq('id', metadata.tenant_id)
        .eq('subscription_status', 'pending_payment') // Ensure it was pending

      if (tenantError) {
        console.error('❌ Failed to update tenant:', tenantError)
        throw tenantError
      }

      // 6. Update subscription
      await supabase
        .from('subscriptions')
        .update({
          status: 'active',
          creem_customer_id: customer_id,
          creem_subscription_id: subscription_id,
        })
        .eq('tenant_id', metadata.tenant_id)

      console.log('✅ Successfully processed payment for tenant:', metadata.tenant_id)
    }

    return new Response(JSON.stringify({ received: true }), { status: 200 })

  } catch (error) {
    console.error('❌ Webhook processing error:', error)
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }
})
```

---

## 🔐 Security Benefits

| Feature | Before (Insecure) | After (Secure) |
|---------|------------------|----------------|
| **Payment Verification** | ❌ None | ✅ Svix signature verification |
| **Pro Access Timing** | ❌ Before payment | ✅ After verification |
| **Webhook Security** | ❌ Anyone can fake | ✅ Cryptographically signed |
| **Database Updates** | ❌ From URL params | ✅ From verified webhook only |
| **Payment Window** | ❌ Same tab (user leaves) | ✅ New tab (user stays) |
| **Status Tracking** | ❌ None | ✅ payment_attempts table |
| **Timeout Handling** | ❌ None | ✅ 10-minute expiry |
| **Audit Trail** | ❌ None | ✅ Full payment history |

---

## 🧪 Testing Checklist

- [ ] **Happy Path:** User pays → Webhook verified → Pro access granted
- [ ] **Failed Payment:** User cancels → No pro access
- [ ] **Invalid Webhook:** Fake webhook rejected (wrong signature)
- [ ] **Timeout:** Payment takes >10min → Shows error
- [ ] **Duplicate Webhook:** Same webhook sent twice → Idempotent
- [ ] **Wrong Tenant:** Webhook metadata.tenant_id mismatch → Rejected
- [ ] **Concurrent Payments:** Two payments for same tenant → Handled
- [ ] **Expired Payment:** Old pending_payment cleaned up
- [ ] **Browser Close:** User closes tab during payment → Can resume
- [ ] **Network Failure:** Webhook fails to arrive → Retry logic

---

## 📦 Environment Variables

Add to Supabase Edge Function:

```bash
# Get this from Creem.io dashboard → Webhooks → Signing Secret
SVIX_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxx

# Already configured
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
CREEM_API_KEY=your-creem-api-key
```

---

## 🚀 Deployment Steps

### Phase 1: Add Webhook Security (Non-Breaking)
1. Add Svix verification to webhook handler
2. Test with Creem webhook test tool
3. Deploy to production

### Phase 2: Database Changes
1. Run migration to add `pending_payment` status
2. Create `payment_attempts` table
3. Add RLS policies

### Phase 3: Update Frontend
1. Update onboarding payment flow
2. Add payment status polling
3. Update success page to use polling

### Phase 4: Testing
1. Test in development with Creem test mode
2. Test all failure scenarios
3. Load test with multiple concurrent payments

### Phase 5: Production Rollout
1. Deploy with feature flag
2. Monitor webhook logs
3. Enable for all users
4. Set up alerts for failed payments

---

## 📊 Monitoring

**Key Metrics to Track:**
- Webhook signature verification success/failure rate
- Payment completion time (webhook arrival latency)
- Percentage of payments timing out
- Failed payment reasons
- Payment attempt status distribution

**Alerts to Set Up:**
- Webhook signature verification failure rate >1%
- Payment timeout rate >5%
- Webhook processing error rate >1%
- Payment attempts stuck in "pending" for >15 minutes

---

## 🔗 References

- [Svix Webhook Documentation](https://docs.svix.com/)
- [Creem.io Webhook Events](https://docs.creem.io/webhooks)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Webhook Security Best Practices](https://webhook.site/best-practices)

---

## ✅ Completion Criteria

Implementation is complete when:
- ✅ All webhook signatures are verified
- ✅ Zero pro access granted without payment verification
- ✅ Payment opens in new tab
- ✅ Database polling implemented
- ✅ Timeout handling works
- ✅ All tests pass
- ✅ Monitoring dashboards set up
- ✅ Documentation updated
