# Copilot Instructions

This is a multi-tenant hospitality ERP system built with React, TypeScript, Vite, and Supabase. The app manages hotel reservations, income/expenses, reports, and booking channels integration across multiple locations.

## Core Architecture

- **Frontend**: React 18 + TypeScript + Vite + TailwindCSS + shadcn/ui
- **Backend**: Supabase (PostgreSQL database, Auth, Edge Functions)
- **State**: Context API for auth/location, TanStack Query for data fetching
- **Routing**: React Router v7 with nested protected routes
- **Multi-tenancy**: Complete tenant isolation with `tenant_id` foreign keys
- **Code Quality**: Biome for linting and formatting (replaces ESLint/Prettier)

## Database Schema Overview

### Core Entity Relationships
- **Tenants** → **Locations** → **Rooms** → **Reservations**
- **Profiles** (users) → **User_permissions** (per location/tenant)
- **Income/Expenses** → **Accounts** (financial tracking)
- **External_bookings** + **Beds24_property_mappings** (channel integration)

### Multi-Tenant Architecture
- `tenants` table: Central tenant management with hotel details, trial periods, subscription status
- `profiles` table: User management with `tenant_id` association and role-based access
- `user_permissions` table: Granular boolean permissions per user/location/tenant
- `locations` table: Property/location management within tenants
- All transactional tables include `tenant_id` for data isolation

### Permission System
Granular boolean flags in `user_permissions` table:
- `access_dashboard`, `access_income`, `access_expenses`, `access_reports`
- `access_calendar`, `access_bookings`, `access_rooms`, `access_master_files`
- `access_accounts`, `access_users`, `access_settings`, `access_booking_channels`
- `is_tenant_admin` flag for elevated permissions
- `tenant_role` enum: `tenant_admin`, `tenant_billing`, `tenant_manager`, `tenant_staff`

### Routing Patterns
All protected routes follow this structure:
```tsx
<Route path="/page" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
  <Route index element={<PermissionRoute permission={["access_feature"]}>
    <Component />
  </PermissionRoute>} />
</Route>
```

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
- **Layout**: Uses `AppSidebar` component with `NavMain`, `NavUser`, `NavProjects`, and `LocationSwitcher` (team-switcher)
- **Contexts**: Auth and Location management
- **Hooks**: Custom hooks like `usePermissions`, `useProfile`, `useTenant`

## Supabase Integration

### Database Schema (30 tables)
**Core Business Tables:**
- `reservations`: Complete booking lifecycle with guest details, payments, commissions
- `rooms`: Property inventory with pricing, amenities, availability 
- `income`/`expenses`: Financial transactions linked to accounts and locations
- `external_bookings`: Channel manager integration with raw booking data
- `booking_payments`: Payment tracking with multiple methods

**Multi-Tenancy Tables:**
- `tenants`: Hotel/company management with subscription and trial tracking
- `profiles`: User accounts with role-based access (`admin`, `manager`, `staff`)
- `user_permissions`: Per-location granular permission matrix
- `subscriptions`/`plans`: SaaS billing integration with Creem

**Integration Tables:**
- `beds24_property_mappings`: External channel property mapping
- `booking_sync_urls`: iCal and external calendar sync endpoints
- `currency_rates`: Multi-currency support for international operations

### Custom Enums & Types
- `currency_type`: `LKR`, `USD`, `EUR`, `GBP`
- `reservation_status`: `tentative`, `confirmed`, `checked_in`, `checked_out`, `cancelled`
- `booking_source`: `direct`, `airbnb`, `booking_com`, `beds24`, `manual`, etc.
- `user_role`/`tenant_role`: Hierarchical permission system

### RPC Functions
- `get_user_permissions`: Returns user's permission matrix across tenants
- `generate_reservation_number`: Auto-increment booking references
- `accept_invitation`: User onboarding workflow
- `is_email_allowed`: Tenant access control

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
const { hasAnyPermission, hasPermission, isAdmin } = usePermissions();
if (!hasAnyPermission(["access_income"])) return <AccessDenied />;
// Admin users bypass all permission checks via tenant owner relationship
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

## File Conventions

- TypeScript throughout with strict types from Supabase 
- Generate types using Supabase CLI: `npx supabase gen types typescript --project-id "
" --schema public > src/integrations/supabase/types.ts`
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