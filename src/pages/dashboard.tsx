import { useState } from "react";
import {
	AccountBalances,
	BookingSourceChart,
	DashboardHeader,
	IncomeExpenseChart,
	UpcomingBookings,
} from "@/components/dashboard";
import { useLocationContext } from "@/context/location-context";
import { usePermissions } from "@/hooks/use-permissions";
import { Tables } from "@/integrations/supabase/types";

type Location = Tables<"locations">;

export default function Dashboard() {
	const { selectedLocation } = useLocationContext();
	const [selectedMonth, setSelectedMonth] = useState("");
	const [locations, setLocations] = useState<Location[]>([]);
	const { hasAnyPermission } = usePermissions();

	return (
		<div className="min-h-screen">
			<div className="space-y-6 w-full pb-20 sm:pb-8 lg:space-y-8 animate-fade-in p-4 sm:p-6 lg:p-8 max-w-[1920px] mx-auto">
				{/* Header with Filters */}
				<DashboardHeader />

				{/* Income & Expense Chart */}
				<div className="w-full flex flex-col sm:flex-row gap-4">
					<IncomeExpenseChart
						selectedLocation={selectedLocation}
						selectedMonth={selectedMonth}
						locations={locations}
					/>
					<BookingSourceChart
						selectedLocation={selectedLocation}
						selectedMonth={selectedMonth}
					/>
				</div>

				{/* Account Balances and Upcoming Bookings - Responsive Layout */}
				<div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
					{/* Account Balances */}
					<div className="w-full">
						<AccountBalances selectedLocation={selectedLocation} />
					</div>

					{/* Upcoming Bookings */}
					<div className="w-full">
						<UpcomingBookings
							selectedLocation={selectedLocation}
							hasCalendarPermission={hasAnyPermission(["access_calendar"])}
						/>
					</div>
				</div>
			</div>
		</div>
	);
}
