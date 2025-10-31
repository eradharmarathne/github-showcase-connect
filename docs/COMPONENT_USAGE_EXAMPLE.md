# Component Usage Example

## booking-channels-integration.tsx Refactored

This document shows how to use the extracted components in the main page.

### Before (1767 lines)
```typescript
export default function BookingChannelsIntegration() {
  // 200+ lines of state
  // 400+ lines of functions
  // 1100+ lines of JSX
}
```

### After (~400 lines)
```typescript
import {
  AnalyticsTab,
  BookingChannelsStats,
  BookingDetailsDialog,
  BookingsTab,
  SyncHeader,
  RoomMappingsTab
} from "@/components/booking-channels";
import { calculateStats } from "@/lib/booking-channels/helpers";
import type { ExternalBooking } from "@/types/booking-channels";

export default function BookingChannelsIntegration() {
  const { selectedLocation } = useLocationContext();
  const { tenant } = useTenant();

  // Simplified state
  const [bookings, setBookings] = useState<ExternalBooking[]>([]);
  const [selectedBooking, setSelectedBooking] = useState<ExternalBooking | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  // Calculate stats from bookings
  const syncStats = calculateStats(bookings);

  // Sync handler
  const handleSync = async () => {
    setSyncing(true);
    // ... sync logic
    setSyncing(false);
  };

  // Room mapping handler
  const handleRoomMapping = async (bookingId: string, roomId: string) => {
    // ... mapping logic
    fetchData(); // refresh
  };

  return (
    <div className="space-y-6 px-4 sm:px-6 md:px-8 pt-8 pb-20 sm:pb-0">
      {/* Sync Header - 46 lines extracted */}
      <SyncHeader
        syncing={syncing}
        lastSyncTime={lastSyncTime}
        onSync={handleSync}
      />

      {/* Stats Cards - 98 lines extracted */}
      <BookingChannelsStats
        syncStats={syncStats}
        bookings={bookings}
      />

      {/* Tabs */}
      <Tabs defaultValue="bookings" className="space-y-4">
        <TabsList>
          <TabsTrigger value="bookings">Bookings</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="room-mappings">Room Mappings</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        {/* Bookings Tab - 297 lines extracted */}
        <TabsContent value="bookings">
          <BookingsTab
            bookings={bookings}
            rooms={rooms}
            syncing={syncing}
            onSync={handleSync}
            onBookingClick={(booking) => {
              setSelectedBooking(booking);
              setShowDialog(true);
            }}
            onRoomMappingUpdate={handleRoomMapping}
          />
        </TabsContent>

        {/* Analytics Tab - 80 lines extracted */}
        <TabsContent value="analytics">
          <AnalyticsTab syncStats={syncStats} />
        </TabsContent>

        {/* Room Mappings Tab - 467 lines extracted */}
        <TabsContent value="room-mappings">
          <RoomMappingsTab locationId={selectedLocation} />
        </TabsContent>

        {/* Settings Tab - Still inline, needs refactoring */}
        <TabsContent value="settings">
          {/* ~340 lines of settings UI */}
        </TabsContent>
      </Tabs>

      {/* Booking Details Dialog - 196 lines extracted */}
      <BookingDetailsDialog
        booking={selectedBooking}
        open={showDialog}
        onOpenChange={setShowDialog}
      />
    </div>
  );
}
```

## Benefits

### Code Reduction
- **Before**: 1767 lines in one file
- **After**: ~400 lines in main page + 988 lines in 6 components
- **Maintainability**: Each component is focused and testable

### Component Reusability
```typescript
// Stats component can be used in dashboard
import { BookingChannelsStats } from "@/components/booking-channels";

function Dashboard() {
  return (
    <div>
      <BookingChannelsStats syncStats={stats} bookings={bookings} />
    </div>
  );
}

// Dialog can be used anywhere
import { BookingDetailsDialog } from "@/components/booking-channels";

function ReservationPage() {
  return (
    <BookingDetailsDialog booking={booking} open={open} onOpenChange={setOpen} />
  );
}
```

### Easy Testing
```typescript
// Test individual components
describe('BookingsTab', () => {
  it('displays bookings correctly', () => {
    render(<BookingsTab bookings={mockBookings} ... />);
    // assertions
  });

  it('handles room mapping', async () => {
    const onUpdate = jest.fn();
    render(<BookingsTab onRoomMappingUpdate={onUpdate} ... />);
    // user actions
    expect(onUpdate).toHaveBeenCalled();
  });
});
```

