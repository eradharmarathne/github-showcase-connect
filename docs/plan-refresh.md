# Plan to Fix App Constant Refresh Issue

## Problem Analysis

The app is constantly refreshing when switching tabs or interacting with the application. This is caused by several React hooks and TanStack Query configuration issues.

### Root Causes Identified

1. **TanStack Query Default Configuration** (`src/App.tsx:43`)
   - QueryClient created without custom defaults
   - Using library defaults: `refetchOnWindowFocus: true`, `refetchOnMount: true`
   - No `staleTime` configured globally
   - Every query refetches when tab regains focus

2. **AuthContext Hook Dependencies** (`src/context/auth-context.tsx:151-273`)
   - useEffect has disabled exhaustive-deps rule (line 272)
   - References `profile` state inside SIGNED_IN handler (line 166) without it being in dependencies
   - Creates stale closures that could trigger unnecessary re-renders
   - Auth state change handler may trigger cascade of fetches

3. **LocationContext Dependency Chain** (`src/context/location-context.tsx:27-53`)
   - `fetchLocations` wrapped in useCallback with `tenant?.id` dependency
   - Any change to `tenant` object (even if id is same) triggers callback recreation
   - Triggers useEffect on line 51-53, causing location refetch
   - Cascades to all components using `useLocationContext()`

4. **Dashboard Components Using useEffect** (Multiple files)
   - `src/components/dashboard/income-expense-chart.tsx` (line 78-221): Fetches data in useEffect
   - `src/components/dashboard/upcoming-bookings.tsx` (line 34-76): Fetches data in useEffect
   - Dependencies like `tenant?.id`, `selectedLocation` cause refetches on every change
   - Not leveraging TanStack Query caching and deduplication

5. **Missing Query Configurations**
   - Most useQuery calls lack `staleTime` configuration
   - No `gcTime` (garbage collection time) set
   - Data considered stale immediately, causing aggressive refetching

## Solution Plan

### Phase 1: Configure TanStack Query Defaults

**File:** `src/App.tsx`

**Changes:**
```typescript
// Replace line 43
const queryClient = new QueryClient();

// With:
const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			// Data stays fresh for 5 minutes (no refetch during this time)
			staleTime: 5 * 60 * 1000, // 5 minutes

			// Keep unused data in cache for 10 minutes
			gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)

			// Disable refetch on window focus globally
			// Components can opt-in individually if needed
			refetchOnWindowFocus: false,

			// Only refetch on mount if data is stale
			refetchOnMount: true,

			// Refetch on network reconnection
			refetchOnReconnect: true,

			// Retry failed requests
			retry: 1,
		},
	},
});
```

**Rationale:**
- Prevents aggressive refetching when switching tabs
- Data stays fresh for 5 minutes before being considered stale
- Components can override these defaults when needed
- Balances data freshness with performance

---

### Phase 2: Fix AuthContext Dependencies

**File:** `src/context/auth-context.tsx`

**Changes:**

1. **Remove stale closure issue (line 151-273)**
   - Move profile check logic outside the event handler
   - Use refs for current values instead of stale closures
   - Add proper dependencies or split into multiple effects

2. **Optimize tenant/subscription fetching**
   - Only fetch when tenant_id actually changes
   - Add early return if data already loaded
   - Use refs to track last fetched tenant_id

**Implementation approach:**
```typescript
// Add refs to track current state
const profileRef = useRef(profile);
const tenantIdRef = useRef<string | null>(null);

useEffect(() => {
	profileRef.current = profile;
}, [profile]);

useEffect(() => {
	// Only fetch if tenant_id changed
	if (profile?.tenant_id && profile.tenant_id !== tenantIdRef.current) {
		tenantIdRef.current = profile.tenant_id;
		fetchTenant(profile.tenant_id);
		fetchSubscription(profile.tenant_id);
	}
}, [profile?.tenant_id]); // Only trigger when tenant_id changes

// Auth state change handler - simplified
useEffect(() => {
	const subscription = supabase.auth.onAuthStateChange(
		async (event, session) => {
			setSession(session);
			setUser(session?.user ?? null);

			if (event === "SIGNED_OUT") {
				setProfile(null);
				setTenant(null);
				setSubscription(null);
				tenantIdRef.current = null;
			}

			if (event === "SIGNED_IN" && session?.user) {
				// Simplified - just fetch profile
				// Separate useEffect will handle tenant fetching
				const currentProfile = profileRef.current;
				if (!currentProfile || currentProfile.id !== session.user.id) {
					setTimeout(async () => {
						await fetchProfile(session.user.id);
					}, 0);
				}
			}
		}
	);

	// ... rest of the effect
}, []); // Empty deps - this only sets up the listener once
```

**Rationale:**
- Prevents stale closures
- Separates concerns (auth events vs data fetching)
- Only fetches tenant when tenant_id actually changes
- Reduces cascade of unnecessary fetches

