# Password Reset Flow - Testing Guide

## Current Flow Architecture

### Step 1: User Requests Password Reset
**Page:** `/auth/forgot-password`

User enters email → System sends reset email via Supabase

**Code:**
```typescript
await supabase.auth.resetPasswordForEmail(email, {
  redirectTo: `${window.location.origin}/auth`,
});
```

### Step 2: User Clicks Email Link
**Supabase sends email with link:**
```
http://localhost:8080/auth?token_hash=xxx&type=recovery
```

The link goes to `/auth` with query parameters.

### Step 3: Auth Page Verifies Token
**Page:** `/auth` (auth.tsx lines 58-85)

```typescript
const tokenHash = searchParams.get("token_hash");
const type = searchParams.get("type");

if (tokenHash && type === "recovery") {
  // Verify the OTP token
  const { data, error } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type: "recovery",
  });
  
  // This creates a session!
  
  // Then redirect to reset password page
  navigate("/auth/reset-password", { replace: true });
}
```

### Step 4: Reset Password Form
**Page:** `/auth/reset-password` (reset-password.tsx)

- Checks if session exists (established in Step 3)
- If session exists → Shows password reset form
- If no session → Redirects back to forgot password

**Session Check:**
```typescript
const { data: { session }, error } = await supabase.auth.getSession();

if (error || !session) {
  // Redirect to /auth/forgot-password
} else {
  // Show reset form
}
```

### Step 5: User Resets Password
User enters new password → Submits form

```typescript
const { error } = await supabase.auth.updateUser({
  password: newPassword
});

if (!error) {
  // Password updated successfully
  // Redirect to login
}
```

## Known Issues & Fixes Applied

### Issue 1: Session Not Established
**Problem:** `verifyOtp` might not establish session immediately

**Fix Applied:**
```typescript
// Check that session was actually created
if (!data.session) {
  console.error("No session established after token verification");
  // Show error
}

// Wait 500ms for session to be fully established
await new Promise(resolve => setTimeout(resolve, 500));
```

### Issue 2: Race Condition
**Problem:** Redirect happens before session is saved to storage

**Fix Applied:** Added 500ms delay after session verification before redirect

### Issue 3: Better Error Logging
**Added console logs to track flow:**
- Auth page: Log when recovery token is verified
- Auth page: Log session details
- Reset page: Log session check result
- Reset page: Log if session is missing

## Testing Instructions

### Test 1: Full Password Reset Flow

1. **Start Fresh**
   ```bash
   # Clear browser storage
   localStorage.clear()
   sessionStorage.clear()
   # Or use incognito window
   ```

2. **Request Reset**
   - Go to: http://localhost:8080/auth/forgot-password
   - Enter email: `demo@checkingcheckout.com`
   - Click "Send Reset Link"
   - Should see: "Reset Email Sent" toast

3. **Check Email**
   - Open email inbox
   - Look for "Reset Password" email from Supabase
   - Note: Email might be in spam folder
   - Click the reset link

4. **Verify Redirect Chain**
   Open browser DevTools Console to see logs:
   ```
   Recovery token verified, session established: {session details}
   Reset password page: Checking session...
   Session check result: { hasSession: true, userId: xxx }
   Valid session found, showing reset password form
   ```

5. **Reset Password**
   - Should see password reset form
   - Enter new password (min 6 characters)
   - Confirm password
   - Click "Reset Password"
   - Should see success message
   - Should redirect to login page

6. **Verify New Password**
   - Go to login page
   - Login with new password
   - Should successfully log in

### Test 2: Invalid/Expired Token

1. **Use Old Reset Link**
   - Try clicking an old reset link from email
   - Should see: "Invalid Reset Link" toast
   - Should redirect to forgot password page

2. **Tamper with Token**
   - Go to: http://localhost:8080/auth?token_hash=invalid&type=recovery
   - Should see: "Invalid Reset Link" toast
   - Should redirect to forgot password page

### Test 3: Direct Access to Reset Page

