# 🔧 Creem.io & Svix Setup Checklist

## 📋 Overview

This guide provides step-by-step instructions to manually configure Creem.io payment gateway and Svix webhook verification for secure payment processing.

---

## 1️⃣ Creem.io Setup

### A. Create Creem.io Account

1. Go to [creem.io](https://creem.io)
2. Click "Sign Up" or "Get Started"
3. Complete registration with:
   - Business email
   - Company name
   - Tax information
4. Verify email address

### B. Get API Keys

1. Log in to Creem.io dashboard
2. Navigate to **Settings** → **API Keys**
3. Copy the following keys:
   - ✅ **Test Mode API Key** (for development): `pk_test_xxxxx`
   - ✅ **Live Mode API Key** (for production): `pk_live_xxxxx`
4. Store keys securely (we'll add them to Supabase later)

### C. Create Product/Plan

1. In Creem dashboard, go to **Products**
2. Click **"Create Product"**
3. Fill in product details:
   ```
   Name: Professional Plan
   Description: Full access to all features
   Type: Recurring
   Billing Period: Monthly
   Price: $29.00 USD (or your pricing)
   ```
4. Click **Save**
5. ✅ **Copy the Product ID**: `prod_xxxxxxxxxxxxx`
6. Add Product ID to your `plans` table in Supabase:
   ```sql
   UPDATE plans
   SET product_id = 'prod_xxxxxxxxxxxxx'
   WHERE name = 'Professional';
   ```

### D. Configure Webhook Endpoint

1. In Creem dashboard, go to **Developers** → **Webhooks**
2. Click **"Add Endpoint"**
3. Enter webhook URL:
   ```
   https://[YOUR-PROJECT].supabase.co/functions/v1/handle-creem-webhook
   ```
   Replace `[YOUR-PROJECT]` with your actual Supabase project ID

4. Select events to listen for:
   - ☑️ `checkout.session.completed`
   - ☑️ `subscription.created`
   - ☑️ `subscription.updated`
   - ☑️ `payment.succeeded`
   - ☑️ `payment.failed`

5. Click **"Add Endpoint"**
6. ✅ **Copy the Webhook Signing Secret**: `whsec_xxxxxxxxxxxxx`

### E. Configure Success/Cancel URLs

In your Creem dashboard → **Settings** → **Checkout**:

1. **Success URL** (where users return after payment):
   ```
   https://your-domain.com/onboarding?payment_status=checking
   ```

2. **Cancel URL** (where users return if they cancel):
   ```
   https://your-domain.com/onboarding
   ```

3. Click **Save**

### F. Test Mode Setup

1. In Creem dashboard, toggle to **"Test Mode"** (top right)
2. Use test card numbers for testing:
   ```
   Success: 4242 4242 4242 4242
   Decline: 4000 0000 0000 0002
   Expired: 4000 0000 0000 0069
   ```
3. Any future date for expiry
4. Any 3-digit CVV
5. Any ZIP code

---

## 2️⃣ Svix Setup

### A. What is Svix?

Svix is a webhook verification service that ensures webhooks are genuine and haven't been tampered with. Creem uses Svix to sign all webhooks.

### B. Get Webhook Signing Secret

**Option 1: From Creem Dashboard (Recommended)**

1. In Creem dashboard → **Developers** → **Webhooks**
2. Click on your webhook endpoint
3. Find **"Signing Secret"** section
4. ✅ **Copy the secret**: `whsec_xxxxxxxxxxxxx`
5. This is your `SVIX_WEBHOOK_SECRET`

**Option 2: From Svix Dashboard (Alternative)**

If Creem provides a separate Svix dashboard link:

1. Go to [Svix Dashboard](https://dashboard.svix.com)
2. Log in with Creem credentials
3. Navigate to **Endpoints**
4. Select your webhook endpoint
5. Copy the signing secret

### C. No Additional Svix Account Needed

✅ **Good News**: You don't need a separate Svix account! Creem handles Svix integration automatically. You just need the webhook signing secret from Creem's dashboard.

---

## 3️⃣ Supabase Configuration

### A. Add Environment Variables

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Navigate to **Settings** → **Edge Functions** → **Secrets**
4. Add the following secrets:

#### For Development (Test Mode):

```bash
CREEM_API_KEY=pk_test_xxxxxxxxxxxxx
SVIX_WEBHOOK_SECRET=whsec_test_xxxxxxxxxxxxx
```

#### For Production (Live Mode):

```bash
CREEM_API_KEY=pk_live_xxxxxxxxxxxxx
SVIX_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
```

5. Click **"Add secret"** for each

### B. Deploy Edge Functions

Run this command in your terminal:

```bash
# Deploy the webhook handler
supabase functions deploy handle-creem-webhook

# Verify deployment
supabase functions list
```

### C. Test Webhook Endpoint

1. Get your Edge Function URL:
   ```
   https://[PROJECT-ID].supabase.co/functions/v1/handle-creem-webhook
   ```

2. Test with curl:
   ```bash
   curl -X POST \
     https://[PROJECT-ID].supabase.co/functions/v1/handle-creem-webhook \
     -H "Content-Type: application/json" \
     -H "svix-id: msg_test" \
     -H "svix-timestamp: 1234567890" \
     -H "svix-signature: v1,test" \
     -d '{"type":"checkout.session.completed","data":{}}'
   ```

3. Expected response:
   - ✅ **401 Unauthorized** (signature verification failed - this is correct!)
   - ❌ **500 Error** means configuration issue

---

## 4️⃣ Frontend Configuration

### A. Add Environment Variables

In your `.env.local` file:

```env
# Creem.io API Key (Public - safe to expose in frontend)
VITE_CREEM_API_KEY=pk_test_xxxxxxxxxxxxx

# Supabase (already configured)
VITE_SUPABASE_URL=https://[PROJECT-ID].supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
```

### B. Update Product IDs in Database

Run this SQL in Supabase SQL Editor:

```sql
-- Update your plans with Creem Product IDs
UPDATE plans SET product_id = 'prod_xxxxxxxxxxxxx' WHERE id = 'professional';
UPDATE plans SET product_id = 'prod_yyyyyyyyyyyyy' WHERE id = 'starter';
UPDATE plans SET product_id = 'prod_zzzzzzzzzzzzz' WHERE id = 'enterprise';
```

---

## 5️⃣ Testing Checklist

### A. Test Webhook Verification

1. In Creem dashboard → **Developers** → **Webhooks**
2. Click on your endpoint
3. Click **"Send test webhook"**
4. Select `checkout.session.completed` event
5. Click **Send**
6. Check Edge Function logs:
   ```bash
   supabase functions logs handle-creem-webhook
   ```
7. ✅ Should see: `✅ Webhook signature verified successfully`

### B. Test Payment Flow (Test Mode)

1. Start your local development server:
   ```bash
   bun dev
   ```

2. Go to onboarding page
3. Fill in company info
4. Select "Pay Now"
5. Use test card: `4242 4242 4242 4242`
6. Complete payment
7. ✅ Should see:
   - Payment window opens in new tab
   - Onboarding page shows "Waiting for payment..."
   - After ~3 seconds, shows "Payment Verified!"
   - Redirects to dashboard

### C. Check Database Updates

After successful test payment, verify in Supabase:

```sql
-- Check tenant status
SELECT id, name, subscription_status, onboarding_completed
FROM tenants
WHERE subscription_status = 'active';

-- Check subscription
SELECT tenant_id, status, creem_customer_id, creem_subscription_id
FROM subscriptions
WHERE status = 'active';

-- Check payment attempt (if table exists)
SELECT tenant_id, status, completed_at
FROM payment_attempts
WHERE status = 'completed';
```

---

## 6️⃣ Production Deployment

### A. Switch to Live Mode

1. In Creem dashboard, toggle from "Test Mode" to **"Live Mode"**
2. Get live API key and webhook secret
3. Update Supabase secrets:
   ```bash
   CREEM_API_KEY=pk_live_xxxxxxxxxxxxx
   SVIX_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
   ```

### B. Update Product IDs

Get live product IDs from Creem and update database:

```sql
UPDATE plans
SET product_id = 'prod_live_xxxxxxxxxxxxx'
WHERE id = 'professional';
```

### C. Test Live Payment

1. Use real credit card (will charge actual money!)
2. Complete payment flow
3. Verify in Creem dashboard → **Payments**
4. Check webhook logs for successful verification

### D. Set Up Monitoring

1. **Creem Dashboard**:
   - Monitor **Payments** tab
   - Check **Webhooks** for delivery status
   - Set up email alerts for failed payments

2. **Supabase Logs**:
   ```bash
   # Monitor Edge Function logs
   supabase functions logs handle-creem-webhook --follow
   ```

3. **Set Up Alerts** (Optional):
   - Use tools like Sentry or LogRocket
   - Monitor webhook verification failures
   - Track payment timeouts

---

## 7️⃣ Troubleshooting

### Problem: Webhook Signature Verification Fails

**Symptoms:**
- Edge Function logs show: `❌ Webhook signature verification failed`
- HTTP 401 Unauthorized

**Solutions:**
1. ✅ Verify `SVIX_WEBHOOK_SECRET` is correct
2. ✅ Check webhook URL in Creem matches exactly
3. ✅ Ensure headers are correct: `svix-id`, `svix-timestamp`, `svix-signature`
4. ✅ Redeploy Edge Function: `supabase functions deploy handle-creem-webhook`

### Problem: Payment Verification Times Out

**Symptoms:**
- Onboarding page shows "Waiting..." forever
- Webhook never arrives

**Solutions:**
1. ✅ Check webhook endpoint in Creem dashboard
2. ✅ Verify Edge Function is deployed and accessible
3. ✅ Check Creem webhook logs for delivery failures
4. ✅ Test webhook manually from Creem dashboard

### Problem: Tenant Status Not Updating

**Symptoms:**
- Webhook arrives but tenant stays as `pending_payment`

**Solutions:**
1. ✅ Check webhook payload contains `metadata.tenant_id`
2. ✅ Verify Edge Function logs for database errors
3. ✅ Check RLS policies allow Service Role to update tenants
4. ✅ Manually check webhook data structure in Creem docs

### Problem: Payment Succeeds but User Gets Access Before Webhook

**Symptoms:**
- User sees dashboard before webhook processes

**Solutions:**
1. ✅ **This is the old insecure flow!** Verify you're using the new secure flow
2. ✅ Check `createPendingPaymentTenant` creates status as `pending_payment`
3. ✅ Ensure `SmartRedirect` blocks access when status is `pending_payment`

---

## 8️⃣ Security Checklist

Before going live, verify:

- [x] ✅ Webhook signature verification is ENABLED
- [x] ✅ All API keys are stored in Supabase secrets (not in code)
- [x] ✅ Payment status starts as `pending_payment`
- [x] ✅ Pro access granted ONLY after webhook verification
- [x] ✅ Metadata includes `tenant_id` and `user_id`
- [x] ✅ Edge Function checks metadata before updating database
- [x] ✅ RLS policies protect tenant data
- [x] ✅ Webhook endpoint uses HTTPS
- [x] ✅ Test mode disabled in production
- [x] ✅ Monitoring and alerts configured

---

## 9️⃣ Quick Reference

### Environment Variables Summary

| Variable | Location | Value | Required |
|----------|----------|-------|----------|
| `CREEM_API_KEY` | Supabase Edge Functions | `pk_test_xxx` or `pk_live_xxx` | ✅ Yes |
| `SVIX_WEBHOOK_SECRET` | Supabase Edge Functions | `whsec_xxx` | ✅ Yes |
| `VITE_CREEM_API_KEY` | Frontend `.env.local` | `pk_test_xxx` or `pk_live_xxx` | ✅ Yes |

### URLs Summary

| Purpose | URL | Example |
|---------|-----|---------|
| Webhook Endpoint | Edge Function | `https://[project].supabase.co/functions/v1/handle-creem-webhook` |
| Success URL | Your app | `https://your-domain.com/onboarding?payment_status=checking` |
| Cancel URL | Your app | `https://your-domain.com/onboarding` |

### Test Cards

| Scenario | Card Number | Result |
|----------|-------------|--------|
| Success | `4242 4242 4242 4242` | ✅ Payment succeeds |
| Decline | `4000 0000 0000 0002` | ❌ Card declined |
| Expired | `4000 0000 0000 0069` | ❌ Expired card |

---

## 🎉 You're All Set!

Once you complete all steps above:

1. ✅ Creem.io is configured for payments
2. ✅ Svix webhook verification is active
3. ✅ Supabase Edge Functions are deployed
4. ✅ Frontend is configured
5. ✅ Secure payment flow is operational

**Next Steps:**
- Test payment flow in development
- Monitor webhook logs
- Deploy to production when ready
- Set up monitoring and alerts

---

## 📚 Additional Resources

- [Creem.io Documentation](https://docs.creem.io)
- [Svix Documentation](https://docs.svix.com)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Payment Flow Diagram](./PAYMENT-PLAN.md)

---

## 💬 Support

If you encounter issues:

1. Check troubleshooting section above
2. Review Edge Function logs: `supabase functions logs handle-creem-webhook`
3. Check Creem webhook delivery logs
4. Contact Creem support: support@creem.io
5. Contact Svix support: support@svix.com (if needed)
