# supabase/ AGENTS.md

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
- `handle-polar-webhook` - Polar.sh billing webhooks
- `create-polar-checkout` - Create Polar.sh checkout sessions
- `clear-bookings` - Booking cleanup operations

