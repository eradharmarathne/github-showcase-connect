# Google Business Profile Reviews Integration - Setup Guide

## Overview

This guide explains how to set up and use the Google Business Profile API integration to manage customer reviews within CheckingCheckout.

**API Version:** Google My Business API v4
**Documentation:** https://developers.google.com/my-business/content/review-data

---

## Features

- ✅ View all Google Business Profile reviews for your locations
- ✅ Reply to customer reviews directly from CheckingCheckout
- ✅ Manual and automatic review synchronization
- ✅ Multi-tenant isolation (each property has separate Google credentials)
- ✅ Filter reviews by rating, reply status, and search text
- ✅ Sort reviews by date or rating

---

## Prerequisites

Before you begin, you need:

1. **Google Business Profile Account**
   - Your business must be verified on Google Business Profile
   - You need manager or owner access to the location

2. **Google Cloud Project**
   - Create a project at https://console.cloud.google.com/
   - Enable "My Business API" (not "Business Information API")
   - Set up OAuth 2.0 credentials

3. **OAuth 2.0 Setup**
   - Create OAuth 2.0 Client ID credentials
   - Add authorized redirect URIs
   - Download client credentials (client ID and secret)

---

## Step 1: Google Cloud Console Setup

### 1.1 Create a Google Cloud Project

1. Go to https://console.cloud.google.com/
2. Click "Select a project" → "New Project"
3. Enter project name: "CheckingCheckout Google Reviews"
4. Click "Create"

### 1.2 Enable My Business API

1. In your project, go to "APIs & Services" → "Library"
2. Search for "My Business API"
3. Click "Enable"

**Important:** Do NOT enable "Business Information API" - that's a different API without reviews support.

### 1.3 Create OAuth 2.0 Credentials

1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "OAuth 2.0 Client ID"
3. If prompted, configure OAuth consent screen first:
   - User Type: External
   - App name: "CheckingCheckout"
   - User support email: your email
   - Authorized domains: your domain
   - Scopes: Add `https://www.googleapis.com/auth/business.manage`
4. Back to "Create OAuth 2.0 Client ID":
   - Application type: Web application
   - Name: "CheckingCheckout Web Client"
   - Authorized redirect URIs: `https://your-domain.com/settings/google-integration/callback` (adjust for your domain)
5. Click "Create"
6. Save the Client ID and Client Secret

### 1.4 Add Test Users (During Development)

1. Go to "APIs & Services" → "OAuth consent screen"
2. Scroll to "Test users"
3. Add your Google Business Profile email
4. Click "Save"

---

## Step 2: Get Your Google Account ID and Location ID

### Method 1: Using Google My Business API Explorer

1. Go to https://developers.google.com/my-business/reference/rest/v4/accounts/list
2. Click "Try this API" in the right sidebar
3. Click "Execute" to see your accounts
4. Copy your account ID (format: `accounts/1234567890`)

### Method 2: Using API Directly

```bash
curl -X GET \
  'https://mybusiness.googleapis.com/v4/accounts' \
  -H 'Authorization: Bearer YOUR_ACCESS_TOKEN'
```

### Get Location ID

Once you have your account ID:

```bash
curl -X GET \
  'https://mybusiness.googleapis.com/v4/accounts/YOUR_ACCOUNT_ID/locations' \
  -H 'Authorization: Bearer YOUR_ACCESS_TOKEN'
```

Look for your location in the response and copy the location ID (format: `locations/9876543210`).

**Note:** For the current implementation, you'll enter just the numeric IDs without the `accounts/` and `locations/` prefixes.

---

## Step 3: Configure in CheckingCheckout

### 3.1 Navigate to Google Integration Settings

1. Log in to CheckingCheckout
2. Go to **Settings** → **Google Business Profile Integration**
3. Select your location from the location switcher

### 3.2 Enter Credentials

1. **Google Account ID**: Enter your Google Business Profile account ID
   - Example: `1234567890` (without `accounts/` prefix)

2. **Google Location ID**: Enter your specific location ID
   - Example: `9876543210` (without `locations/` prefix)

3. Click "Save Configuration"

### 3.3 Sync Reviews

1. Once credentials are saved, click **"Sync Reviews Now"**
2. The system will fetch all reviews from Google Business Profile
3. Wait for the sync to complete (usually a few seconds)
4. Navigate to **Reviews** page to see your reviews

---

## Step 4: OAuth Token Management (For Production)