---

### Phase 3: Fix LocationContext Dependencies

**File:** `src/context/location-context.tsx`

**Changes:**

1. **Fix useCallback dependency (line 27-49)**
   - Change from `tenant?.id` to stable primitive value
   - Add comparison to prevent refetch if tenant.id hasn't changed

**Implementation:**
```typescript
// Extract tenant.id to a stable variable
const tenantId = tenant?.id;

const fetchLocations = React.useCallback(async () => {
	if (!tenantId) {
		setLocations([]);
		setLoading(false);
		return;
	}

	try {
		const { data, error } = await supabase
			.from("locations")
			.select("*")
			.eq("tenant_id", tenantId)
			.eq("is_active", true)
			.order("name");

		if (error) throw error;
		setLocations(data || []);
	} catch (error) {
		console.error("Error fetching locations:", error);
	} finally {
		setLoading(false);
	}
}, [tenantId]); // Use primitive value instead of object
```

**Rationale:**
- `tenantId` is a primitive string, stable unless actual value changes
- `tenant?.id` object reference may change even if id is same
- Prevents unnecessary callback recreation and refetches

---

### Phase 4: Convert Dashboard Components to useQuery

**Files:**
- `src/components/dashboard/income-expense-chart.tsx`
- `src/components/dashboard/upcoming-bookings.tsx`

**Changes:**

1. **Income Expense Chart** - Replace useEffect (line 78-221) with useQuery
```typescript
const { data: chartData, isLoading } = useQuery({
	queryKey: ['income-expense-chart', tenant?.id, selectedLocation, selectedMonth, displayCurrency],
	queryFn: async () => {
		if (!tenant?.id) return null;

		// Move entire fetchFinancialData logic here
		// ... existing logic ...

		return {
			chartData: processedData,
			todayIncome,
			todayExpenses,
			weeklyProfit,
			profitMargin
		};
	},
	enabled: !!tenant?.id,
	staleTime: 2 * 60 * 1000, // 2 minutes - financial data can be slightly stale
});
```

2. **Upcoming Bookings** - Replace useEffect (line 34-76) with useQuery
```typescript
const { data: upcomingReservations = [], isLoading } = useQuery({
	queryKey: ['upcoming-bookings', tenant?.id, selectedLocation],
	queryFn: async () => {
		if (!tenant?.id) return [];

		// Move fetchReservationsData logic here
		// ... existing logic ...

		return reservationsData || [];
	},
	enabled: !!tenant?.id,
	staleTime: 1 * 60 * 1000, // 1 minute - reservations should be fairly fresh
});
```

**Rationale:**
- TanStack Query handles caching, deduplication, and refetching intelligently
- Removes manual loading state management
- Prevents duplicate fetches across components
- Respects global staleTime but can override for specific needs
- Automatic cleanup when component unmounts

---

### Phase 5: Add Explicit Refetch Controls

**Files:** Various components that need real-time data

**Changes:**

For components that NEED to refetch on window focus (e.g., critical real-time data):
```typescript
const { data } = useQuery({
	queryKey: ['critical-data'],
	queryFn: fetchData,
	staleTime: 30 * 1000, // 30 seconds
	refetchOnWindowFocus: true, // Override global default
});
```

For components that should NEVER refetch on focus (e.g., settings, static data):
```typescript
const { data } = useQuery({
	queryKey: ['static-data'],
	queryFn: fetchData,
	staleTime: Infinity, // Never consider stale
	refetchOnWindowFocus: false,
});
```

**Rationale:**
- Granular control per component
- Balance between freshness and performance
- Override global defaults only when necessary

---

### Phase 6: Audit and Fix Other Components

**Action Items:**

1. **Search for problematic patterns:**
   ```bash
   # Find all useEffect hooks that might be fetching data
   grep -r "useEffect" src/ --include="*.tsx" -A 10 | grep -E "supabase|fetch"
   ```

2. **Check for missing query keys:**
   - Ensure all useQuery calls include ALL dependencies in queryKey
   - Missing dependencies cause cache misses and duplicate fetches

3. **Add loading boundaries:**
   - Use React Suspense where appropriate
   - Prevents cascading loading states

4. **Optimize re-renders:**
   - Use `React.memo` for expensive components
   - Use `useMemo` for expensive computations
   - Avoid inline object/array creation in props

---

## Testing Plan

### Manual Testing

1. **Tab Switching Test:**
   - Open app in browser
   - Open DevTools Network tab
   - Switch to another tab for 10 seconds
   - Switch back
   - Verify: No network requests should fire (data is still fresh)

2. **Data Staleness Test:**
   - Open dashboard
   - Wait 6 minutes (exceeds 5-minute staleTime)
   - Switch tabs or navigate away and back
   - Verify: Data refetches (stale data is refreshed)

3. **Location Switching Test:**
   - Switch between locations in location selector
   - Verify: Only relevant queries refetch, not everything
   - Check console for unnecessary re-renders

