import {
	AccountBalancesSkeleton,
	DashboardHeaderSkeleton,
	SummaryCardsSkeleton,
	UpcomingBookingsSkeleton,
} from "@/components/dashboard";

interface DashboardSkeletonProps {
	hasCalendarPermission?: boolean;
}

export function DashboardSkeleton({
	hasCalendarPermission = true,
}: DashboardSkeletonProps) {
	return (
		<div className="space-y-4 w-full pb-8 lg:space-y-6 animate-fade-in p-4">
			{/* Header with Filters */}
			<DashboardHeaderSkeleton />

			{/* Summary Cards */}
			<SummaryCardsSkeleton />

			{/* Account Balances */}
			<AccountBalancesSkeleton />

			{/* Upcoming Bookings */}
			<UpcomingBookingsSkeleton hasCalendarPermission={hasCalendarPermission} />
		</div>
	);
}
