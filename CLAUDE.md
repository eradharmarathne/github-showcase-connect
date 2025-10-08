# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

CheckingCheckout is a multi-tenant SaaS hospitality ERP system for hotels and guesthouses. Built with React 18, TypeScript, Vite, Supabase (PostgreSQL), and TailwindCSS.

## Development Commands

### Core Development
```bash
bun dev              # Start development server (port 8080)
bun build            # Production build
bun build:dev        # Development build with source maps
bun preview          # Preview production build
```

### Code Quality
```bash
bun lint             # Lint with Biome (auto-fix)
bun format           # Format with Biome
bun check            # Run all Biome checks
```

**Note:** This project uses Biome, not ESLint/Prettier. Biome config enforces tab indentation and double quotes.

### Supabase Operations
```bash
supabase start                                    # Start local Supabase instance
supabase stop                                     # Stop local instance
supabase db push                                  # Push schema changes
supabase functions deploy                         # Deploy all Edge Functions
supabase functions deploy <function-name>         # Deploy specific function
supabase gen types typescript --local             # Generate TypeScript types from schema
```

**CRITICAL:** Always use Rube Supabase MCP for database schema changes, migrations, Edge Function deployment, and Supabase configuration. Never make direct changes without using Rube MCP workflow:
1. `RUBE_SEARCH_TOOLS` to find appropriate tools
2. `RUBE_CREATE_PLAN` to plan changes
3. `RUBE_MULTI_EXECUTE_TOOL` or `RUBE_REMOTE_WORKBENCH` to execute

### Type Generation Workflow
After any schema changes:
```bash
# Generate types and update src/integrations/supabase/types.ts
npx supabase gen types typescript --project-id "$PROJECT_REF" --schema public > database.types.ts
```

## Architecture Overview

### Multi-Tenant Architecture

**Complete Tenant Isolation:**
- Every table includes `tenant_id` for data separation at the database level
- Row Level Security (RLS) policies enforce tenant boundaries
- Context providers manage tenant/location state globally
- All queries MUST filter by `tenant_id` (and `location_id` where applicable)

**Hierarchy:** `Tenants → Locations → Rooms/Reservations/Income/Expenses`

### Auth & State Management Flow

1. **AuthContext** (`src/context/AuthContext.tsx`)
   - Manages Supabase auth session, user, profile, tenant, subscription
   - Provides: `user`, `profile`, `tenant`, `subscription`, `isOwner`, `hasActiveTrial`, `hasActiveSubscription`
   - Auto-creates profile on sign-in
   - Fetches tenant and subscription data when profile has `tenant_id`

2. **LocationContext** (`src/context/LocationContext.tsx`)
   - Manages selected location within current tenant
   - Auto-selects first available location
   - Components must use `selectedLocation` to filter queries
   - Provides: `selectedLocation`, `setSelectedLocation`, `locations`, `getSelectedLocationData()`

3. **Permission System** (`src/hooks/usePermissions.tsx`)
   - Granular boolean permissions stored in `user_permissions` table
   - **Tenant Owner Bypass:** Users where `profile.id === tenant.owner_profile_id` bypass ALL permission checks
   - Permissions: `access_dashboard`, `access_income`, `access_expenses`, `access_reports`, `access_calendar`, `access_bookings`, `access_rooms`, `access_master_files`, `access_accounts`, `access_users`, `access_settings`, `access_booking_channels`
   - Use `hasAnyPermission(['access_feature'])` or `hasPermission('access_feature')`

### Routing Pattern

**ALL protected routes follow this pattern:**
```tsx
<Route path="/page" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
  <Route index element={
    <PermissionRoute permission={["access_feature"]}>
      <Component />
    </PermissionRoute>
  } />
</Route>
```

**Components:**
- `ProtectedRoute`: Checks authentication, redirects to `/` if not logged in
- `PermissionRoute`: Checks permissions, shows access denied if insufficient
- `SmartRedirect`: Routes users to first accessible page based on permissions
- `Layout`: Contains `AppSidebar` with navigation, location switcher, user menu

**CRITICAL:** Always wrap routes with BOTH `ProtectedRoute` AND `PermissionRoute` (except public routes like `/auth`, `/onboarding`, `/billing`).

### Data Fetching Pattern

Use TanStack Query with Supabase, always filtering by tenant/location:
```tsx
const { data } = useQuery({
  queryKey: ['reservations', locationId, tenant?.id],
  queryFn: async () => {
    const { data, error } = await supabase
      .from('reservations')
      .select(`
        *,
        rooms(room_number, room_type),
        locations(name),
        guides(name),
        agents(name)
      `)
      .eq('tenant_id', tenant.id)           // REQUIRED: tenant filter
      .eq('location_id', locationId);       // REQUIRED: location filter

    if (error) throw error;
    return data;
  }
});
```

**Always include:**
- `tenant_id` filter (from `useAuth()`)
- `location_id` filter (from `useLocationContext()`)
- Proper error handling
- Related data via Supabase joins

### Supabase Client Singleton

`src/integrations/supabase/client.ts` uses singleton pattern with HMR support:
- Single client instance persists across component updates
- Custom storage key: `cco-supabase-auth`
- PKCE flow for enhanced security
- Auto-refresh tokens enabled
- `createAdminClient()` for Edge Functions only (never in frontend)

### Database Schema Essentials

