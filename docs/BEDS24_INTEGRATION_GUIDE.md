# Beds24 Integration Guide

## 📋 Overview

The Beds24 integration in CheckingCheckout allows you to automatically sync bookings from Beds24 (a channel manager and property management system) into your CheckingCheckout system. This enables centralized management of bookings from multiple channels like Booking.com, Airbnb, and direct bookings.

## 🏗️ Architecture

### High-Level Flow
```
Beds24 API (v2) 
    ↓
Supabase Edge Functions (Token Management & Sync)
    ↓
PostgreSQL Database (external_bookings table)
    ↓
React Frontend (Booking Channels Integration Page)
```

### Components

#### 1. **Database Tables**

**`external_bookings`** - Stores synced bookings from external channels
```typescript
{
  id: string (UUID)
  external_id: string               // Unique booking ID from Beds24
  property_id: string                // Beds24 property ID
  source: string                     // Channel source (airbnb, booking_com, direct, etc.)
  guest_name: string                 // Guest's full name
  check_in: string (date)            // Check-in date
  check_out: string (date)           // Check-out date
  status: string                     // Booking status
  total_amount: number               // Total booking price
  currency: string                   // Currency code (USD, LKR, etc.)
  adults: number                     // Number of adults
  children: number                   // Number of children
  room_name: string                  // Room name from Beds24
  room_id: string (UUID, nullable)   // Mapped to internal rooms table
  location_id: string (UUID)         // Linked to locations table
  tenant_id: string (UUID)           // Tenant isolation
  raw_data: JSON                     // Full booking data from Beds24 API
  last_synced_at: string (timestamp) // Last sync timestamp
}
```

**Unique Constraint**: `(external_id, property_id, source)` - Prevents duplicate bookings

**`channel_property_mappings`** - Maps Beds24 properties to your locations
```typescript
{
  id: string (UUID)
  tenant_id: string (UUID)           // Your tenant
  location_id: string (UUID)         // Your CheckingCheckout location
  channel_property_name: string      // Beds24 property name
  channel_type: string               // Always "beds24"
  mapping_type: string               // Default "beds24"
  is_active: boolean                 // Enable/disable mapping
}
```

**`booking_sync_urls`** - Optional iCal sync URLs for direct calendar integration
```typescript
{
  id: string (UUID)
  tenant_id: string (UUID)
  location_id: string (UUID)
  room_id: string (UUID, nullable)
  ical_url: string                   // iCal calendar URL
  source: string                     // booking_com, airbnb, etc.
  is_active: boolean
  last_synced_at: string (timestamp)
}
```

#### 2. **Edge Functions**

Located in `/supabase/functions/`:

**`beds24-token-exchange`** - Initial setup
- **Purpose**: Exchange Beds24 invite code for refresh token
- **Endpoint**: `beds24.com/api/v2/authentication/setup`
- **Input**: `{ inviteCode: string }`
- **Output**: `{ refreshToken, token, expiresIn }`
- **Usage**: One-time setup to get credentials

**`fetch-beds24-bookings`** - Main sync function
- **Purpose**: Fetch and sync all bookings from Beds24 API
- **Endpoint**: `beds24.com/api/v2/bookings`
- **Input**: `{ tenant_id: string }`
- **Process**:
  1. Refresh access token if expired (using refresh token)
  2. Fetch all bookings from Beds24 API v2
  3. Match bookings to locations via `channel_property_mappings`
  4. Upsert bookings into `external_bookings` table
  5. Return sync statistics
- **Auto-sync**: Runs every hour automatically
- **Manual sync**: Triggered by "Sync Now" button

**`setup-beds24-integration`** - Helper for setup
- **Purpose**: Automated initial setup with hardcoded invite code
- **Usage**: Development/testing only

**Token Management Flow**:
```
1. Get invite code from Beds24 dashboard
2. Exchange invite code → refresh_token (valid indefinitely)
3. Use refresh_token → access_token (valid ~1 hour)
4. Access_token used for API requests
5. Auto-refresh when expired
```

#### 3. **Frontend Components**

**`/src/pages/booking-channels-integration.tsx`** - Main UI (1600+ lines)

**Key Features**:
- **Stats Dashboard**: Total bookings, last sync time, source/status breakdown
- **Bookings List**: Searchable, filterable table of external bookings
- **Property Mappings**: Configure which Beds24 properties map to which locations
- **iCal Sync URLs**: Add external calendar URLs for direct sync
- **Manual Sync**: Force immediate sync with Beds24 API
- **Booking Details Modal**: View full raw data from Beds24

