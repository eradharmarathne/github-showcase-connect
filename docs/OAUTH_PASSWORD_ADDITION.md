# OAuth User Password Addition Feature

## Overview
This feature enables users who signed up with OAuth providers (Google, Facebook) to add a password to their accounts, allowing them to sign in with both their OAuth provider AND email/password.

## Problem Solved
Previously, OAuth users (e.g., Google sign-in) couldn't add passwords to their accounts. When they tried to use the "Forgot Password" flow, they were redirected to the login page instead of being able to set a password.

## Solution
The password reset page now:
1. Detects if a user signed up via OAuth by checking `session.user.app_metadata.providers`
2. Shows appropriate messaging for OAuth users vs email/password users
3. Allows OAuth users to successfully add passwords to their accounts

## Implementation Details

### OAuth User Detection
```typescript
// In reset-password.tsx session validation useEffect
const providers = session.user?.app_metadata?.providers || [];
const isOAuth = providers.includes('google') || providers.includes('facebook');
setIsOAuthUser(isOAuth);
```

### Dynamic Messaging

#### Page Title
- **OAuth Users**: "Add Password to Your Account"
- **Email Users**: "Set New Password"

#### Description Text
- **OAuth Users**: "Add a password to enable signing in with email in addition to your OAuth provider (Google, Facebook, etc.)"
- **Email Users**: "Enter your new password below. Make sure it's strong and secure."

#### Success Message
- **OAuth Users**: "Password Added Successfully - You can now sign in with email/password in addition to your OAuth provider."
- **Email Users**: "Password Reset Successful - Your password has been updated successfully."

#### Error Message
- **OAuth Users**: "Failed to Add Password"
- **Email Users**: "Password Reset Failed"

## User Flow

### For OAuth Users Adding Password
1. User signed up with Google OAuth (no password initially)
2. User goes to login page and clicks "Forgot Password?"
3. User enters their email (the one associated with Google account)
4. System sends password reset email
5. User clicks link in email
6. Supabase verifies token and creates session
7. User is redirected to `/auth/reset-password`
8. Page detects OAuth user and shows "Add Password to Your Account"
9. User enters new password twice
10. Password is added via `supabase.auth.updateUser({ password })`
11. Success screen confirms password added
12. User can now sign in with:
    - Google OAuth (original method)
    - Email + password (newly added)

### For Regular Email Users Resetting Password
1. User signed up with email/password
2. User forgot password and clicks "Forgot Password?"
3. User enters their email
4. System sends password reset email
5. User clicks link in email
6. Supabase verifies token and creates session
7. User is redirected to `/auth/reset-password`
8. Page detects email user and shows "Set New Password"
9. User enters new password twice
10. Password is updated via `supabase.auth.updateUser({ password })`
11. Success screen confirms password reset
12. User can sign in with email + new password

## Technical Details

### Session Metadata Structure
```typescript
session.user.app_metadata = {
  provider: 'google',  // or 'email' for email/password users
  providers: ['google'], // array of all auth providers used
  // ... other metadata
}
```

### OAuth Provider Detection Logic
The code checks the `providers` array (not just the `provider` string) because a user might have multiple auth methods:
```typescript
const providers = session.user?.app_metadata?.providers || [];
const isOAuth = providers.includes('google') || providers.includes('facebook');
```

### Supported OAuth Providers
Currently checking for:
- Google (`'google'`)
- Facebook (`'facebook'`)

Can be extended to support other providers as needed.

## Password Requirements
Same for both OAuth and email users:
- Minimum 6 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number

## Security Notes
1. Password reset links expire based on Supabase configuration
2. Supabase handles token verification before redirecting to app
3. Session must be valid to access the password reset form
4. Invalid or expired tokens redirect to forgot-password page with error message
5. All password updates use Supabase's secure `auth.updateUser()` method

## Testing Checklist

### OAuth User Testing
- [ ] Google OAuth user can request password reset
- [ ] Email arrives with correct reset link
- [ ] Link redirects to reset-password page (not login page)
- [ ] Page shows "Add Password to Your Account" title
- [ ] Description mentions OAuth provider
- [ ] Password can be set successfully
- [ ] Success message mentions both auth methods
- [ ] User can sign in with Google OAuth after adding password
- [ ] User can sign in with email/password after adding password

### Email User Testing
- [ ] Email/password user can request password reset
- [ ] Email arrives with correct reset link
- [ ] Link redirects to reset-password page
- [ ] Page shows "Set New Password" title
- [ ] Description mentions password reset
- [ ] Password can be reset successfully
- [ ] Success message confirms password update
- [ ] User can sign in with new password

### Edge Cases
- [ ] Expired reset token shows error and redirects
- [ ] Invalid token shows error and redirects
- [ ] Password validation errors display correctly
- [ ] Password mismatch shows appropriate error
- [ ] OAuth user who already has password sees "Set New Password" (not "Add Password")

## Files Modified
- `/src/pages/reset-password.tsx` - Main implementation file

## Related Documentation
- `/docs/PASSWORD_RESET_TESTING_GUIDE.md` - Comprehensive password reset testing guide
- `/src/pages/forgot-password.tsx` - Password reset request page
- `/src/pages/auth.tsx` - Login/signup page with OAuth

## Commit
```
commit 2bbc056
feat: Add OAuth user password setting support

- Detect OAuth users (Google, Facebook) via app_metadata.providers
- Show 'Add Password to Your Account' title for OAuth users
- Show 'Set New Password' title for email/password users
- Update success messages to distinguish between password addition and reset
- Enable OAuth users to add passwords via forgot password flow
- OAuth users can now sign in with both email/password and OAuth provider
```

## Future Enhancements
1. Add support for more OAuth providers (GitHub, Twitter, etc.)
2. Show which OAuth provider user is currently using
3. Allow users to view/manage all their authentication methods
4. Add option to remove password after adding it
5. Show authentication history/logs