The current implementation uses manual Account ID and Location ID entry. For production, implement full OAuth flow:

### 4.1 Implement OAuth Flow

Create an Edge Function to handle OAuth token exchange:

```typescript
// supabase/functions/google-oauth-exchange/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve(async (req) => {
  const { code, locationId } = await req.json();

  // Exchange authorization code for tokens
  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: Deno.env.get("GOOGLE_CLIENT_ID")!,
      client_secret: Deno.env.get("GOOGLE_CLIENT_SECRET")!,
      redirect_uri: Deno.env.get("GOOGLE_REDIRECT_URI")!,
      grant_type: "authorization_code",
    }),
  });

  const tokens = await tokenResponse.json();

  // Store tokens in database
  // ... implementation

  return new Response(JSON.stringify({ success: true }));
});
```

### 4.2 Add OAuth Button to UI

Update `GoogleIntegrationSettings.tsx` to include OAuth flow:

```typescript
const handleOAuthLogin = () => {
  const clientId = "YOUR_CLIENT_ID";
  const redirectUri = "YOUR_REDIRECT_URI";
  const scope = "https://www.googleapis.com/auth/business.manage";

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${clientId}&` +
    `redirect_uri=${encodeURIComponent(redirectUri)}&` +
    `response_type=code&` +
    `scope=${encodeURIComponent(scope)}&` +
    `access_type=offline&` +
    `prompt=consent`;

  window.location.href = authUrl;
};
```

---

## Usage

### Viewing Reviews

1. Navigate to **Reviews** page
2. Use filters to narrow down reviews:
   - **Search**: Find reviews by reviewer name or comment text
   - **Rating**: Filter by star rating (1-5 stars)
   - **Reply Status**: Show replied or unreplied reviews only
   - **Sort**: Order by newest, oldest, highest rating, or lowest rating

### Replying to Reviews

1. Find the review you want to reply to
2. Click **"Reply"** button
3. Enter your response (max 4096 characters)
4. Click **"Post Reply"**
5. Your reply will be sent to Google and appear on Google Business Profile

**Important Notes:**
- Replies are public and visible to everyone on Google
- Be professional and courteous in all responses
- You can update replies by clicking "Reply" again on a reviewed item
- Replies cannot be deleted from CheckingCheckout (use Google Business Profile directly)

### Manual Sync

Reviews are automatically synced, but you can trigger a manual sync:

1. Go to **Settings** → **Google Business Profile Integration**
2. Click **"Sync Reviews Now"**
3. Wait for sync to complete
4. Go to **Reviews** page to see updated reviews

### Automatic Sync (Recommended)

Set up a cron job to sync reviews automatically every 6 hours:

```bash
# Add to supabase/functions/_shared/cron.ts or use external cron service
0 */6 * * * curl -X POST https://your-project.supabase.co/functions/v1/sync-google-reviews \
  -H "Authorization: Bearer YOUR_SERVICE_KEY" \
  -d '{"locationId": "YOUR_LOCATION_ID"}'
```

---

## Troubleshooting

### Error: "No active Google Business credentials found"

**Solution:** Go to Settings → Google Business Profile Integration and enter your Account ID and Location ID.

### Error: "Access token not found"

**Solution:** Currently, you need to manually add OAuth tokens to the database. For production, implement the OAuth flow (see Step 4).

### Error: "Access token expired"

**Solution:** Tokens expire after 1 hour. Implement token refresh logic using the `refresh_token`:

```typescript
async function refreshAccessToken(refreshToken: string) {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: Deno.env.get("GOOGLE_CLIENT_ID")!,
      client_secret: Deno.env.get("GOOGLE_CLIENT_SECRET")!,
      grant_type: "refresh_token",
    }),
  });

  return await response.json();
}
```

### Error: "Google API Error: 403"

**Possible causes:**
- Account doesn't have access to the location
- OAuth scope is incorrect (must be `https://www.googleapis.com/auth/business.manage`)
- API is not enabled in Google Cloud Console

**Solution:** Verify account access and OAuth setup.

### Error: "Review not found"

**Solution:** Sync reviews again to ensure local database is up to date.

### Reviews not appearing

**Checklist:**
1. ✅ Verify credentials are saved correctly
2. ✅ Click "Sync Reviews Now"
3. ✅ Check for error messages in Connection Status
4. ✅ Ensure location has reviews on Google Business Profile
5. ✅ Check browser console for JavaScript errors

---

## API Reference

### Endpoints Used

