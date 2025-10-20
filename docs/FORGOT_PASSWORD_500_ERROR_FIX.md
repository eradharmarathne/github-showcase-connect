# Forgot Password 500 Error Fix

## Problem
When users try to reset their password on `/auth/forgot-password`, they get a **500 Internal Server Error** from Supabase:

```
POST https://takovelbhvoqnvfmnhaq.supabase.co/auth/v1/recover?redirect_to=http%3A%2F%2Flocalhost%3A8080%2Fauth%2Freset-password 500 (Internal Server Error)
```

## Root Causes

The 500 error typically occurs due to one or both of these issues:

### 1. ❌ Redirect URL Not Allowlisted
Supabase Auth requires redirect URLs to be explicitly allowlisted for security.

### 2. ❌ Email Provider Not Configured
Supabase needs an email provider (SMTP) configured to send password reset emails.

## Solutions

### Fix 1: Allowlist Redirect URLs

1. **Go to Supabase Dashboard**
   - Navigate to: https://supabase.com/dashboard/project/takovelbhvoqnvfmnhaq

2. **Open Authentication Settings**
   - Click on "Authentication" in the left sidebar
   - Click on "URL Configuration"

3. **Add Redirect URLs**
   Add these URLs to the "Redirect URLs" allowlist:
   ```
   http://localhost:8080/auth/reset-password
   https://app.checkingcheckout.com/auth/reset-password
   https://*.vercel.app/auth/reset-password
   ```

4. **Save Changes**
   - Click "Save" button
   - Wait a few seconds for changes to propagate

### Fix 2: Configure Email Provider

#### Option A: Use Supabase's Default Email Service (Quick, but limited)

Supabase provides a default email service with rate limits:
- ✅ **Already configured** by default
- ⚠️ Limited to **3 emails per hour** per user
- ⚠️ Not suitable for production

**No action needed** - this should work out of the box.

#### Option B: Configure Custom SMTP (Recommended for Production)

1. **Get SMTP Credentials**
   Popular providers:
   - **SendGrid** (12,000 free emails/month)
   - **Mailgun** (5,000 free emails/month)
   - **Amazon SES** (62,000 free emails/month)
   - **Gmail SMTP** (100 emails/day)

2. **Configure in Supabase**
   - Go to: Authentication → Email Templates
   - Click "Settings" at the top
   - Scroll to "SMTP Settings"
   - Enter your SMTP credentials:
     ```
     Host: smtp.sendgrid.net (or your provider)
     Port: 587
     Username: apikey (for SendGrid)
     Password: YOUR_SENDGRID_API_KEY
     Sender email: noreply@checkingcheckout.com
     Sender name: CheckingCheckout
     ```

3. **Test Email**
   - Click "Send test email"
   - Verify email arrives

### Fix 3: Customize Email Template (Optional)

1. **Go to Email Templates**
   - Authentication → Email Templates
   - Select "Reset Password"

2. **Customize Template**
   ```html
   <h2>Reset Your Password</h2>
   <p>Hi there,</p>
   <p>You requested to reset your password for CheckingCheckout.</p>
   <p>Click the button below to reset your password:</p>
   <p><a href="{{ .ConfirmationURL }}">Reset Password</a></p>
   <p>This link expires in 1 hour.</p>
   <p>If you didn't request this, you can safely ignore this email.</p>
   ```

3. **Save Template**

## Code Changes Made

### Updated redirect URL in `forgot-password.tsx`:

**Before:**
```typescript
redirectTo: `${window.location.origin}/auth`
```

**After:**
```typescript
redirectTo: `${window.location.origin}/auth/reset-password`
```

### Added better error handling:

```typescript
if (error.status === 500) {
  toast({
    title: "Service Configuration Error",
    description: "Email service is not properly configured. Please contact support...",
    variant: "destructive",
  });
}
```

## Testing the Fix

1. **Clear browser cache** (or use incognito)

2. **Go to Forgot Password page**
   ```
   http://localhost:8080/auth/forgot-password
   ```

3. **Enter your email**
   - Use an email you have access to
   - Example: `demo@checkingcheckout.com`

4. **Check for errors**
   - ✅ Should show "Reset Email Sent" toast
   - ✅ Should receive email within 1-2 minutes
   - ❌ If 500 error: Check Supabase dashboard settings

5. **Click reset link in email**
   - Should redirect to: `http://localhost:8080/auth/reset-password`
   - Should show password reset form
   - Should NOT show "Invalid Reset Link" error

6. **Reset password**
   - Enter new password (min 8 characters)
   - Confirm password
   - Should redirect to login page

## Troubleshooting

### Issue: Still getting 500 error after allowlisting URLs

**Possible causes:**
1. SMTP not configured and default email service rate limit exceeded
2. Typo in redirect URL (check spelling)
3. Need to wait 30 seconds for Supabase changes to propagate

**Solution:**
- Check Supabase Auth logs in dashboard
- Try again in 1 minute
- Verify URL allowlist includes exact URL

### Issue: Email not arriving

**Possible causes:**
1. Email in spam folder
2. Rate limit exceeded (3/hour on free tier)
3. SMTP credentials incorrect

**Solution:**
- Check spam/junk folder
- Wait 1 hour and try again
- Verify SMTP settings in Supabase dashboard
- Send test email from Supabase dashboard

### Issue: "Invalid Reset Link" error after clicking email

**Possible causes:**
1. Link expired (1 hour timeout)
2. Link already used
3. Session conflict

**Solution:**
- Request new reset email
- Clear browser cookies
- Try in incognito window

## Production Checklist

Before deploying to production:

- [ ] Configure custom SMTP provider (SendGrid, Mailgun, etc.)
- [ ] Add production URL to redirect allowlist
- [ ] Test password reset flow end-to-end
- [ ] Customize email template with branding
- [ ] Set up email deliverability (SPF, DKIM, DMARC)
- [ ] Monitor email delivery rates
- [ ] Set up alerts for failed email sends

## Related Files

- `/src/pages/forgot-password.tsx` - Forgot password form
- `/src/pages/reset-password.tsx` - Reset password form
- `/src/pages/auth.tsx` - Login page (handles auth callback)

## Supabase Dashboard URLs

- **Project Dashboard**: https://supabase.com/dashboard/project/takovelbhvoqnvfmnhaq
- **Authentication Settings**: https://supabase.com/dashboard/project/takovelbhvoqnvfmnhaq/auth/users
- **Email Templates**: https://supabase.com/dashboard/project/takovelbhvoqnvfmnhaq/auth/templates
- **URL Configuration**: https://supabase.com/dashboard/project/takovelbhvoqnvfmnhaq/auth/url-configuration

## Additional Resources

- [Supabase Auth Docs](https://supabase.com/docs/guides/auth)
- [Password Reset Flow](https://supabase.com/docs/guides/auth/auth-password-reset)
- [Email Configuration](https://supabase.com/docs/guides/auth/auth-smtp)
- [SendGrid Setup](https://sendgrid.com/docs/for-developers/sending-email/integrations/supabase/)
