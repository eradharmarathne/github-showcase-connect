# Google My Business API v4 Integration - Technical Reference

## API Documentation

**Official Documentation:** https://developers.google.com/my-business/content/review-data

## Base URL

```
https://mybusiness.googleapis.com/v4/
```

## Authentication

**OAuth 2.0 Scope:**
```
https://www.googleapis.com/auth/business.manage
```

**Authorization Header:**
```
Authorization: Bearer {access_token}
```

---

## API Endpoints

### 1. List All Reviews

**Endpoint:**
```http
GET /v4/accounts/{accountId}/locations/{locationId}/reviews
```

**Parameters:**
- `accountId` (path): Google Business Profile account ID
- `locationId` (path): Specific location ID
- `pageSize` (query, optional): Number of reviews per page (max 50)
- `pageToken` (query, optional): Token for pagination
- `orderBy` (query, optional): Sort order (e.g., `updateTime desc`)

**Request Example:**
```bash
curl -X GET \
  'https://mybusiness.googleapis.com/v4/accounts/1234567890/locations/9876543210/reviews' \
  -H 'Authorization: Bearer YOUR_ACCESS_TOKEN'
```

**Response:**
```json
{
  "reviews": [
    {
      "reviewId": "AIe9_BFx...",
      "reviewer": {
        "profilePhotoUrl": "https://lh3.googleusercontent.com/...",
        "displayName": "John Doe",
        "isAnonymous": false
      },
      "starRating": "FIVE",
      "comment": "Great place! Highly recommend.",
      "createTime": "2025-01-15T10:30:00Z",
      "updateTime": "2025-01-15T10:30:00Z",
      "reviewReply": {
        "comment": "Thank you for your kind words!",
        "updateTime": "2025-01-16T09:00:00Z"
      }
    }
  ],
  "nextPageToken": "CiAKGjBpNDd...",
  "totalReviewCount": 150,
  "averageRating": 4.5
}
```

**Star Rating Values:**
- `ONE` = 1 star
- `TWO` = 2 stars
- `THREE` = 3 stars
- `FOUR` = 4 stars
- `FIVE` = 5 stars

---

### 2. Get Specific Review

**Endpoint:**
```http
GET /v4/accounts/{accountId}/locations/{locationId}/reviews/{reviewId}
```

**Parameters:**
- `accountId` (path): Google Business Profile account ID
- `locationId` (path): Specific location ID
- `reviewId` (path): Unique review identifier

**Request Example:**
```bash
curl -X GET \
  'https://mybusiness.googleapis.com/v4/accounts/1234567890/locations/9876543210/reviews/AIe9_BFx...' \
  -H 'Authorization: Bearer YOUR_ACCESS_TOKEN'
```

**Response:**
Same structure as a single review object from List Reviews.

---

### 3. Reply to Review

**Endpoint:**
```http
PUT /v4/accounts/{accountId}/locations/{locationId}/reviews/{reviewId}/reply
```

**Parameters:**
- `accountId` (path): Google Business Profile account ID
- `locationId` (path): Specific location ID
- `reviewId` (path): Unique review identifier

**Request Body:**
```json
{
  "comment": "Thank you for your feedback! We're glad you enjoyed your stay."
}
```

**Constraints:**
- Maximum length: 4096 characters
- Cannot be empty
- Reply is publicly visible on Google

**Request Example:**
```bash
curl -X PUT \
  'https://mybusiness.googleapis.com/v4/accounts/1234567890/locations/9876543210/reviews/AIe9_BFx.../reply' \
  -H 'Authorization: Bearer YOUR_ACCESS_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "comment": "Thank you for your feedback!"
  }'
```

**Response:**
```json
{
  "comment": "Thank you for your feedback!",
  "updateTime": "2025-01-16T09:00:00Z"
}
```

---

### 4. Delete Review Reply

**Endpoint:**
```http
DELETE /v4/accounts/{accountId}/locations/{locationId}/reviews/{reviewId}/reply
```

