# Onboarding Payment Enforcement Fix

## Problem
The onboarding flow had a critical security vulnerability where users could bypass payment by clicking "Start 7-Day Free Trial" button. This created tenants with:
- `onboarding_completed: true`
- `subscription_status: 'trial'`
- Full access to the system without any payment

This contradicted the requirement that Creem.io should manage the 14-day trial period through their payment system.

## Root Cause
1. **UI Level**: `plan-selection-step.tsx` displayed TWO buttons:
   - "Start 7-Day Free Trial" → Called `onStartTrial` handler
   - "Pay Now & Get Started" → Called `onPayNow` handler

2. **Handler Level**: `onboarding.tsx` had `handleStartTrial()` function that called `completeOnboarding()`

3. **Database Level**: `completeOnboarding()` function created fully functional tenant without payment:
   ```typescript
   await supabase.from("tenants").insert({
     onboarding_completed: true,
     subscription_status: "trial",
     trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
   })
   ```

4. **Routing Level**: `SmartRedirect` only checked `onboarding_completed`, not `subscription_status`, allowing bypass tenants to access dashboard

## Solution Implemented

### 1. UI Changes (`plan-selection-step.tsx`)
- ✅ Removed "Start 7-Day Free Trial" button
- ✅ Kept only "Pay Now" button, renamed to **"Start 14-Day Free Trial"**
- ✅ Updated messaging: "Start with a 14-day free trial managed by our payment provider"
- ✅ Updated footer text: "✨ 14-day free trial via secure payment"
- ✅ Removed unused `Calendar` import

### 2. Type Changes (`types.ts`)
- ✅ Removed `onStartTrial` from `PlanSelectionStepProps` interface
- ✅ Now only `onPayNow` handler is required

### 3. Handler Changes (`onboarding.tsx`)
- ✅ **Deleted** `handleStartTrial()` function (lines 170-195)
- ✅ **Deleted** `completeOnboarding()` function (lines 374-560) - the entire bypass logic
- ✅ Removed `onStartTrial={handleStartTrial}` prop from PlanSelectionStep
- ✅ Only `handlePayNow()` flow remains, which:
  1. Creates tenant with `subscription_status: 'pending_payment'`
  2. Opens Creem.io checkout in new tab
  3. Waits for payment webhook to complete onboarding
  4. Only then sets `onboarding_completed: true`

### 4. Routing Security (`smart-redirect.tsx`)
- ✅ Added subscription status validation:
  ```typescript
  const invalidSubscriptionStatuses = [
    'incomplete', 
    'pending_payment', 
    'payment_failed', 
    'expired'
  ];
  
  if (tenant.subscription_status && invalidSubscriptionStatuses.includes(tenant.subscription_status)) {
    return <Navigate to="/onboarding" replace />;
  }
  ```
- ✅ Users with invalid subscription status are redirected to onboarding, even if `onboarding_completed: true`

### 5. Database Fix
Fixed existing tenant "bylake kandy" that bypassed payment:
```sql
UPDATE tenants
SET 
  subscription_status = 'incomplete',
  onboarding_completed = false
WHERE id = 'bc3a0796-4345-4479-b5c6-4eb97c8fb674';
```

## Payment Flow (Now Enforced)

1. **User selects plan** → Fills onboarding form
2. **Clicks "Start 14-Day Free Trial"** → Calls `handlePayNow()`
3. **Backend creates tenant** → Status: `pending_payment`, `onboarding_completed: false`
4. **Creem.io checkout opens** → User enters payment details
5. **Creem.io manages trial** → 14-day trial period (not local database)
6. **Payment webhook fires** → Updates tenant:
   - `subscription_status: 'trialing'` or `'active'`
   - `onboarding_completed: true`
7. **User gains access** → Only after webhook verification

## Security Benefits

✅ **Eliminates bypass**: No way to skip payment and access system  
✅ **Centralized trial management**: Creem.io handles all trial logic  
✅ **Webhook-driven**: Access granted only after payment provider confirms  
✅ **Routing protection**: SmartRedirect blocks invalid subscription statuses  
✅ **Database integrity**: No more tenants with local "trial" status

## Testing Checklist

- [ ] Create new tenant account
- [ ] Verify only ONE button appears: "Start 14-Day Free Trial"
- [ ] Verify clicking button opens Creem.io checkout
- [ ] Verify closing checkout without payment prevents access
- [ ] Verify completing payment grants dashboard access
- [ ] Verify existing "bylake kandy" tenant must complete payment
- [ ] Verify expired trials are redirected to billing/onboarding

## Deployment Status

- **Committed**: `55f071a` - "fix: Remove trial bypass and enforce Creem.io payment"
- **Pushed to**: `origin/main`
- **Production**: Deployed via Vercel automatic deployment

## Files Changed

1. `/src/components/onboarding/plan-selection-step.tsx` - UI cleanup
2. `/src/components/onboarding/types.ts` - Interface update
3. `/src/pages/onboarding.tsx` - Removed bypass functions
4. `/src/components/routing/smart-redirect.tsx` - Added subscription validation
5. Database: Updated "bylake kandy" tenant record

## Related Issues

- Fixes: User could create accounts without payment
- Implements: Creem.io trial management requirement
- Closes: Payment bypass vulnerability

## Notes for Developers

⚠️ **BREAKING CHANGE**: This is a breaking change for any user currently in the onboarding flow. All incomplete onboardings will require payment completion.

⚠️ **Trial Management**: Trial period is now exclusively managed by Creem.io (14 days), not local database (7 days).

⚠️ **Status Values**: Valid subscription statuses for dashboard access:
- `active` - Paid subscription
- `trialing` - In 14-day trial via Creem.io
- `trial` - **DEPRECATED** - Old local trial (should not exist)

Invalid statuses (redirected to onboarding):
- `incomplete`
- `pending_payment`
- `payment_failed`
- `expired`
