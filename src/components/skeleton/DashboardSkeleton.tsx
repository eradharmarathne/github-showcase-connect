import {
	AccountBalancesSkeleton,
	DashboardHeaderSkeleton,
	SummaryCardsSkeleton,
	UpcomingBookingsSkeleton,
} from "@/components/dashboard";

interface DashboardSkeletonProps {
	hasIncomePermission?: boolean;
	hasExpensePermission?: boolean;
	hasCalendarPermission?: boolean;
}

export function DashboardSkeleton({
	hasIncomePermission = true,
	hasExpensePermission = true,
	hasCalendarPermission = true,
}: DashboardSkeletonProps) {
	return (
		<div className="space-y-4 w-full pb-8 lg:space-y-6 animate-fade-in p-4">
			{/* Header with Filters */}
			<DashboardHeaderSkeleton
				hasIncomePermission={hasIncomePermission}
				hasExpensePermission={hasExpensePermission}
			/>

			{/* Summary Cards */}
			<SummaryCardsSkeleton />

			{/* Account Balances */}
			<AccountBalancesSkeleton />

			{/* Upcoming Bookings */}
			<UpcomingBookingsSkeleton hasCalendarPermission={hasCalendarPermission} />
		</div>
	);
}
