import {
	AccountBalancesSkeleton,
	BookingSourceChartSkeleton,
	DashboardHeaderSkeleton,
	IncomeExpenseChartSkeleton,
	UpcomingBookingsSkeleton,
} from "@/components/dashboard";

interface DashboardSkeletonProps {
	hasCalendarPermission?: boolean;
}

export function DashboardSkeleton({
	hasCalendarPermission = true,
}: DashboardSkeletonProps) {
	return (
		<div className="min-h-screen">
			<div className="space-y-4 sm:space-y-6 w-full pb-20 sm:pb-8 lg:space-y-8 animate-fade-in p-4 sm:p-6 lg:p-8 max-w-[1920px] mx-auto">
				{/* Header with Filters */}
				<DashboardHeaderSkeleton />

				{/* Income & Expense Chart with Booking Source Chart - Responsive Layout */}
				<div className="w-full grid grid-cols-1 xl:grid-cols-[1fr,auto] gap-4 sm:gap-6">
					<div className="w-full min-w-0">
						<IncomeExpenseChartSkeleton />
					</div>
					<div className="w-full xl:w-auto xl:min-w-[400px]">
						<BookingSourceChartSkeleton />
					</div>
				</div>

				{/* Account Balances and Upcoming Bookings - Responsive Layout */}
				<div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-8">
					{/* Account Balances */}
					<div className="w-full">
						<AccountBalancesSkeleton />
					</div>

					{/* Upcoming Bookings */}
					<div className="w-full">
						<UpcomingBookingsSkeleton
							hasCalendarPermission={hasCalendarPermission}
						/>
					</div>
				</div>
			</div>
		</div>
	);
}