**Main Sections**:
1. **Overview Tab** - Stats cards and recent bookings
2. **Bookings Tab** - Full booking list with filtering
3. **Settings Tab** - Property mappings and iCal URLs
4. **API Setup** - Token configuration

## 🔧 Setup Process

### Step 1: Get Beds24 API Access

1. Log in to your Beds24 account
2. Go to **Settings → API & Webhooks**
3. Generate an **Invite Code** for API v2 access
4. Copy the invite code (long encrypted string)

### Step 2: Exchange Invite Code for Refresh Token

**Option A: Via Edge Function**
```bash
# Call the token exchange function
curl -X POST https://your-project.supabase.co/functions/v1/beds24-token-exchange \
  -H "Content-Type: application/json" \
  -d '{"inviteCode": "YOUR_INVITE_CODE_HERE"}'
```

**Option B: Via Booking Channels Integration Page**
1. Navigate to **Booking Channels Integration** page
2. Click **Setup API** in the API Configuration section
3. Paste your invite code
4. Click **Exchange Token**

**Response Example**:
```json
{
  "success": true,
  "data": {
    "refreshToken": "eyJhbGc...",  // Save this!
    "token": "abc123...",           // Access token (temporary)
    "expiresIn": 3600               // Token validity in seconds
  }
}
```

### Step 3: Configure Supabase Secrets

1. Go to **Supabase Dashboard → Project Settings → Edge Functions → Secrets**
2. Add new secret:
   - **Name**: `BEDS24_REFRESH_TOKEN`
   - **Value**: The `refreshToken` from Step 2

### Step 4: Map Beds24 Properties to Locations

In the **Booking Channels Integration** page:

1. Select your **location** from the dropdown
2. Go to **Settings** tab
3. Under "Beds24 Property Mappings":
   - Enter the **exact property name** from Beds24
   - Click **Add Property Mapping**
4. Repeat for each property/location

**Example**:
- Beds24 Property: "Rusty Lake Hotel - Room 101"
- CheckingCheckout Location: "Rusty Lake Kandy"

### Step 5: Test the Integration

1. Go to **Overview** tab
2. Click **Sync Now** button
3. Check console logs for sync status
4. Bookings should appear in the list within seconds

## 🔄 How Synchronization Works

### Automatic Sync (Every Hour)
```typescript
// In booking-channels-integration.tsx
useEffect(() => {
  // Initial fetch
  fetchData();
  
  // Auto-sync every hour
  const interval = setInterval(() => {
    syncChannelData();
  }, 60 * 60 * 1000); // 1 hour
  
  return () => clearInterval(interval);
}, [selectedLocation, tenant?.id]);
```

### Manual Sync
```typescript
const syncChannelData = async () => {
  const response = await supabase.functions.invoke("fetch-beds24-bookings", {
    body: { tenant_id: tenant.id }
  });
  
  // Refresh data after successful sync
  if (response.data?.success) {
    fetchData();
  }
};
```

### Sync Logic (in Edge Function)

```typescript
// 1. Refresh access token if needed
if (!ACCESS_TOKEN || Date.now() > EXPIRES_AT) {
  await refreshAccessToken();
}

// 2. Fetch bookings from Beds24
const bookings = await beds24Request("/bookings");

// 3. Process each booking
for (const booking of bookings) {
  // Extract booking data
  const externalId = booking.id;
  const propertyId = booking.propertyId || booking.propId;
  
  // Find location mapping
  const locationMapping = await findPropertyMapping(propertyId);
  
  if (!locationMapping) {
    console.warn(`No mapping for property ${propertyId}`);
    continue;
  }
  
  // Map booking source
  const source = mapSource(booking); // airbnb, booking_com, etc.
  
  // Prepare booking data
  const externalBookingData = {
    external_id: externalId,
    property_id: propertyId,
    source: source,
    guest_name: booking.guestName || "Unknown Guest",
    check_in: booking.arrival,
    check_out: booking.departure,
    status: booking.status,
    total_amount: booking.totalAmount,
    currency: "USD",
    location_id: locationMapping.location_id,
    tenant_id: locationMapping.tenant_id,
    room_name: booking.roomName,
    adults: booking.numAdult || 1,
    children: booking.numChild || 0,
    raw_data: booking, // Store full JSON
    last_synced_at: new Date().toISOString()
  };
  
  // Upsert (insert or update)
  await supabase
    .from("external_bookings")
    .upsert(externalBookingData, {
      onConflict: "external_id,property_id,source"
    });
}
```