**Parameters:**
- `accountId` (path): Google Business Profile account ID
- `locationId` (path): Specific location ID
- `reviewId` (path): Unique review identifier

**Request Example:**
```bash
curl -X DELETE \
  'https://mybusiness.googleapis.com/v4/accounts/1234567890/locations/9876543210/reviews/AIe9_BFx.../reply' \
  -H 'Authorization: Bearer YOUR_ACCESS_TOKEN'
```

**Response:**
Empty response with HTTP 200 status

**Note:** This removes your reply but does NOT delete the customer review itself.

---

### 5. Get Reviews from Multiple Locations (Batch)

**Endpoint:**
```http
POST /v4/accounts/{accountId}/locations:batchGetReviews
```

**Request Body:**
```json
{
  "locationNames": [
    "accounts/1234567890/locations/9876543210",
    "accounts/1234567890/locations/1111222233"
  ],
  "pageSize": 50,
  "orderBy": "updateTime desc"
}
```

**Response:**
```json
{
  "locationReviews": [
    {
      "name": "accounts/1234567890/locations/9876543210",
      "reviews": [ /* array of review objects */ ],
      "nextPageToken": "...",
      "totalReviewCount": 100,
      "averageRating": 4.5
    }
  ]
}
```

---

## OAuth 2.0 Flow

### Step 1: Authorization Request

Redirect user to:
```
https://accounts.google.com/o/oauth2/v2/auth?
  client_id=YOUR_CLIENT_ID&
  redirect_uri=YOUR_REDIRECT_URI&
  response_type=code&
  scope=https://www.googleapis.com/auth/business.manage&
  access_type=offline&
  prompt=consent
```

**Parameters:**
- `client_id`: Your OAuth 2.0 client ID
- `redirect_uri`: Where Google sends the authorization code
- `response_type`: Must be `code`
- `scope`: `https://www.googleapis.com/auth/business.manage`
- `access_type`: `offline` to get refresh token
- `prompt`: `consent` to force consent screen (ensures refresh token)

### Step 2: Token Exchange

After user authorizes, Google redirects to your `redirect_uri` with `code` parameter:

```
POST https://oauth2.googleapis.com/token
Content-Type: application/x-www-form-urlencoded

code=AUTHORIZATION_CODE&
client_id=YOUR_CLIENT_ID&
client_secret=YOUR_CLIENT_SECRET&
redirect_uri=YOUR_REDIRECT_URI&
grant_type=authorization_code
```

**Response:**
```json
{
  "access_token": "ya29.a0AfH6SMBx...",
  "expires_in": 3600,
  "refresh_token": "1//0gOE3wv...",
  "scope": "https://www.googleapis.com/auth/business.manage",
  "token_type": "Bearer"
}
```

### Step 3: Token Refresh

When `access_token` expires (after 1 hour):

```
POST https://oauth2.googleapis.com/token
Content-Type: application/x-www-form-urlencoded

refresh_token=YOUR_REFRESH_TOKEN&
client_id=YOUR_CLIENT_ID&
client_secret=YOUR_CLIENT_SECRET&
grant_type=refresh_token
```

**Response:**
```json
{
  "access_token": "ya29.a0AfH6SMBx...",
  "expires_in": 3600,
  "scope": "https://www.googleapis.com/auth/business.manage",
  "token_type": "Bearer"
}
```

---

## Edge Functions Implementation

### sync-google-reviews

**Location:** `supabase/functions/sync-google-reviews/index.ts`

**Purpose:** Fetch reviews from Google and sync to local database

**Flow:**
1. Receive `locationId` from frontend
2. Fetch Google credentials from database
3. Check token expiration, refresh if needed
4. Call Google API to list reviews
5. Convert star ratings (ONE/TWO/THREE/FOUR/FIVE → 1/2/3/4/5)
6. Upsert reviews to `google_reviews` table
7. Update sync status in `google_business_credentials`

**Deploy:**
```bash
supabase functions deploy sync-google-reviews
```

### reply-google-review

**Location:** `supabase/functions/reply-google-review/index.ts`

