# Copilot Instructions

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

## Core Architecture

- **Frontend**: React 18 + TypeScript + Vite + TailwindCSS + shadcn/ui
- **Backend**: Supabase (PostgreSQL database, Auth, Edge Functions)
- **State**: Context API for auth/location, TanStack Query for data fetching
- **Routing**: React Router v7 with nested protected routes
- **Multi-tenancy**: Complete tenant isolation with `tenant_id` foreign keys
- **Code Quality**: Biome for linting and formatting (replaces ESLint/Prettier)

## Multi-Tenant Architecture Overview

### Complete Tenant Isolation
**Hierarchy:** `Tenants → Locations → Rooms/Reservations/Income/Expenses`

- Every table includes `tenant_id` for data separation at the database level
- Row Level Security (RLS) policies enforce tenant boundaries
- Context providers manage tenant/location state globally
- All queries MUST filter by `tenant_id` (and `location_id` where applicable)

### Core Entity Relationships
- **Tenants** → **Locations** → **Rooms** → **Reservations**
- **Profiles** (users) → **User_permissions** (per location/tenant)
- **Income/Expenses** → **Accounts** (financial tracking)
- **External_bookings** + **Beds24_property_mappings** (channel integration)

### Auth & State Management Flow

1. **AuthContext** (`src/context/auth-context.tsx`)
   - Manages Supabase auth session, user, profile, tenant, subscription
   - Provides: `user`, `profile`, `tenant`, `subscription`, `isOwner`, `hasActiveTrial`, `hasActiveSubscription`
   - Auto-creates profile on sign-in
   - Fetches tenant and subscription data when profile has `tenant_id`

2. **LocationContext** (`src/context/location-context.tsx`)
   - Manages selected location within current tenant
   - Auto-selects first available location
   - Components must use `selectedLocation` to filter queries
   - Provides: `selectedLocation`, `setSelectedLocation`, `locations`, `getSelectedLocationData()`

3. **Permission System** (`src/hooks/use-permissions.tsx`)
   - Granular boolean permissions stored in `user_permissions` table
   - **Tenant Owner Bypass:** Users where `profile.id === tenant.owner_profile_id` bypass ALL permission checks
   - Permissions: `access_dashboard`, `access_income`, `access_expenses`, `access_reports`, `access_calendar`, `access_bookings`, `access_rooms`, `access_master_files`, `access_accounts`, `access_users`, `access_settings`, `access_booking_channels`
   - Use `hasAnyPermission(['access_feature'])` or `hasPermission('access_feature')`

### Routing Patterns
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

### Pages Structure
Current pages in `/src/pages/`:
- **Auth Flow**: Auth, ForgotPassword, ResetPassword, Onboarding
- **Core**: Dashboard, Calendar, EnhancedCalendar
- **Reservations**: Reservations, ReservationDetails, ReservationForm, ReservationFormCompact, BookingForm
- **Financial**: Income, Expense, Accounts, PaymentForm
- **Reports**: Reports, FinancialReports
- **Configuration**: MasterFiles, RoomManagement, Settings, Users
- **Integration**: BookingChannelsIntegration
- **Billing**: BillingSubscription, BillingSuccess, BillingError
- **Utility**: AccessDenied, NotFound

