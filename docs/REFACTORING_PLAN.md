# Component Refactoring Plan

## Overview
Analysis identified **8 pages exceeding recommended length** (>300 lines). This document outlines the refactoring strategy to break them down into focused, maintainable components.

## Priority Matrix

### 🔴 CRITICAL (>600 lines)
1. **booking-channels-integration.tsx** - 1767 lines
2. **payment-form.tsx** - 764 lines
3. **billing-subscription.tsx** - 670 lines
4. **onboarding.tsx** - 651 lines ✅ *Recently improved but still long*
5. **financial-reports.tsx** - 634 lines

### 🟡 HIGH PRIORITY (400-600 lines)
6. **reservations.tsx** - 562 lines
7. **reservation-details.tsx** - 512 lines
8. **auth.tsx** - 468 lines

---

## 1. booking-channels-integration.tsx (1767 lines)

### Current Status: 🟢 IN PROGRESS

### Breakdown Strategy:

#### ✅ Completed:
- **Types** → `src/types/booking-channels.ts`
  - `ExternalBooking`, `BookingLocation`, `PropertyMapping`, `SyncStats`, `SyncUrl`

- **Helper Functions** → `src/lib/booking-channels/helpers.ts`
  - `getGuestName`, `getEmail`, `formatDate`, `calculateNights`, `formatPrice`, `getPaymentInfo`, `calculateStats`

- **Components Created:**
  - `BookingChannelsStats` - Stats cards display (88 lines)
  - `SyncHeader` - Sync button and last sync info (47 lines)
  - `RoomMappingsTab` - Already exists

#### 🔴 TODO - Extract Components:

1. **BookingsTab Component** (~400 lines)
   - Table of all bookings
   - Filtering and search
   - Status badges
   - Actions

2. **BookingDetailsDialog Component** (~150 lines)
   - Full booking details view
   - Guest information
   - Payment info
   - Actions (delete, etc.)

3. **AnalyticsTab Component** (~100 lines)
   - Charts and graphs
   - Breakdown by source
   - Status distribution

4. **SettingsTab Component** (~300 lines)
   - iCal URL management
   - Property mappings
   - Integration setup

5. **SetupDialog Component** (~150 lines)
   - Beds24 token exchange
   - API key setup

6. **Custom Hook** - `useBookingChannels`
   - Data fetching logic
   - Sync operations
   - State management

### Target Structure:
```
src/
├── components/booking-channels/
│   ├── index.ts
│   ├── booking-channels-stats.tsx ✅
│   ├── sync-header.tsx ✅
│   ├── bookings-tab.tsx ⏳
│   ├── booking-details-dialog.tsx ⏳
│   ├── analytics-tab.tsx ⏳
│   ├── settings-tab.tsx ⏳
│   ├── setup-dialog.tsx ⏳
│   └── room-mappings-tab.tsx ✅
├── hooks/booking-channels/
│   └── use-booking-channels.ts ⏳
├── lib/booking-channels/
│   └── helpers.ts ✅
├── types/
│   └── booking-channels.ts ✅
└── pages/
    └── booking-channels-integration.tsx (target: ~200 lines)
```

---

## 2. payment-form.tsx (764 lines)

### Breakdown Strategy:

#### Extract Components:
1. **PaymentMethodSelector** (~150 lines)
   - Credit card / Bank transfer / Cash selection
   - Payment method icons and info

2. **PaymentAmountCalculator** (~120 lines)
   - Amount input
   - Currency selector
   - Split payment logic

3. **PaymentSummary** (~100 lines)
   - Total breakdown
   - Fees calculation
   - Final amount display

4. **PaymentFormFields** (~150 lines)
   - Guest information
   - Payment details
   - Validation logic

5. **Custom Hook** - `usePaymentForm`
   - Form state management
   - Validation logic
   - Submission handling

### Target Structure:
```
src/
├── components/payment/
│   ├── payment-method-selector.tsx
│   ├── payment-amount-calculator.tsx
│   ├── payment-summary.tsx
│   └── payment-form-fields.tsx
├── hooks/
│   └── use-payment-form.ts
└── pages/
    └── payment-form.tsx (target: ~150 lines)
```

---

## 3. billing-subscription.tsx (670 lines)

### Breakdown Strategy:

#### Extract Components:
1. **SubscriptionPlansGrid** (~200 lines)
   - Plan cards
   - Features list
   - Pricing display

2. **CurrentSubscriptionCard** (~100 lines)
   - Active plan info
   - Usage metrics
   - Renewal date

3. **PaymentMethodSection** (~120 lines)
   - Saved payment methods
   - Add/edit payment method
   - Default selection

4. **BillingHistoryTable** (~150 lines)
   - Invoice list
   - Download actions
   - Payment status

5. **Custom Hook** - `useSubscription`
   - Subscription data fetching
   - Plan upgrade/downgrade
   - Payment method management

### Target Structure:
```
src/
├── components/billing/
│   ├── subscription-plans-grid.tsx
│   ├── current-subscription-card.tsx
│   ├── payment-method-section.tsx
│   └── billing-history-table.tsx
├── hooks/
│   └── use-subscription.ts
└── pages/
    └── billing-subscription.tsx (target: ~150 lines)
```

---

## 4. financial-reports.tsx (634 lines)

### Breakdown Strategy:

#### Extract Components:
1. **ReportFilters** (~100 lines)
   - Date range picker
   - Location filter
   - Report type selector

2. **RevenueChart** (~120 lines)
   - Line/bar chart
   - Chart configuration
   - Data visualization

3. **ExpenseChart** (~120 lines)
   - Expense breakdown
   - Category-wise display

4. **SummaryCards** (~100 lines)
   - Total revenue
   - Total expenses
   - Net profit
   - Other KPIs

