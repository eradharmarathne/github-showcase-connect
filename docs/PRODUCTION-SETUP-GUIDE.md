# 🚀 Production Payment Flow Setup Guide

## ✅ COMPLETED STEPS

### 1. Database Migration Applied ✅
The secure payment migration has been successfully applied to production:

- ✅ **payment_attempts table** created with all columns
- ✅ **Indexes** created for performance (6 indexes)
- ✅ **RLS policies** enabled and configured
- ✅ **Helper functions** created:
  - `update_payment_attempts_updated_at()` - Auto-update timestamp
  - `cleanup_expired_payment_attempts()` - Cleanup expired attempts
  - `create_payment_attempt()` - Create new payment attempt
  - `complete_payment_attempt()` - Mark payment as completed

**Database Status**: 
- Table structure: 18 columns including metadata JSONB
- Constraints: CHECK status IN ('pending', 'completed', 'failed', 'expired', 'cancelled')
- Foreign keys: tenant_id → tenants(id), user_id → auth.users(id)
- Unique constraint: checkout_session_id

### 2. Edge Functions Deployed ✅
- ✅ **handle-creem-webhook** - ACTIVE (version 5)
- ✅ **create-creem-checkout** - ACTIVE (version 12)

### 3. Supabase Secrets Configured ✅ (Partial)
Current secrets in production:
```
✅ CREEM_API_KEY             - Configured
✅ SUPABASE_URL              - Configured
✅ SUPABASE_SERVICE_ROLE_KEY - Configured
✅ SUPABASE_ANON_KEY         - Configured
❌ SVIX_WEBHOOK_SECRET       - **MISSING - CRITICAL**
```

---

## 🚨 REQUIRED MANUAL STEPS

### Step 1: Add SVIX_WEBHOOK_SECRET to Supabase

**WHY**: Without this, webhook signature verification will fail and payments won't be processed securely.

**How to get the secret:**

