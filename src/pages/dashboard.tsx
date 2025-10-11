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
				<div className="rounded-2xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-6 border border-primary/20">
					<DashboardHeader
						selectedLocation={selectedLocation}
						selectedMonth={selectedMonth}
						setSelectedMonth={setSelectedMonth}
						hasIncomePermission={hasAnyPermission(["access_income"])}
						hasExpensePermission={hasAnyPermission(["access_expenses"])}
						onLocationsLoad={setLocations}
					/>
				</div>

				{/* Income & Expense Chart */}
				<div className="w-full">
					<IncomeExpenseChart
						selectedLocation={selectedLocation}
						selectedMonth={selectedMonth}
						locations={locations}
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

				{/* Booking Source Chart */}
				<div className="w-full">
					<BookingSourceChart
						selectedLocation={selectedLocation}
						selectedMonth={selectedMonth}
					/>
				</div>
			</div>
		</div>
	);
}