### Performance Optimization
```typescript
// Memoize expensive components
const MemoizedBookingsTab = React.memo(BookingsTab);
const MemoizedAnalyticsTab = React.memo(AnalyticsTab);

// Lazy load heavy components
const BookingsTab = lazy(() =>
  import("@/components/booking-channels").then(m => ({ default: m.BookingsTab }))
);
```

## Import Pattern

### Clean Barrel Exports
```typescript
// ✅ Recommended
import {
  BookingsTab,
  BookingDetailsDialog,
  AnalyticsTab,
  BookingChannelsStats,
  SyncHeader
} from "@/components/booking-channels";

// ❌ Avoid
import { BookingsTab } from "@/components/booking-channels/bookings-tab";
import { BookingDetailsDialog } from "@/components/booking-channels/booking-details-dialog";
```

## Next Steps

### Remaining Work for booking-channels-integration.tsx

1. **Extract SettingsTab Component** (~340 lines)
   - Property mapping section
   - iCal sync section
   - API configuration section
   - Challenge: Complex state management

2. **Create useBookingChannels Hook**
   - Consolidate data fetching
   - Sync operations
   - State management
   - ~150 lines

3. **Final Refactoring**
   - Wire up all components
   - Test complete flow
   - Verify all features work
   - Target: ~200 lines for main page

### Estimated Final Structure

```
src/pages/booking-channels-integration.tsx (200 lines)
├── Import components
├── useBookingChannels hook
├── Render structure with components
└── Dialogs

src/components/booking-channels/
├── analytics-tab.tsx ✅ (80 lines)
├── booking-channels-stats.tsx ✅ (98 lines)
├── booking-details-dialog.tsx ✅ (196 lines)
├── bookings-tab.tsx ✅ (297 lines)
├── room-mappings-tab.tsx ✅ (467 lines)
├── room-mapping-row.tsx ✅ (171 lines)
├── settings-tab.tsx ⏳ (340 lines)
├── sync-header.tsx ✅ (46 lines)
└── index.ts ✅

src/hooks/booking-channels/
└── use-booking-channels.ts ⏳ (150 lines)

src/lib/booking-channels/
└── helpers.ts ✅ (98 lines)

src/types/
└── booking-channels.ts ✅ (61 lines)
```

## Migration Checklist

When refactoring the main page:

- [ ] Import all extracted components
- [ ] Replace inline JSX with components
- [ ] Pass required props to each component
- [ ] Test sync functionality
- [ ] Test room mapping
- [ ] Test booking details dialog
- [ ] Test analytics display
- [ ] Verify translations work
- [ ] Test responsive layout
- [ ] Check for console errors
- [ ] Validate TypeScript types
- [ ] Run linter
- [ ] Test on mobile
- [ ] Test on tablet
- [ ] Test on desktop

## Common Patterns

### State Management
```typescript
// Keep state at the appropriate level
// Local state in component
function BookingsTab() {
  const [mappingRoomId, setMappingRoomId] = useState<string | null>(null);
}

// Shared state in parent
function BookingChannelsIntegration() {
  const [bookings, setBookings] = useState<ExternalBooking[]>([]);
  const [syncing, setSyncing] = useState(false);
}

// Global state in context (if needed)
```

### Event Handling
```typescript
// Pass callbacks down
<BookingsTab
  onBookingClick={(booking) => {
    setSelectedBooking(booking);
    setShowDialog(true);
  }}
  onRoomMappingUpdate={async (id, roomId) => {
    await updateMapping(id, roomId);
    await fetchData();
  }}
/>
```

### Loading States
```typescript
// Show skeletons while loading
{loading ? (
  <BookingChannelsSkeleton />
) : (
  <>
    <BookingChannelsStats ... />
    <BookingsTab ... />
  </>
)}
```

## Performance Tips

### Memoization
```typescript
const syncStats = useMemo(
  () => calculateStats(bookings),
  [bookings]
);

const filteredBookings = useMemo(
  () => bookings.filter(b => b.location_id === selectedLocation),
  [bookings, selectedLocation]
);
```

### Callback Stability
```typescript
const handleSync = useCallback(async () => {
  setSyncing(true);
  try {
    await syncData();
  } finally {
    setSyncing(false);
  }
}, [syncData]);
```

### Code Splitting
```typescript
// Lazy load tabs that aren't immediately visible
const AnalyticsTab = lazy(() =>
  import("@/components/booking-channels/analytics-tab")
);

<Suspense fallback={<Skeleton />}>
  <AnalyticsTab syncStats={syncStats} />
</Suspense>
```

---

*This usage example demonstrates the power of component extraction - cleaner code, better organization, and improved maintainability.*