### Component Organization
- **Pages**: In `/src/pages/` for route components (28 pages including Auth, Dashboard, Reservations, etc.)
- **Components**: Shared UI in `/src/components/`, domain-specific in subfolders
  - **master-files/**: AgentsTab, CommissionsTab, GuidesTab, LocationsTab, RoomsTab
  - **reports/**: AccountsReports, CommissionReports, ComprehensiveReports, DetailedBalanceSheet, EnhancedFinancialReports
- **UI Components**: shadcn/ui components in `/src/components/ui/`
- **Layout**: Uses `AppSidebar` component with `NavMain`, `NavUser`, `NavProjects`, and `LocationSwitcher` (location-switcher)
- **Contexts**: Auth and Location management
- **Hooks**: Custom hooks like `usePermissions`, `useProfile`, `useTenant`

## Supabase Integration

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
Located in `/supabase/functions/`:
- `fetch-beds24-bookings`: Channel manager API sync
- `beds24-token-exchange`: Beds24 OAuth token management
- `setup-beds24-integration`: Initial Beds24 setup and configuration
- `send-sms-notification`: Payment/booking SMS alerts via Hutch API
- `send-phone-otp` / `verify-phone-otp`: Phone verification workflow
- `booking-reminders`: Automated guest communication
- `sync-ical` / `scheduled-calendar-sync`: External calendar synchronization
- `send-user-credentials`: User credential management
- `handle-polar-webhook`: Polar.sh billing webhooks
- `create-polar-checkout`: Create Polar.sh checkout sessions
- `clear-bookings`: Booking cleanup operations

## Development Workflow

### Key Commands
- `bun dev` - Start development server
- `bun build` - Production build
- `bun build:dev` - Development build
- `bun lint` - Run Biome linting
- `bun format` - Format code with Biome
- `bun check` - Run Biome checks and auto-fix
- `bun preview` - Preview production build

### State Management
- Auth state: `AuthContext` + `useAuth()`
- Location switching: `LocationContext` + `useLocationContext()`
- Data fetching: TanStack Query with Supabase

### Common Patterns

#### Permission Checking
```tsx
const { hasAnyPermission, hasPermission, isTenantOwner } = usePermissions();
if (!hasAnyPermission(["access_income"])) return <AccessDenied />;
// Tenant owners bypass all permission checks via tenant owner relationship
```

#### Data Fetching with Multi-Tenancy
```tsx
const { data, loading } = useQuery({
  queryKey: ['reservations', locationId, tenant?.id],
  queryFn: () => supabase
    .from('reservations')
    .select(`
      *,
      rooms(room_number, room_type),
      locations(name),
      guides(name),
      agents(name)
    `)
    .eq('tenant_id', tenant.id)
    .eq('location_id', locationId)
});
```

#### Location-Aware Components
Always filter data by selected location using `useLocationContext()`.
Components should respect the currently selected location and filter all queries accordingly.

## Integration Points

### External Booking Channels
- Beds24 integration via Edge Functions
- iCal sync for calendar management
- External bookings stored separately from internal reservations

### SMS Notifications
- Hutch SMS API integration for payment/booking alerts
- Token-based authentication with automatic renewal
- Configurable message templates

### Subscription Management
- SaaS billing via Polar.sh integration (`src/lib/polar.ts`)
- Trial period tracking: `tenant.trial_ends_at`
- Subscription status: `subscription.status` (`active` | `trialing`)
- Polar webhooks handled via `supabase/functions/handle-polar-webhook/`
- Checkout sessions created via `supabase/functions/create-polar-checkout/`
- Access control: Check `hasActiveTrial` or `hasActiveSubscription` from `useAuth()`

### Onboarding Flow
Users without `tenant_id` or with incomplete tenant onboarding are redirected to `/onboarding`:
```tsx
// Check in SmartRedirect component
if (!profile?.tenant_id || !tenant || !tenant.onboarding_completed) {
  return <Navigate to="/onboarding" replace />;
}
```

## Component Structure

- **Pages**: `/src/pages/` - Route components (28 pages)
- **Components**: `/src/components/` - Reusable UI components
- **UI Components**: `/src/components/ui/` - shadcn/ui components
- **Contexts**: `/src/context/` - Global state providers (Auth, Location, Theme)
- **Hooks**: `/src/hooks/` - Custom React hooks
- **Lib**: `/src/lib/` - Utility functions and helpers
- **Integrations**: `/src/integrations/supabase/` - Supabase client and types

**Domain-Specific Components:**
- `components/master-files/` - Agents, Commissions, Guides, Locations, Rooms
- `components/reports/` - Financial reports and analytics
- `components/reservation/` - Booking management components
- `components/calendar/` - Calendar and timeline views
- `components/settings/` - Settings management
- `components/users/` - User management
- `components/skeleton/` - Loading skeletons

## Environment Variables

Required in `.env.local`:
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_SUPABASE_SERVICE_ROLE_KEY=your_service_role_key  # For Edge Functions only
```

## File Conventions

- TypeScript throughout with strict types from Supabase 
- Generate types using Supabase CLI: `supabase gen types typescript --local > src/integrations/supabase/types.ts`
- PascalCase for React components (e.g., `UserProfile.tsx`)
- camelCase for functions and variables (e.g., `fetchUserData`, `userName`)
- kebab-case for directories and non-component files (e.g., `user-profile/`, `utils.ts`)
- Database types auto-generated, never edit manually
- Use absolute imports with `@/` prefix

## MCP Tool Usage

### Rube Supabase MCP
**CRITICAL**: Always use Rube Supabase MCP for any Supabase changes:
- Database schema modifications and migrations
- SQL query execution and database operations
- Edge Function deployment and management
- Project configuration changes
- User management and authentication setup

Never make direct Supabase changes through other means. Use the Rube MCP workflow:
1. `RUBE_SEARCH_TOOLS` to find appropriate Supabase tools
2. `RUBE_CREATE_PLAN` to plan the changes
3. `RUBE_MULTI_EXECUTE_TOOL` or `RUBE_REMOTE_WORKBENCH` to execute

### Context7 Documentation
**CRITICAL**: Always check Context7 for third-party library documentation:
- Use `mcp_context7_resolve-library-id` to find library documentation
- Use `mcp_context7_get-library-docs` to retrieve specific documentation
- Check usage patterns, best practices, and API references
- Validate implementation approaches against official docs

Required for: Supabase, React, TypeScript, TailwindCSS, TanStack Query, React Router, and any other external libraries.

## Critical Implementation Notes

- Always wrap protected routes with both `ProtectedRoute` and `PermissionRoute`
- Use `SmartRedirect` to route users to their first accessible page
- Handle loading states consistently with provided spinner components
- Currency handling via `LKR`, `USD`, `EUR`, `GBP` enum values
- Toast notifications via sonner for user feedback
- **MANDATORY**: Use Rube MCP for all Supabase changes
- **MANDATORY**: Verify third-party library usage with Context7 docs
- **MANDATORY**: For end of each response, git add changed files and create a commit with a descriptive message