5. **ReportTable** (~150 lines)
   - Detailed transactions
   - Export functionality
   - Sorting/filtering

6. **Custom Hook** - `useFinancialReports`
   - Data aggregation
   - Date range filtering
   - Export logic

### Target Structure:
```
src/
├── components/reports/
│   ├── report-filters.tsx
│   ├── revenue-chart.tsx
│   ├── expense-chart.tsx
│   ├── summary-cards.tsx
│   └── report-table.tsx
├── hooks/
│   └── use-financial-reports.ts
└── pages/
    └── financial-reports.tsx (target: ~100 lines)
```

---

## 5. reservations.tsx (562 lines)

### Breakdown Strategy:

#### Extract Components:
1. **ReservationFilters** (~80 lines)
   - Status filter
   - Date range
   - Search

2. **ReservationsTable** (~250 lines)
   - Table display
   - Sorting
   - Row actions

3. **ReservationQuickActions** (~80 lines)
   - Bulk actions
   - Export
   - Add new

4. **Custom Hook** - `useReservations`
   - Data fetching
   - Filtering logic
   - CRUD operations

### Target Structure:
```
src/
├── components/reservation/
│   ├── reservation-filters.tsx
│   ├── reservations-table.tsx
│   └── reservation-quick-actions.tsx
├── hooks/
│   └── use-reservations.ts
└── pages/
    └── reservations.tsx (target: ~100 lines)
```

---

## 6. reservation-details.tsx (512 lines)

### Breakdown Strategy:

#### Extract Components:
1. **ReservationHeader** (~80 lines)
   - Guest name
   - Status badge
   - Quick actions

2. **GuestInformation** (~100 lines)
   - Contact details
   - ID information
   - Notes

3. **BookingDetails** (~100 lines)
   - Dates
   - Room assignment
   - Rates

4. **PaymentSection** (~120 lines)
   - Payment history
   - Balance
   - Add payment

5. **ReservationTimeline** (~100 lines)
   - Activity log
   - Status changes
   - Notifications

### Target Structure:
```
src/
├── components/reservation/
│   ├── reservation-header.tsx
│   ├── guest-information.tsx
│   ├── booking-details.tsx
│   ├── payment-section.tsx
│   └── reservation-timeline.tsx
└── pages/
    └── reservation-details.tsx (target: ~100 lines)
```

---

## 7. auth.tsx (468 lines)

### Breakdown Strategy:

#### Extract Components:
1. **LoginForm** (~120 lines)
   - Email/password inputs
   - Remember me
   - Submit handling

2. **SignupForm** (~120 lines)
   - Registration fields
   - Terms acceptance
   - Validation

3. **SocialAuth** (~80 lines)
   - OAuth providers
   - Social login buttons

4. **AuthLayout** (~80 lines)
   - Background
   - Branding
   - Responsive layout

5. **Custom Hook** - `useAuth`
   - Already exists, may need enhancement

### Target Structure:
```
src/
├── components/auth/
│   ├── login-form.tsx
│   ├── signup-form.tsx
│   ├── social-auth.tsx
│   └── auth-layout.tsx
└── pages/
    └── auth.tsx (target: ~80 lines)
```

---

## Implementation Guidelines

### Best Practices:
1. **Single Responsibility** - Each component should do one thing well
2. **Prop Drilling** - Use contexts or composition for deeply nested props
3. **Performance** - Memoize expensive computations with `useMemo`/`useCallback`
4. **Types** - Extract shared types to dedicated files
5. **Hooks** - Extract complex logic to custom hooks
6. **Testing** - Smaller components are easier to test

### File Size Targets:
- **Pages**: 50-200 lines (mainly composition)
- **Components**: 50-150 lines (focused functionality)
- **Hooks**: 50-200 lines (complex logic)
- **Utils/Helpers**: 20-100 lines per function

### Naming Conventions:
- **Components**: PascalCase (e.g., `BookingChannelsStats`)
- **Hooks**: camelCase with `use` prefix (e.g., `useBookingChannels`)
- **Utils**: camelCase (e.g., `calculateNights`)
- **Types**: PascalCase with descriptive names (e.g., `ExternalBooking`)

---

## Progress Tracking

### Completed: ✅
- [x] Analysis of all pages
- [x] Created types for booking-channels
- [x] Extracted helpers for booking-channels
- [x] Created BookingChannelsStats component
- [x] Created SyncHeader component

### In Progress: 🟡
- [ ] Complete booking-channels-integration refactoring
- [ ] Create remaining booking-channels components

### Pending: ⏳
- [ ] Refactor payment-form.tsx
- [ ] Refactor billing-subscription.tsx
- [ ] Refactor financial-reports.tsx
- [ ] Refactor reservations.tsx
- [ ] Refactor reservation-details.tsx
- [ ] Refactor auth.tsx

---

## Benefits

### Maintainability:
- Easier to locate and modify specific functionality
- Reduced cognitive load when working on features
- Clear separation of concerns

### Performance:
- Better code splitting opportunities
- Selective re-rendering with React.memo
- Lazy loading of large components

### Testability:
- Isolated components are easier to unit test
- Mock dependencies more easily
- Better test coverage

### Collaboration:
- Multiple developers can work on different components
- Reduced merge conflicts
- Easier code reviews

---

## Next Steps

1. **Complete booking-channels-integration** - Most critical due to size
2. **Refactor payment-form** - Second largest
3. **Continue with remaining pages** - In priority order
4. **Add tests for new components** - Ensure functionality
5. **Update documentation** - Component usage examples

---

*Generated: 2025-10-31*
*Total Files to Refactor: 8*
*Total Lines to Reduce: ~6000 lines*
*Target: Reduce to ~1500 lines across all pages*