4. **Auth Flow Test:**
   - Sign out and sign in
   - Verify: No duplicate profile/tenant fetches
   - Check console logs for fetch sequence

### Performance Monitoring

Add temporary logging to verify fixes:

```typescript
// In App.tsx QueryClient config
const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			// ... config ...
			onError: (error) => {
				console.error('[Query Error]', error);
			},
			onSuccess: (data) => {
				console.log('[Query Success]', data);
			},
		},
	},
	// Add query cache logging
	queryCache: new QueryCache({
		onSuccess: (data, query) => {
			console.log('[Cache Hit]', query.queryKey);
		},
	}),
});
```

### Metrics to Track

- Number of network requests on tab switch (should be 0 within staleTime)
- Number of re-renders per component (use React DevTools Profiler)
- Time to interactive after auth
- Console log frequency (should reduce significantly)

---

## Implementation Order

1. **Phase 1** (Highest Impact): Configure TanStack Query defaults
   - Quick win, affects all queries immediately
   - Estimated time: 5 minutes

2. **Phase 3** (High Impact): Fix LocationContext dependencies
   - Prevents cascade of location-based refetches
   - Estimated time: 10 minutes

3. **Phase 4** (Medium Impact): Convert Dashboard components to useQuery
   - Improves dashboard performance specifically
   - Estimated time: 30 minutes

4. **Phase 2** (Complex): Fix AuthContext dependencies
   - Requires careful refactoring
   - Estimated time: 45 minutes

5. **Phase 5** (Fine-tuning): Add explicit refetch controls
   - Per-component optimization
   - Estimated time: 20 minutes

6. **Phase 6** (Ongoing): Audit other components
   - Continuous improvement
   - Estimated time: 1-2 hours

---

## Risk Assessment

### Low Risk Changes
- Phase 1: Query defaults (easily reversible)
- Phase 3: LocationContext (isolated change)

### Medium Risk Changes
- Phase 4: Dashboard components (well-tested pattern)

### High Risk Changes
- Phase 2: AuthContext (core authentication flow)
  - Risk: Could break auth flow if not careful
  - Mitigation: Thorough testing of sign-in/sign-out flows
  - Rollback plan: Revert to original useEffect implementation

---

## Expected Outcomes

### Performance Improvements
- 80-90% reduction in unnecessary network requests
- 50-70% reduction in component re-renders
- Faster perceived performance (no flickering on tab switch)
- Lower server load

### User Experience
- No more visible refreshes when switching tabs
- Smoother interactions
- Consistent data state
- Reduced loading spinners

### Developer Experience
- Cleaner code with useQuery patterns
- Better caching behavior
- Easier to debug data flow
- Consistent query patterns across codebase

---

## Rollback Plan

If issues arise:

1. **Immediate rollback** (Phase 1):
   ```typescript
   const queryClient = new QueryClient(); // Remove all custom options
   ```

2. **Component-level rollback**:
   - Keep git commits small per phase
   - Revert specific phases if needed
   - Each phase is independent

3. **Monitoring**:
   - Watch error logs after deployment
   - Monitor user reports
   - Check analytics for increased error rates

---

## Additional Recommendations

### Future Optimizations

1. **Add React Query DevTools**:
   ```typescript
   import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

   // In App.tsx
   <QueryClientProvider client={queryClient}>
     {/* ... */}
     <ReactQueryDevtools initialIsOpen={false} />
   </QueryClientProvider>
   ```

2. **Implement Optimistic Updates**:
   - For mutations (create/update/delete)
   - Reduces perceived latency

3. **Add Query Prefetching**:
   - Prefetch likely next pages
   - Improves navigation performance

4. **Consider React Suspense**:
   - For better loading states
   - Cleaner component code

5. **Add Error Boundaries**:
   - Prevent full app crashes
   - Better error recovery

### Code Quality

1. **Enable stricter TypeScript**:
   - No more `// eslint-disable-next-line`
   - Fix dependency arrays properly

2. **Add component performance monitoring**:
   - React DevTools Profiler
   - Custom performance marks

3. **Document query patterns**:
   - Add to CLAUDE.md
   - Standardize across codebase

---

## Success Criteria

✅ Tab switching causes zero network requests within 5-minute window
✅ Location switching only refetches location-specific queries
✅ Dashboard components use useQuery consistently
✅ AuthContext has proper dependency arrays (no disabled rules)
✅ No console errors related to stale closures
✅ User reports of "constant refreshing" eliminated
✅ Network tab shows 80%+ reduction in requests during normal usage

---

## Notes

- This plan addresses React hooks dependency issues and TanStack Query configuration
- Most issues stem from missing/incorrect dependencies and aggressive refetch defaults
- The fix is primarily configuration and refactoring, not architectural changes
- All changes are backwards compatible with existing data fetching logic
- Implementation should be done incrementally with testing after each phase
