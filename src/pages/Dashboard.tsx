import { useState } from "react";
import {
	AccountBalances,
	BookingSourceChart,
	DashboardHeader,
	IncomeExpenseChart,
	UpcomingBookings,
} from "@/components/dashboard";
import { useLocationContext } from "@/context/LocationContext";
import { usePermissions } from "@/hooks/usePermissions";
import { Tables } from "@/integrations/supabase/types";

type Location = Tables<"locations">;

export default function Dashboard() {
	const { selectedLocation } = useLocationContext();
	const [selectedMonth, setSelectedMonth] = useState("");
	const [locations, setLocations] = useState<Location[]>([]);
	const { hasAnyPermission } = usePermissions();

	return (
		<div className="space-y-4 w-full pb-8 lg:space-y-6 animate-fade-in p-4">
			{/* Header with Filters */}
			<DashboardHeader
				selectedLocation={selectedLocation}
				selectedMonth={selectedMonth}
				setSelectedMonth={setSelectedMonth}
				hasIncomePermission={hasAnyPermission(["access_income"])}
				hasExpensePermission={hasAnyPermission(["access_expenses"])}
				onLocationsLoad={setLocations}
			/>

			{/* Income & Expense Chart with Booking Sources */}
			<div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
				<div className="lg:col-span-3">
					<IncomeExpenseChart
						selectedLocation={selectedLocation}
						selectedMonth={selectedMonth}
						locations={locations}
					/>
				</div>
				<div className="lg:col-span-1">
					<BookingSourceChart
						selectedLocation={selectedLocation}
						selectedMonth={selectedMonth}
					/>
				</div>
			</div>

			{/* Account Balances and Upcoming Bookings - Responsive Layout */}
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
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
	);
}