**Purpose:** Post reply to Google review

**Flow:**
1. Receive `reviewId`, `replyText`, `locationId` from frontend
2. Fetch Google credentials from database
3. Get review's `google_review_id`
4. Call Google API to post reply
5. Update local database with reply details

**Deploy:**
```bash
supabase functions deploy reply-google-review
```

---

## Error Handling

### Common HTTP Status Codes

| Code | Error | Meaning | Solution |
|------|-------|---------|----------|
| 400 | Bad Request | Invalid request format | Check request body and parameters |
| 401 | Unauthorized | Invalid or expired token | Refresh access token |
| 403 | Forbidden | No access to resource | Verify account has permission for location |
| 404 | Not Found | Resource doesn't exist | Verify account ID, location ID, or review ID |
| 429 | Too Many Requests | Rate limit exceeded | Implement exponential backoff |
| 500 | Internal Server Error | Google API error | Retry with backoff, contact Google if persists |

### Error Response Format

```json
{
  "error": {
    "code": 403,
    "message": "The caller does not have permission",
    "status": "PERMISSION_DENIED"
  }
}
```

### Retry Strategy

Implement exponential backoff for transient errors:

```typescript
async function retryWithBackoff(fn: () => Promise<Response>, maxRetries = 3) {
  let retries = 0;
  while (retries < maxRetries) {
    try {
      const response = await fn();
      if (response.ok) return response;

      // Retry on 5xx errors
      if (response.status >= 500 && response.status < 600) {
        retries++;
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retries)));
        continue;
      }

      return response;
    } catch (error) {
      retries++;
      if (retries >= maxRetries) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retries)));
    }
  }
  throw new Error("Max retries exceeded");
}
```

---

## Rate Limits

**Daily Quota:**
- Queries Per Day: 10,000 requests

**Per-user Quota:**
- Queries Per 100 Seconds: 1,000 requests

**Best Practices:**
1. Cache review data locally
2. Sync reviews every 6-12 hours (not more frequently)
3. Use batch operations when fetching multiple locations
4. Implement rate limit detection and backoff

---

## Testing

### Test with API Explorer

Use Google's API Explorer to test endpoints:
https://developers.google.com/my-business/reference/rest/v4/accounts.locations.reviews/list

### Test Accounts

During development, add test users in Google Cloud Console:
1. Go to "OAuth consent screen"
2. Scroll to "Test users"
3. Add Google accounts that should have access
4. Only test users can authorize during testing phase

### Local Testing

```bash
# Test sync function locally
supabase functions serve sync-google-reviews

# Call locally
curl -X POST http://localhost:54321/functions/v1/sync-google-reviews \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{"locationId": "your-location-uuid"}'
```

---

## Security Checklist

- [x] Store tokens encrypted in database (use pgcrypto)
- [x] Never expose tokens in API responses
- [x] Use service role key only in Edge Functions
- [x] Implement RLS policies for multi-tenant isolation
- [x] Validate reply text length before sending to Google
- [x] Check token expiration before API calls
- [x] Implement proper error handling
- [x] Log security events (failed auth, permission denied, etc.)

---

## References

- [Google My Business API Overview](https://developers.google.com/my-business)
- [Review Data Guide](https://developers.google.com/my-business/content/review-data)
- [API Reference - Reviews](https://developers.google.com/my-business/reference/rest/v4/accounts.locations.reviews)
- [OAuth 2.0 Setup](https://developers.google.com/my-business/content/basic-setup)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)

---

## Migration Notes

**From v4 to Future APIs:**

Google is deprecating certain v4 endpoints. Monitor:
- [Deprecation Schedule](https://developers.google.com/my-business/content/sunset-dates)

**Current Status (2025-10-11):**
- ✅ Reviews endpoints are **ACTIVE** and not deprecated
- ⚠️ `reportInsights` (analytics) is being migrated to Performance API
- ✅ Continue using v4 for reviews management

If Google announces deprecation of reviews endpoints, migrate to the replacement API as documented by Google.
