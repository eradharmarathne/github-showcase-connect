# Creem.io → Polar.sh Migration Summary

## ✅ Completed Tasks

### Phase 1: Database Schema Migration
**Status:** ✅ COMPLETE  
**File:** `supabase/migrations/20250120_migrate_creem_to_polar.sql`

**Changes:**
- ✅ Renamed `subscriptions.creem_customer_id` → `polar_customer_id`
- ✅ Renamed `subscriptions.creem_subscription_id` → `polar_subscription_id`
- ✅ Added `subscriptions.polar_checkout_id`
- ✅ Renamed `payment_attempts.creem_*` columns to `polar_*`
- ✅ Added `payment_attempts.polar_checkout_id`
- ✅ Renamed `plans.product_id` → `polar_product_id`
- ✅ Added `plans.polar_price_id` (Polar uses price IDs)
- ✅ Created `polar_webhook_events` table for idempotency
- ✅ Added indexes for performance
- ✅ Created view `payment_attempts_with_polar`

### Phase 2: Edge Functions
**Status:** ✅ COMPLETE

#### 2.1 handle-polar-webhook
**File:** `supabase/functions/handle-polar-webhook/index.ts`

**Features:**
- ✅ Webhook signature verification using Svix/Standard Webhooks
- ✅ Idempotency using `polar_webhook_events` table
- ✅ Event handlers:
  - `checkout.created` - Log checkout initiated
  - `subscription.active` - Activate subscription (replaces `checkout.session.completed`)
  - `subscription.created` - Log creation
  - `subscription.updated` - Update subscription details
  - `subscription.canceled` - Mark cancelled
  - `subscription.revoked` - Immediate revocation
  - `order.paid` - Payment confirmation
- ✅ Atomic database updates
- ✅ Error handling and retry tracking
- ✅ Comprehensive logging

#### 2.2 create-polar-checkout
**File:** `supabase/functions/create-polar-checkout/index.ts`

**Features:**
- ✅ Proxies checkout creation to Polar API
- ✅ Uses `Bearer` token authentication (replaces `x-api-key`)
- ✅ Accepts `product_price_id` (Polar uses price IDs)
- ✅ Supports customer email/name
- ✅ Metadata passthrough
- ✅ CORS handling
- ✅ Enhanced error handling

### Phase 3: Frontend Library
**Status:** ✅ COMPLETE

#### 3.1 Polar SDK Integration
**File:** `src/lib/polar.ts`

**Features:**
- ✅ `createCheckoutSession()` - Create Polar checkout via Edge Function
- ✅ `getSubscription()` - Fetch subscription details
- ✅ `cancelSubscription()` - Cancel subscription
- ✅ `getCustomerPortalUrl()` - Get Polar customer portal link
- ✅ `getPolarPriceId()` - Get price ID for a plan
- ✅ `checkSubscriptionStatus()` - Check tenant subscription
- ✅ `getAvailablePlans()` - Fetch active plans
- ✅ Helper functions for checkout workflow

#### 3.2 Package Updates
**File:** `package.json`

**Changes:**
- ✅ Removed `creem`: `^0.3.37`
- ✅ Added `@polar-sh/sdk`: `^0.17.0`

### Phase 4: Frontend Components
**Status:** 🔄 PARTIAL (1/4 completed)

#### 4.1 Onboarding Page ✅ COMPLETE
**File:** `src/pages/onboarding.tsx`

**Changes:**
- ✅ Import `createCheckoutSession` from `@/lib/polar`
- ✅ Import `getPolarPriceId` helper
- ✅ Updated checkout flow to use `product_price_id`
- ✅ Updated customer data structure (email/name instead of object)
- ✅ Updated error messages (Creem → Polar)
- ✅ Maintained metadata structure for webhook processing

#### 4.2 Billing Subscription Page ⏳ PENDING
**File:** `src/pages/billing-subscription.tsx`