1. Go to **Creem.io Dashboard** → **Developers** → **Webhooks**
2. Find your webhook endpoint (or create one if it doesn't exist)
3. Copy the **Signing Secret** (starts with `whsec_`)

**Add to Supabase:**

```bash
# In your terminal:
npx supabase secrets set SVIX_WEBHOOK_SECRET="whsec_your_secret_here" --linked
```

**OR via Dashboard:**
1. Go to Supabase Dashboard → Settings → Edge Functions
2. Click "Add Secret"
3. Name: `SVIX_WEBHOOK_SECRET`
4. Value: `whsec_your_secret_here`

---

### Step 2: Configure Creem Webhook Endpoint

**Webhook URL:**
```
https://takovelbhvoqnvfmnhaq.supabase.co/functions/v1/handle-creem-webhook
```

**Steps:**

1. Go to **Creem.io Dashboard** → **Developers** → **Webhooks**

2. Click **"Add Endpoint"** (or edit existing)

3. **Endpoint URL**: 
   ```
   https://takovelbhvoqnvfmnhaq.supabase.co/functions/v1/handle-creem-webhook
   ```

4. **Select Events** (check all):
   - ☑️ `checkout.session.completed` ← **CRITICAL**
   - ☑️ `subscription.created`
   - ☑️ `subscription.updated`
   - ☑️ `payment.succeeded`
   - ☑️ `payment.failed`

5. **Click "Add Endpoint"**

6. **Copy the Signing Secret** and add it to Supabase (Step 1)

---

### Step 3: Configure Success/Cancel URLs in Creem

In Creem Dashboard → **Settings** → **Checkout**:

**Success URL:**
```
https://your-production-domain.com/onboarding?payment_status=checking
```

**Cancel URL:**
```
https://your-production-domain.com/onboarding
```

Replace `your-production-domain.com` with your actual domain.

---

### Step 4: Verify Frontend Environment Variables

Check your production environment (Vercel/Netlify/etc.) has:

```env
VITE_CREEM_API_KEY=pk_live_xxxxx  # MUST be LIVE mode, same as backend
VITE_SUPABASE_URL=https://takovelbhvoqnvfmnhaq.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

**CRITICAL**: `VITE_CREEM_API_KEY` must be the **LIVE** mode key (starts with `pk_live_`), not test mode.

---

## 🧪 TESTING CHECKLIST

### Pre-Production Test (Required)

Before accepting real payments, test the flow:

#### 1. Test Webhook Signature Verification

```bash
# Send a test webhook (should be rejected with 401)
curl -X POST https://takovelbhvoqnvfmnhaq.supabase.co/functions/v1/handle-creem-webhook \
  -H "Content-Type: application/json" \
  -d '{"type":"test","data":{}}'

# Expected response: 401 Unauthorized (signature verification failed)
# This confirms Svix verification is working
```

#### 2. Send Test Webhook from Creem Dashboard

1. Go to Creem Dashboard → Developers → Webhooks
2. Click on your endpoint
3. Click **"Send Test Webhook"**
4. Select event: `checkout.session.completed`
5. Click **Send**

**Expected**:
- ✅ Status: 200 OK
- ✅ Creem shows "Delivered successfully"

**Check Edge Function Logs:**
```bash
npx supabase functions logs handle-creem-webhook --linked
```

Should see:
```
✅ Webhook signature verified successfully
📋 Processing webhook event: checkout.session.completed
```

#### 3. Database Verification

Run these queries in Supabase SQL Editor:

```sql
-- 1. Verify payment_attempts table structure
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'payment_attempts'
ORDER BY ordinal_position;

-- 2. Check if table is empty (should be 0 rows initially)
SELECT COUNT(*) FROM payment_attempts;

-- 3. Verify RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'payment_attempts';
```

#### 4. End-to-End Payment Test

⚠️ **WARNING**: This will charge a real payment. Use smallest amount possible.

**Option A: Use Creem Test Mode (if available)**
1. Switch Creem to test mode
2. Use test card: `4242 4242 4242 4242`
3. Complete payment
4. Verify webhook processes correctly

**Option B: Real Payment Test**
1. Create test account in onboarding
2. Select lowest plan
3. Complete real payment
4. **Immediately refund** via Creem dashboard

**What to verify:**
1. ✅ Onboarding page opens checkout in new tab
2. ✅ Page shows "Waiting for payment verification..."
3. ✅ After payment, webhook processes within 5 seconds
4. ✅ Page shows "Payment Verified!" 
5. ✅ Redirects to dashboard
6. ✅ Database checks:

```sql
-- Should show 'active' status
SELECT id, subscription_status FROM tenants 
WHERE subscription_status = 'active' 
ORDER BY created_at DESC LIMIT 1;

-- Should show 'completed' payment
SELECT tenant_id, status, completed_at 
FROM payment_attempts 
WHERE status = 'completed'
ORDER BY created_at DESC LIMIT 1;
```

---

## 📊 MONITORING & ALERTS

### Check Payment Flow Health

Run these queries regularly:

```sql
-- Payment attempts summary (last 24 hours)
SELECT 
  status,
  COUNT(*) as count,
  AVG(EXTRACT(EPOCH FROM (completed_at - created_at))) as avg_completion_seconds
FROM payment_attempts
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY status;

-- Failed/Expired payments (need attention)
SELECT 
  tenant_id,
  status,
  error_message,
  created_at,
  expires_at
FROM payment_attempts
WHERE status IN ('failed', 'expired')
  AND created_at > NOW() - INTERVAL '7 days'
ORDER BY created_at DESC;

-- Pending payments older than 15 minutes (stuck)
SELECT 
  tenant_id,
  checkout_session_id,
  created_at,
  expires_at,
  EXTRACT(EPOCH FROM (NOW() - created_at))/60 as minutes_pending
FROM payment_attempts
WHERE status = 'pending'
  AND created_at < NOW() - INTERVAL '15 minutes';
```

### Monitor Edge Function Logs

```bash
# Watch logs in real-time
npx supabase functions logs handle-creem-webhook --linked --follow

# Check for errors (last 100 entries)
npx supabase functions logs handle-creem-webhook --linked | grep -i error
```

### Set Up Alerts (Recommended)

Use your monitoring tool (Sentry, LogRocket, etc.) to alert on:
- Webhook signature verification failure rate > 1%
- Payment timeout rate > 5%
- Webhook processing errors
- Pending payments stuck > 15 minutes

---

## 🔐 SECURITY VERIFICATION

### Final Security Checklist

- [ ] ✅ `SVIX_WEBHOOK_SECRET` is set in Supabase secrets
- [ ] ✅ Webhook URL uses HTTPS (not HTTP)
- [ ] ✅ Creem webhook events include `checkout.session.completed`
- [ ] ✅ Frontend uses LIVE mode API key (`pk_live_`)
- [ ] ✅ Test webhook returns 401 without valid signature
- [ ] ✅ RLS policies enabled on `payment_attempts` table
- [ ] ✅ Service role can update payment_attempts (for webhooks)
- [ ] ✅ Users can only view their own payment attempts
- [ ] ✅ Tenants start with `pending_payment` status (not active)
- [ ] ✅ Payment opens in NEW TAB (not same window)

---

## 🐛 TROUBLESHOOTING

### Issue: Webhook Signature Verification Fails

**Symptoms**: 
- Edge Function logs: `❌ Webhook signature verification failed`
- HTTP 401 responses from webhook endpoint

**Solutions**:
1. ✅ Verify `SVIX_WEBHOOK_SECRET` is set correctly in Supabase
2. ✅ Copy secret from Creem dashboard (should start with `whsec_`)
3. ✅ Redeploy edge function:
   ```bash
   npx supabase functions deploy handle-creem-webhook --linked
   ```
4. ✅ Check Creem webhook URL matches exactly

---

### Issue: Payment Succeeds but Tenant Not Updated

**Symptoms**:
- User paid but tenant stays `pending_payment`
- Webhook arrives but nothing updates

**Solutions**:
1. Check webhook metadata includes `tenant_id`:
   ```bash
   npx supabase functions logs handle-creem-webhook --linked
   ```
   Look for: `✅ Metadata validated: { tenant_id: '...', user_id: '...' }`

2. Verify webhook has permission to update:
   ```sql
   -- Check RLS policies
   SELECT * FROM pg_policies WHERE tablename = 'payment_attempts';
   ```

3. Check if tenant_id matches:
   ```sql
   SELECT id, subscription_status FROM tenants WHERE id = 'tenant_id_from_webhook';
   ```

---

### Issue: Payment Times Out

**Symptoms**:
- Onboarding shows "Waiting..." forever
- No webhook received

**Solutions**:
1. ✅ Check Creem webhook delivery logs (Dashboard → Webhooks)
2. ✅ Verify endpoint URL is accessible
3. ✅ Test manually:
   ```bash
   curl -X POST https://takovelbhvoqnvfmnhaq.supabase.co/functions/v1/handle-creem-webhook \
     -H "Content-Type: application/json" \
     -d '{"test":true}'
   ```
4. ✅ Check if webhook is active in Creem dashboard

---

## 📋 QUICK REFERENCE

### Important URLs

| Purpose | URL |
|---------|-----|
| **Webhook Endpoint** | `https://takovelbhvoqnvfmnhaq.supabase.co/functions/v1/handle-creem-webhook` |
| **Checkout Proxy** | `https://takovelbhvoqnvfmnhaq.supabase.co/functions/v1/create-creem-checkout` |
| **Supabase Dashboard** | https://supabase.com/dashboard/project/takovelbhvoqnvfmnhaq |
| **Creem Dashboard** | https://creem.io/dashboard |

### Environment Variables Summary

| Variable | Location | Value Format | Status |
|----------|----------|--------------|--------|
| `CREEM_API_KEY` | Supabase Secrets | `pk_live_xxxxx` | ✅ Set |
| `SVIX_WEBHOOK_SECRET` | Supabase Secrets | `whsec_xxxxx` | ❌ **MISSING** |
| `VITE_CREEM_API_KEY` | Frontend Env | `pk_live_xxxxx` | ⚠️ Check |
| `VITE_SUPABASE_URL` | Frontend Env | `https://...supabase.co` | ⚠️ Check |
| `VITE_SUPABASE_ANON_KEY` | Frontend Env | `eyJ...` | ⚠️ Check |

### Key Database Objects

| Object | Type | Purpose |
|--------|------|---------|
| `payment_attempts` | Table | Track payment verification |
| `subscription_status` | Enum | Payment states (trial, active, pending_payment, etc.) |
| `create_payment_attempt()` | Function | Create new payment record |
| `complete_payment_attempt()` | Function | Mark payment verified |
| `cleanup_expired_payment_attempts()` | Function | Expire old pending payments |

---

## ✅ COMPLETION CHECKLIST

Before going live with payments:

- [ ] ✅ Database migration verified (payment_attempts table exists)
- [ ] ❌ **Add `SVIX_WEBHOOK_SECRET` to Supabase** (CRITICAL)
- [ ] ❌ **Configure webhook endpoint in Creem.io** (CRITICAL)
- [ ] ❌ Set success/cancel URLs in Creem
- [ ] ❌ Verify frontend environment variables
- [ ] ❌ Test webhook signature verification (should reject invalid)
- [ ] ❌ Test webhook from Creem dashboard (should succeed)
- [ ] ❌ End-to-end payment test (small amount)
- [ ] ❌ Verify tenant status updates correctly
- [ ] ❌ Verify payment_attempts records created
- [ ] ❌ Set up monitoring/alerts
- [ ] ❌ Document for team

---

## 🎉 NEXT STEPS

1. **IMMEDIATELY**: Add `SVIX_WEBHOOK_SECRET` to Supabase (Step 1)
2. **THEN**: Configure Creem webhook endpoint (Step 2)
3. **TEST**: Run test webhook from Creem dashboard
4. **VERIFY**: Check Edge Function logs show success
5. **MONITOR**: Set up alerts for payment failures

---

## 📞 SUPPORT

**If you encounter issues:**

1. Check Edge Function logs:
   ```bash
   npx supabase functions logs handle-creem-webhook --linked
   ```

2. Check Creem webhook delivery logs (Dashboard → Webhooks)

3. Verify database state:
   ```sql
   SELECT * FROM payment_attempts ORDER BY created_at DESC LIMIT 5;
   ```

4. Review this guide's troubleshooting section

---

**Database Migration**: ✅ COMPLETE  
**Webhook Handler**: ✅ DEPLOYED  
**Svix Secret**: ❌ **NEEDS TO BE ADDED**  
**Creem Configuration**: ❌ **NEEDS TO BE DONE**

**Status**: 🟡 **60% COMPLETE - MANUAL STEPS REQUIRED**