**Core Tables:**
- `tenants` - Organization management, trial tracking, subscription status
- `profiles` - User accounts linked to tenants via `tenant_id`
- `user_permissions` - Per-user granular permission matrix
- `locations` - Properties within a tenant
- `rooms` - Inventory with pricing
- `reservations` - Complete booking lifecycle
- `income` / `expenses` - Financial transactions
- `accounts` - Account balances (chart of accounts)
- `external_bookings` - Channel manager integration
- `beds24_property_mappings` - Property mapping for channel manager

**Key Enums:**
- `currency_type`: `LKR`, `USD`, `EUR`, `GBP`
- `reservation_status`: `tentative`, `confirmed`, `checked_in`, `checked_out`, `cancelled`
- `booking_source`: `direct`, `airbnb`, `booking_com`, `beds24`, `manual`, etc.
- `tenant_role`: `tenant_admin`, `tenant_billing`, `tenant_manager`, `tenant_staff`

**RPC Functions:**
- `get_user_permissions` - Returns permission matrix for current user
- `generate_reservation_number` - Auto-increment booking references
- `accept_invitation` - User onboarding workflow
- `is_email_allowed` - Tenant access control

### Edge Functions

Located in `supabase/functions/`:
- `fetch-beds24-bookings` - Channel manager API sync
- `beds24-token-exchange` - OAuth token management
- `setup-beds24-integration` - Initial Beds24 configuration
- `send-sms-notification` - SMS alerts via Hutch API
- `send-phone-otp` / `verify-phone-otp` - Phone verification
- `booking-reminders` - Automated guest communication
- `sync-ical` / `scheduled-calendar-sync` - External calendar sync
- `send-user-credentials` - User credential email
- `handle-creem-webhook` - SaaS billing webhooks
- `clear-bookings` - Booking cleanup operations

## Critical Implementation Notes

### MCP Tool Usage

**MANDATORY - Context7 Documentation:**
Always check Context7 for third-party library documentation before implementing features:
```bash
mcp_context7_resolve-library-id    # Find library documentation
mcp_context7_get-library-docs      # Get specific docs
```
Required for: Supabase, React, TypeScript, TailwindCSS, TanStack Query, React Router, shadcn/ui, and all external libraries.

### Location-Aware Components

All components displaying data MUST:
1. Get `selectedLocation` from `useLocationContext()`
2. Filter queries by both `tenant_id` AND `location_id`
3. Respect location switching (refetch when location changes)

### Onboarding Flow

Users without `tenant_id` or with incomplete tenant onboarding are redirected to `/onboarding`:
```tsx
// Check in SmartRedirect component
if (!profile?.tenant_id || !tenant || !tenant.onboarding_completed) {
  return <Navigate to="/onboarding" replace />;
}
```

### Subscription Management

- SaaS billing via Creem integration (`src/lib/creem.ts`)
- Trial period tracking: `tenant.trial_ends_at`
- Subscription status: `subscription.status` (`active` | `trialing`)
- Access control: Check `hasActiveTrial` or `hasActiveSubscription` from `useAuth()`

### File Conventions

- TypeScript throughout with strict types from Supabase
- PascalCase for React components: `UserProfile.tsx`
- camelCase for functions/variables: `fetchUserData`, `userName`
- kebab-case for directories: `user-profile/`
- Absolute imports with `@/` prefix (configured in `vite.config.ts` and `tsconfig.json`)
- Database types auto-generated - NEVER edit `src/integrations/supabase/types.ts` manually

### Common Patterns

**Permission Checking:**
```tsx
const { hasAnyPermission, hasPermission, isTenantOwner } = usePermissions();
if (!hasAnyPermission(['access_income'])) {
  // Show access denied or return null
}
```

**Currency Handling:**
Use enum values: `LKR`, `USD`, `EUR`, `GBP` (from database)

**Toast Notifications:**
```tsx
import { toast } from 'sonner';
toast.success('Operation completed');
toast.error('Operation failed');
```

**Loading States:**
Use skeleton components from `src/components/skeleton/` for consistent loading UX.

## Integration Points

**Booking Channels:**
- Beds24 integration via Edge Functions
- iCal sync for external calendars
- Store raw booking data in `external_bookings` table

**Communication:**
- Email: Resend API via Edge Functions
- SMS: Hutch API via Edge Functions
- Multi-language support via i18next

**Payments:**
- Multiple payment methods tracked in `booking_payments`
- Commission tracking per agent/channel
- Multi-currency support with `currency_rates` table

## Environment Variables

Required in `.env.local`:
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_SUPABASE_SERVICE_ROLE_KEY=your_service_role_key  # For Edge Functions only
```

## Component Structure

- Pages: `/src/pages/` - Route components (28 pages)
- Components: `/src/components/` - Reusable UI components
- UI Components: `/src/components/ui/` - shadcn/ui components
- Contexts: `/src/context/` - Global state providers (Auth, Location, Theme)
- Hooks: `/src/hooks/` - Custom React hooks
- Lib: `/src/lib/` - Utility functions and helpers
- Integrations: `/src/integrations/supabase/` - Supabase client and types

**Domain-Specific Components:**
- `components/master-files/` - Agents, Commissions, Guides, Locations, Rooms
- `components/reports/` - Financial reports and analytics
- `components/reservation/` - Booking management components
- `components/calendar/` - Calendar and timeline views
- `components/settings/` - Settings management
- `components/users/` - User management
- `components/skeleton/` - Loading skeletons