### Source Mapping
Beds24 API provides source IDs that map to channels:
```typescript
const mapSource = (booking: V2Booking): string => {
  // Check string sources first
  if (booking.source) return booking.source.toLowerCase();
  if (booking.sourceName) return booking.sourceName.toLowerCase();
  
  // Fallback to API source ID
  switch (booking.apiSourceId) {
    case 1: return "direct";
    case 2: return "airbnb";
    case 3: return "booking_com";
    default: return "beds24";
  }
};
```

## 📊 Data Flow Example

### Scenario: Airbnb Booking Sync

1. **Guest books on Airbnb** → Booking appears in Beds24
2. **Beds24 stores booking** with:
   - Booking ID: `12345678`
   - Property ID: `609309` (your Beds24 property)
   - Source: `airbnb` (apiSourceId: 2)
   - Guest: "John Doe"
   - Check-in: "2025-10-25"
   - Check-out: "2025-10-27"
   - Price: $150
   - Commission: $30 (Airbnb host fee)

3. **CheckingCheckout Edge Function runs** (auto or manual):
   - Calls `GET beds24.com/api/v2/bookings`
   - Receives booking data
   - Looks up property mapping: `609309` → "Rusty Lake Kandy" location

4. **Database upsert**:
```sql
INSERT INTO external_bookings (
  external_id, property_id, source, guest_name, 
  check_in, check_out, total_amount, currency,
  location_id, tenant_id, raw_data, last_synced_at
) VALUES (
  '12345678', '609309', 'airbnb', 'John Doe',
  '2025-10-25', '2025-10-27', 150, 'USD',
  'location-uuid', 'tenant-uuid', 
  '{"full":"json","data":"..."}', 
  NOW()
)
ON CONFLICT (external_id, property_id, source) 
DO UPDATE SET 
  guest_name = EXCLUDED.guest_name,
  check_in = EXCLUDED.check_in,
  -- ... other fields
  last_synced_at = NOW();
```

5. **Frontend displays** in Booking Channels Integration:
   - Badge: "Airbnb" (pink color)
   - Guest: "John Doe"
   - Dates: "Oct 25 - Oct 27"
   - Status: "Confirmed"
   - Amount: "$150 USD"
   - Commission info: "Host Fee: $30 / Payout: $120"

## 🎨 Frontend Features

### Stats Cards
```typescript
// Calculated from bookings array
const syncStats = {
  totalBookings: 45,              // All synced bookings
  recentSync: "2025-10-20 14:30", // Last successful sync
  sourceBreakdown: {              // Bookings per channel
    airbnb: 20,
    booking_com: 15,
    direct: 10
  },
  statusBreakdown: {              // Bookings per status
    confirmed: 30,
    checked_in: 10,
    checked_out: 5
  }
};
```

### Filtering & Search
- **Search**: Guest name, external ID, room name
- **Filter by Source**: Airbnb, Booking.com, Direct, etc.
- **Filter by Status**: Confirmed, Checked In, Checked Out, Cancelled
- **Filter by Date Range**: Check-in/check-out dates

### Color Coding
```typescript
const getSourceColor = (source: string) => {
  switch (source.toLowerCase()) {
    case "airbnb": return "bg-pink-100 text-pink-800";
    case "booking_com": return "bg-blue-100 text-blue-800";
    case "direct": return "bg-green-100 text-green-800";
    case "expedia": return "bg-yellow-100 text-yellow-800";
    default: return "bg-purple-100 text-purple-800";
  }
};
```

### Payment Information Display
For Airbnb bookings, shows commission breakdown:
```typescript
const paymentInfo = {
  type: "airbnb",
  basePrice: 150,      // Total booking price
  hostFee: 30,         // Airbnb's commission
  payout: 120          // What you receive
};
```

## 🔐 Security Considerations

### Token Storage
- **Refresh Token**: Stored in Supabase Secrets (server-side only)
- **Access Token**: Kept in memory in Edge Function (never exposed to client)
- **Token Rotation**: Access tokens auto-refresh every hour

### Row Level Security (RLS)
All database queries filtered by `tenant_id`:
```sql
-- RLS Policy Example
CREATE POLICY "Users can view their tenant's bookings"
ON external_bookings FOR SELECT
USING (tenant_id = auth.uid_tenant_id());
```

### API Security
- Edge Functions require Supabase authentication
- No API keys exposed to frontend
- All Beds24 requests server-side only

## 🐛 Troubleshooting

### Issue: "No bookings syncing"

**Check**:
1. Property mappings configured? (`channel_property_mappings` table)
2. Refresh token valid? (Check Supabase secrets)
3. Beds24 property IDs match exactly?
4. Check Edge Function logs in Supabase Dashboard

