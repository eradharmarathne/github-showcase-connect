import { useState } from "react";
import {
	AccountBalances,
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

			{/* Income & Expense Chart with Summary Cards */}
			<IncomeExpenseChart
				selectedLocation={selectedLocation}
				selectedMonth={selectedMonth}
				locations={locations}
			/>

			{/* Account Balances */}
			<AccountBalances selectedLocation={selectedLocation} />

			{/* Upcoming Bookings */}
			<UpcomingBookings
				selectedLocation={selectedLocation}
				hasCalendarPermission={hasAnyPermission(["access_calendar"])}
			/>
		</div>
	);
}