**Required Changes:**
1. Line 25: Change import from `@/lib/creem` to `@/lib/polar`
2. Line 25: Replace `getProduct` with `getPolarPriceId`
3. Line 156: Update comment "Fetch Creem product" → "Fetch Polar product"
4. Line 160: Update comment about `creem_product_id` → `polar_price_id`
5. Line 226-270: Update `handleSubscribe()` function:
   - Remove `plan.product_id` check
   - Add `getPolarPriceId(plan.id)` call
   - Update `createCheckoutSession()` params:
     - `product_id` → `product_price_id`
     - `customer: { email }` → `customer_email`, `customer_name`
     - Remove `error_url` and `cancel_url` (Polar doesn't use these)
   - Update error variable names: `creemError` → `polarError`
   - Update error messages and logging
6. Line 294: Update `handleCancelSubscription()`:
   - `creem_subscription_id` → `polar_subscription_id`
   - Update error variable names
7. Line 484: Update comment "Creem.io Integration" → "Polar.sh Integration"

#### 4.3 Billing Success/Error Pages ⏳ PENDING
**Files:** 
- `src/pages/billing-success.tsx`
- `src/pages/billing-error.tsx`

**Required Changes:**
- Update any Creem-specific error handling
- Update URL parameter parsing (Polar uses different format)
- Update success messages

#### 4.4 Subscription Components ⏳ PENDING
**Files:**
- `src/components/subscription/payment-processing-info.tsx`
- Other subscription components

**Required Changes:**
- Update "Creem.io" mentions to "Polar.sh"
- Update links/documentation references
- Update payment flow descriptions

---

## ⏳ Remaining Tasks

### Phase 5: Webhook & Product Configuration
**Status:** ⏳ TODO

**Tasks:**
1. **Setup Polar Webhook in Dashboard**
   - URL: `https://[project].supabase.co/functions/v1/handle-polar-webhook`
   - Events: `checkout.created`, `subscription.active`, `subscription.updated`, `subscription.canceled`, `subscription.revoked`, `order.paid`
   - Get webhook secret
   - Test webhook delivery

2. **Create Products in Polar Dashboard**
   - Create products for each plan (Starter, Professional, Enterprise)
   - Configure trial periods (14 days)
   - Get product price IDs
   - Update `plans` table with `polar_price_id` values

### Phase 6: Environment Variables
**Status:** ⏳ TODO

**Required Variables:**

#### Frontend (.env.local)
```bash
# Remove these:
# VITE_CREEM_API_KEY=pk_test_xxxxx

# Add these:
VITE_POLAR_ORGANIZATION_ID=org_xxxxx
```

#### Supabase Secrets
```bash
# Remove these:
supabase secrets unset CREEM_API_KEY
supabase secrets unset SVIX_WEBHOOK_SECRET

# Add these:
supabase secrets set POLAR_ACCESS_TOKEN=polar_at_xxxxx
supabase secrets set POLAR_WEBHOOK_SECRET=whsec_xxxxx
```

### Phase 7: Delete Creem Files
**Status:** ⏳ TODO

**Files to Delete:**
1. `src/lib/creem.ts`
2. `supabase/functions/handle-creem-webhook/`
3. `supabase/functions/create-creem-checkout/`
4. `docs/CREEM-SVIX-SETUP.md`
5. `docs/PAYMENT-PLAN.md` (Creem-specific)
6. Any other Creem documentation

### Phase 8: Testing
**Status:** ⏳ TODO

**Test Checklist:**
- [ ] Run database migration in development
- [ ] Deploy Edge Functions to development
- [ ] Test onboarding payment flow (sandbox mode)
- [ ] Test webhook processing
- [ ] Test subscription cancellation
- [ ] Test payment failure scenarios
- [ ] Test concurrent payments
- [ ] Verify polling timeout works
- [ ] Test billing subscription page
- [ ] Test success/error pages

### Phase 9: Deployment
**Status:** ⏳ TODO

**Deployment Steps:**
1. Run migration: `supabase db push`
2. Deploy Edge Functions:
   ```bash
   supabase functions deploy handle-polar-webhook
   supabase functions deploy create-polar-checkout
   ```
3. Set environment variables (Vercel/hosting platform)
4. Set Supabase secrets
5. Configure Polar webhook
6. Update plans table with `polar_price_id` values
7. Test in production (with test mode)
8. Switch to production mode

### Phase 10: Cleanup
**Status:** ⏳ TODO

**Post-Migration Tasks:**
1. Monitor webhook delivery for 24-48 hours
2. Verify all new signups use Polar successfully
3. Delete Creem Edge Functions
4. Delete Creem library file
5. Remove Creem documentation
6. Update README with Polar setup instructions
7. Archive Creem-related code for reference

---

## 📋 Key Differences: Creem vs Polar

| Feature | Creem.io | Polar.sh |
|---------|----------|----------|
| **Authentication** | `x-api-key` header | `Bearer` token |
| **Checkout Param** | `product_id` | `product_price_id` |
| **Customer Data** | `customer: { email }` | `customer_email`, `customer_name` |
| **Success URLs** | `success_url`, `error_url`, `cancel_url` | `success_url` only |
| **Main Event** | `checkout.session.completed` | `subscription.active` |
| **Webhook Format** | Svix signatures | Standard Webhooks (Svix-compatible) |
| **Webhook Headers** | `svix-id`, `svix-timestamp`, `svix-signature` | `webhook-id`, `webhook-timestamp`, `webhook-signature` |
| **SDK Package** | `creem` | `@polar-sh/sdk` |
| **Database IDs** | `creem_customer_id`, `creem_subscription_id` | `polar_customer_id`, `polar_subscription_id` |

---

## 🔐 Security Features Maintained

✅ **Webhook signature verification** - Using Svix library (same as before)  
✅ **Pending payment status** - Tenant created with `pending_payment` before payment  
✅ **Atomic database updates** - Idempotent webhook processing  
✅ **Server-side checkout creation** - API keys never exposed to frontend  
✅ **Payment window in new tab** - User stays on app during payment  
✅ **Payment polling** - Frontend polls for verification (10-minute timeout)  
✅ **Metadata validation** - Webhooks validate required `tenant_id` and `user_id`  

---

## 📝 Manual Steps Required

### Before Going Live:

1. **Create Polar Account**
   - Sign up at https://polar.sh
   - Complete organization setup
   - Get organization ID

2. **Create Products in Polar Dashboard**
   - Create products matching existing plans
   - Set trial periods (14 days)
   - Get price IDs for each product/plan combination

3. **Update Database**
   ```sql
   -- Update plans table with Polar price IDs
   UPDATE plans SET polar_price_id = 'price_xxxxx' WHERE id = 'starter_monthly';
   UPDATE plans SET polar_price_id = 'price_yyyyy' WHERE id = 'professional_monthly';
   -- Repeat for all plans
   ```

4. **Configure Webhook**
   - Add webhook endpoint in Polar dashboard
   - Copy webhook secret
   - Set as Supabase secret

5. **Test End-to-End**
   - Test full signup flow in sandbox mode
   - Verify webhook delivery
   - Check database updates
   - Test subscription cancellation

6. **Switch to Production**
   - Update API tokens to production
   - Update webhook URL to production
   - Monitor first few signups closely

---

## 🐛 Known Issues / Notes

1. **billing-subscription.tsx** needs manual completion due to indentation mismatch
2. **Payment success/error pages** not yet updated
3. **Subscription components** may have hardcoded "Creem" text
4. **Plans table** needs `polar_price_id` values populated manually
5. **Environment variables** need to be set in all environments

---

## 📚 Documentation

### New Files Created:
- ✅ `supabase/migrations/20250120_migrate_creem_to_polar.sql`
- ✅ `supabase/functions/handle-polar-webhook/index.ts`
- ✅ `supabase/functions/create-polar-checkout/index.ts`
- ✅ `src/lib/polar.ts`
- ✅ `POLAR_MIGRATION_SUMMARY.md` (this file)

### Files Modified:
- ✅ `package.json`
- ✅ `src/pages/onboarding.tsx`
- ⏳ `src/pages/billing-subscription.tsx` (partial)
- ⏳ Other subscription-related components

### Files to Delete (Phase 7):
- `src/lib/creem.ts`
- `supabase/functions/handle-creem-webhook/`
- `supabase/functions/create-creem-checkout/`
- `docs/CREEM-*.md`

---

## 🚀 Next Steps

1. **Complete remaining frontend updates:**
   - Finish `billing-subscription.tsx`
   - Update `billing-success.tsx` and `billing-error.tsx`
   - Update subscription components
   - Search for any remaining "creem" or "Creem" references

2. **Run the migration:**
   ```bash
   supabase db push
   ```

3. **Install Polar SDK:**
   ```bash
   bun install
   ```

4. **Deploy Edge Functions:**
   ```bash
   supabase functions deploy handle-polar-webhook
   supabase functions deploy create-polar-checkout
   ```

5. **Configure Polar:**
   - Create products
   - Set up webhook
   - Update environment variables

6. **Test thoroughly**

7. **Delete Creem code** (after successful testing)

---

## ⏱️ Estimated Completion Time

- ✅ **Completed:** ~70% (Core infrastructure done)
- ⏳ **Remaining:** ~30% (Frontend updates, configuration, testing)
- **Total Time to Complete:** 2-4 hours for remaining tasks

---

## 📞 Support

If you encounter issues:
- Check Polar documentation: https://docs.polar.sh
- Polar Discord: https://discord.gg/polar
- Polar GitHub: https://github.com/polarsource/polar

For Supabase Edge Functions:
- Supabase docs: https://supabase.com/docs/guides/functions