**Debug**:
```bash
# View Edge Function logs
# Supabase Dashboard → Edge Functions → fetch-beds24-bookings → Logs

# Look for:
# ✅ "Successfully synced X bookings"
# ⚠️ "No mapping found for property ID: X"
# ❌ "Token refresh failed"
```

### Issue: "Token refresh failed"

**Cause**: Invalid or expired refresh token

**Solution**:
1. Generate new invite code from Beds24
2. Re-run token exchange
3. Update `BEDS24_REFRESH_TOKEN` secret

### Issue: "Bookings not showing in UI"

**Check**:
1. Location selected in dropdown?
2. Bookings filtered correctly?
3. Database query includes `tenant_id` filter?

**Debug**:
```typescript
// In browser console
console.log("Selected Location:", selectedLocation);
console.log("Bookings:", bookings);
console.log("Filters:", { sourceFilter, statusFilter });
```

### Issue: "Property mapping not working"

**Verify**:
```sql
-- Check mappings
SELECT * FROM channel_property_mappings 
WHERE tenant_id = 'your-tenant-id' 
AND is_active = true;

-- Check if property names match exactly
SELECT DISTINCT property_id, property_name 
FROM external_bookings 
WHERE tenant_id = 'your-tenant-id';
```

**Common Mistake**: Property names are case-sensitive and must match exactly

## 📈 Usage Statistics

### Viewing Sync History
```typescript
// Last sync timestamp
const lastSync = syncStats.recentSync; // "Oct 20, 14:30"

// Sync frequency
const syncInterval = 60 * 60 * 1000; // 1 hour (configurable)

// Total synced bookings
const totalBookings = syncStats.totalBookings;
```

### Source Analytics
```typescript
// Bookings per channel
const sourceBreakdown = {
  airbnb: 45,        // 45% market share
  booking_com: 30,   // 30% market share
  direct: 20,        // 20% market share
  expedia: 5         // 5% market share
};
```

## 🔗 Additional Integrations

### iCal Sync (Alternative to Beds24 API)
For platforms that don't have Beds24 integration:

1. Get iCal URL from booking platform (e.g., VRBO, Homeaway)
2. Add to **Settings → iCal Sync URLs**
3. Select location and room
4. Choose source (dropdown)
5. Click **Add Sync URL**

**Edge Function**: `sync-ical` parses iCal format and creates bookings

### Multi-Channel Support
Currently supports:
- ✅ Beds24 (via API)
- ✅ Booking.com (via iCal or Beds24)
- ✅ Airbnb (via iCal or Beds24)
- ✅ Expedia (via iCal or Beds24)
- ✅ Custom iCal URLs

## 🚀 Future Enhancements

### Planned Features
1. **Two-way sync**: Update Beds24 from CheckingCheckout
2. **Rate management**: Sync pricing changes
3. **Availability sync**: Push room availability to Beds24
4. **Webhook support**: Real-time booking notifications
5. **Advanced mapping**: Room-level property mapping
6. **Conflict resolution**: Handle double bookings automatically
7. **Commission tracking**: Auto-calculate channel commissions
8. **Performance metrics**: Booking conversion analytics

## 📚 Related Documentation

- [Beds24 API v2 Documentation](https://beds24.com/api/v2)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [CheckingCheckout Multi-Tenancy Guide](./CLAUDE.md#multi-tenant-architecture)
- [Database Schema](./DATABASE_SCHEMA.md)

## 💡 Best Practices

### 1. Property Naming
Use consistent property names:
- ❌ "Rusty Lake Hotel Room 101"
- ✅ "Rusty Lake Hotel - Room 101"

### 2. Sync Frequency
- **Production**: 1 hour (default)
- **Development**: 5-10 minutes (for testing)
- **Manual sync**: Use sparingly (API rate limits)

### 3. Data Retention
- Keep `raw_data` field for audit trail
- Archive old bookings (>1 year) to separate table
- Regular backups of `external_bookings` table

### 4. Error Handling
- Log all sync errors to database
- Send notifications for failed syncs (>3 consecutive failures)
- Implement retry logic with exponential backoff

### 5. Testing
- Test with sandbox Beds24 account first
- Verify property mappings before going live
- Monitor sync logs for first 24 hours

## 🎯 Summary

The Beds24 integration provides seamless synchronization of bookings from multiple channels into your CheckingCheckout system. It uses:

- **Beds24 API v2** for reliable booking data
- **Supabase Edge Functions** for secure server-side processing
- **PostgreSQL database** for efficient storage
- **React frontend** for intuitive management
- **Auto-sync mechanism** for hands-off operation

With proper setup and configuration, your team can manage all bookings from a single dashboard, regardless of which channel they originated from.
