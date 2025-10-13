# OAuth Setup Guide - Google & Facebook

This guide explains how to configure Google and Facebook OAuth authentication in Supabase for CheckingCheckout.

## Prerequisites

- Supabase project with authentication enabled
- Access to Google Cloud Console (for Google OAuth)
- Access to Meta for Developers (for Facebook OAuth)

## Google OAuth Setup

### 1. Create Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Navigate to **APIs & Services** > **Credentials**
4. Click **Create Credentials** > **OAuth 2.0 Client ID**
5. Configure the OAuth consent screen if prompted:
   - User Type: External
   - App name: CheckingCheckout
   - User support email: your email
   - Developer contact: your email
6. For Application type, select **Web application**
7. Add authorized redirect URIs:
   ```
   https://<your-supabase-project-ref>.supabase.co/auth/v1/callback
   ```
   For local development also add:
   ```
   http://localhost:54321/auth/v1/callback
   ```
8. Copy the **Client ID** and **Client Secret**

### 2. Configure in Supabase

1. Go to your [Supabase Dashboard](https://app.supabase.com/)
2. Navigate to **Authentication** > **Providers**
3. Find **Google** and enable it
4. Paste your **Client ID** and **Client Secret**
5. Click **Save**

## Facebook OAuth Setup

### 1. Create Facebook App

1. Go to [Meta for Developers](https://developers.facebook.com/)
2. Click **My Apps** > **Create App**
3. Choose **Consumer** as app type
4. Fill in app details:
   - App Name: CheckingCheckout
   - App Contact Email: your email
5. Once created, go to **Settings** > **Basic**
6. Copy the **App ID** and **App Secret**

### 2. Configure Facebook Login

1. In your Facebook app, go to **Add Product**
2. Find **Facebook Login** and click **Set Up**
3. Select **Web** as platform
4. Add your site URL (for production):
   ```
   https://your-domain.com
   ```
5. Go to **Facebook Login** > **Settings**
6. Add Valid OAuth Redirect URIs:
   ```
   https://<your-supabase-project-ref>.supabase.co/auth/v1/callback
   ```
   For local development also add:
   ```
   http://localhost:54321/auth/v1/callback
   ```
7. Save changes

### 3. Configure in Supabase

1. Go to your [Supabase Dashboard](https://app.supabase.com/)
2. Navigate to **Authentication** > **Providers**
3. Find **Facebook** and enable it
4. Paste your **App ID** as Client ID
5. Paste your **App Secret** as Client Secret
6. Click **Save**

## Testing OAuth Locally

### Using Supabase CLI

1. Start your local Supabase instance:
   ```bash
   supabase start
   ```

2. Update your `.env.local` with local Supabase credentials if needed

3. Configure OAuth providers in the local dashboard:
   ```
   http://localhost:54323
   ```

4. Test the OAuth flow in your local app:
   ```bash
   bun dev
   ```

## Production Deployment

### Update Environment Variables

Ensure your production environment has the correct Supabase URL:
```env
VITE_SUPABASE_URL=https://<your-project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-key>
```

### Update Redirect URIs

Make sure all OAuth providers have the correct production redirect URIs configured:
- Google Cloud Console: Update authorized redirect URIs
- Facebook App: Update Valid OAuth Redirect URIs

### Verify Domain Settings

1. In Supabase Dashboard, go to **Authentication** > **URL Configuration**
2. Add your production domain to **Site URL**:
   ```
   https://your-domain.com
   ```
3. Add to **Redirect URLs**:
   ```
   https://your-domain.com/smart-redirect
   https://your-domain.com/auth
   ```

## Security Best Practices

1. **Keep secrets secure**: Never commit OAuth secrets to version control
2. **Use HTTPS**: Always use HTTPS in production for OAuth redirects
3. **Validate redirects**: Ensure redirect URLs are properly validated
4. **Monitor usage**: Regularly check OAuth provider dashboards for unusual activity
5. **Limit scopes**: Only request necessary OAuth scopes

## Troubleshooting

### "Redirect URI mismatch" Error

- Verify the redirect URI in your OAuth provider matches exactly with Supabase
- Check for trailing slashes or protocol mismatches (http vs https)
- Ensure the Supabase project reference is correct

### "Invalid Client" Error

- Double-check Client ID and Client Secret are correctly copied
- Ensure there are no extra spaces or characters
- Verify the OAuth provider is enabled in Supabase

### User Not Created After OAuth Sign-in

- Check the AuthContext profile creation logic
- Verify the `profiles` table trigger is working
- Check Supabase logs for any errors during sign-in

### Local Development Issues

- Ensure local Supabase is running: `supabase status`
- Check that OAuth providers are configured in local dashboard
- Verify redirect URIs include localhost URLs

## OAuth Flow in CheckingCheckout

1. User clicks "Continue with Google" or "Continue with Facebook"
2. `handleOAuthSignIn()` initiates OAuth flow with Supabase
3. User is redirected to provider (Google/Facebook) for authentication
4. After successful auth, user is redirected back to `/smart-redirect`
5. AuthContext detects the sign-in event and:
   - Creates/fetches user profile
   - Fetches tenant data if available
   - Routes user to appropriate page based on permissions

## Additional Resources

- [Supabase OAuth Documentation](https://supabase.com/docs/guides/auth/social-login)
- [Google OAuth Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Facebook Login Documentation](https://developers.facebook.com/docs/facebook-login)