1. **List Reviews**
   ```
   GET https://mybusiness.googleapis.com/v4/accounts/{accountId}/locations/{locationId}/reviews
   ```

2. **Get Specific Review**
   ```
   GET https://mybusiness.googleapis.com/v4/accounts/{accountId}/locations/{locationId}/reviews/{reviewId}
   ```

3. **Reply to Review**
   ```
   PUT https://mybusiness.googleapis.com/v4/accounts/{accountId}/locations/{locationId}/reviews/{reviewId}/reply
   Body: { "comment": "Your reply text" }
   ```

4. **Delete Review Reply**
   ```
   DELETE https://mybusiness.googleapis.com/v4/accounts/{accountId}/locations/{locationId}/reviews/{reviewId}/reply
   ```

### OAuth Scope

```
https://www.googleapis.com/auth/business.manage
```

### Rate Limits

- **Queries Per Day**: 10,000 requests
- **Queries Per 100 Seconds**: 1,000 requests

**Best Practice:** Sync reviews every 6-12 hours, not more frequently.

---

## Database Schema

### google_business_credentials

Stores Google OAuth tokens and configuration.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `tenant_id` | UUID | Tenant reference (multi-tenant isolation) |
| `location_id` | UUID | Location reference |
| `google_account_id` | TEXT | Google account ID (e.g., "accounts/123") |
| `google_location_id` | TEXT | Google location ID (e.g., "locations/456") |
| `access_token` | TEXT | OAuth access token (encrypted) |
| `refresh_token` | TEXT | OAuth refresh token (encrypted) |
| `token_expires_at` | TIMESTAMPTZ | Token expiration time |
| `is_active` | BOOLEAN | Whether credentials are active |
| `last_synced_at` | TIMESTAMPTZ | Last successful sync time |
| `sync_status` | TEXT | pending \| active \| syncing \| error \| expired |
| `error_message` | TEXT | Error details if sync failed |

### google_reviews

Stores synced reviews from Google.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `tenant_id` | UUID | Tenant reference |
| `location_id` | UUID | Location reference |
| `google_review_id` | TEXT | Google's unique review ID |
| `reviewer_name` | TEXT | Reviewer display name |
| `reviewer_profile_photo_url` | TEXT | Reviewer photo URL |
| `star_rating` | INTEGER | Rating 1-5 |
| `comment` | TEXT | Review text |
| `review_time` | TIMESTAMPTZ | When review was posted |
| `has_reply` | BOOLEAN | Whether owner replied |
| `reply_text` | TEXT | Owner's reply |
| `reply_updated_at` | TIMESTAMPTZ | When reply was posted/updated |
| `replied_by` | UUID | Profile ID of user who replied |
| `raw_data` | JSONB | Complete API response |
| `last_fetched_at` | TIMESTAMPTZ | Last sync time |

---

## Security Considerations

1. **Token Encryption**: OAuth tokens should be encrypted at rest using pgcrypto extension
2. **RLS Policies**: Row-level security ensures users only see reviews for their tenant/location
3. **Permission Checks**: `access_reviews` permission required to view reviews page
4. **Input Validation**: Reply text is validated for length (max 4096 characters)
5. **Rate Limiting**: Implement exponential backoff for API calls

---

## Deployment

### Deploy Edge Functions

```bash
# Deploy sync function
supabase functions deploy sync-google-reviews

# Deploy reply function
supabase functions deploy reply-google-review

# Set environment secrets
supabase secrets set GOOGLE_CLIENT_ID=your_client_id
supabase secrets set GOOGLE_CLIENT_SECRET=your_client_secret
```

### Set Up Monitoring

Monitor these metrics:
- Sync success/failure rate
- API error types and frequency
- Average reply time
- Review response rate

---

## Support

For issues or questions:
- Check Google My Business API documentation: https://developers.google.com/my-business
- Review CheckingCheckout documentation
- Contact support team

---

## Changelog

**Version 1.0** (2025-10-11)
- Initial implementation
- Manual Account ID / Location ID configuration
- Review listing with filters and sorting
- Reply functionality
- Manual sync trigger
- Multi-tenant support
- Permission-based access control

**Future Enhancements:**
- [ ] Full OAuth 2.0 flow with automatic token exchange
- [ ] Automatic token refresh
- [ ] Scheduled automatic syncs (cron job)
- [ ] Reply templates for faster responses
- [ ] Review analytics and insights
- [ ] Email notifications for new reviews
- [ ] Bulk reply operations