1. **Access Without Token**
   - Clear session
   - Go directly to: http://localhost:8080/auth/reset-password
   - Should see: "Invalid Reset Link" toast
   - Should redirect to forgot password page after 2 seconds

## Debugging

### Check Browser Console Logs

**Expected log sequence:**
```
1. User clicks reset link
2. Auth page: "Recovery token verified, session established"
3. Navigate to /auth/reset-password
4. Reset page: "Reset password page: Checking session..."
5. Reset page: "Session check result: { hasSession: true }"
6. Reset page: "Valid session found, showing reset password form"
7. Form renders
```

**If you see:**
```
Reset password page: Checking session...
Session check result: { hasSession: false }
No active session found
```

This means session wasn't established after token verification.

**Possible causes:**
- Token already used/expired
- Supabase session storage issue
- Race condition (session not saved yet)

### Check Network Tab

1. **Open DevTools → Network tab**

2. **Look for these requests:**
   - `POST /auth/v1/verify` - Token verification (should return 200)
   - `GET /auth/v1/session` - Session check (should return session data)

3. **If verify returns 400/422:**
   - Token is invalid or expired
   - User needs to request new reset link

4. **If session returns null:**
   - Session wasn't created during verification
   - Might be storage issue
   - Try different browser

### Check Supabase Dashboard

1. **Go to Auth Logs**
   - https://supabase.com/dashboard/project/takovelbhvoqnvfmnhaq/auth/users

2. **Look for recent events:**
   - `token_hash_verified` - Token verification succeeded
   - `user_recovery_requested` - Reset email sent
   - `user_updated` - Password changed

## Common Issues

### Issue: "Reset Email Sent" but no email arrives

**Causes:**
- Email in spam folder
- Supabase email provider not configured
- Rate limit exceeded (3 emails/hour on free tier)

**Solutions:**
- Check spam folder
- Wait 1 hour and try again
- Configure custom SMTP in Supabase

### Issue: Email arrives but link redirects to login page

**Causes:**
- Session not established after token verification
- Token already used (clicking link twice)
- Browser blocking cookies/storage

**Solutions:**
- Check console logs for session details
- Request new reset link
- Try incognito window
- Check browser privacy settings

### Issue: Reset form shows but password update fails

**Causes:**
- Session expired during form fill
- Weak password (less than 6 characters)
- Network issue

**Solutions:**
- Request new reset link (start fresh)
- Use stronger password
- Check network connection

## Files Modified

1. `/src/pages/auth.tsx`
   - Added session validation after token verification
   - Added 500ms delay before redirect
   - Added console logging

2. `/src/pages/reset-password.tsx`
   - Added detailed session logging
   - Added 2-second delay before error redirect (to show toast)
   - Improved error messages

## Production Checklist

Before deploying password reset to production:

- [ ] Configure custom SMTP provider (not Supabase default)
- [ ] Test reset flow on production domain
- [ ] Add production URL to Supabase Auth allowlist
- [ ] Test email deliverability (check spam scores)
- [ ] Monitor reset success/failure rates
- [ ] Set up alerts for high failure rates
- [ ] Document support process for failed resets

## Support Scenarios

### User: "I didn't receive the reset email"

1. Check spam folder
2. Verify email address spelling
3. Check Supabase logs for email send event
4. If rate limited → Wait 1 hour
5. If email service down → Use admin panel to reset manually

### User: "Reset link says invalid or expired"

1. Links expire after 1 hour
2. Links are one-time use (can't click twice)
3. Send new reset email
4. Advise to use link immediately

### User: "Reset form doesn't appear"

1. Check browser console for errors
2. Verify JavaScript is enabled
3. Try incognito mode
4. Try different browser
5. Check if ad blocker interfering

## Related Documentation

- Password Reset Flow: https://supabase.com/docs/guides/auth/auth-password-reset
- Email Configuration: https://supabase.com/docs/guides/auth/auth-smtp
- Session Management: https://supabase.com/docs/guides/auth/sessions
