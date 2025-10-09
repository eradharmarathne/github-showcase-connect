import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useLocationContext } from "@/context/LocationContext";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";

type Location = Tables<"locations">;
type Account = Tables<"accounts">;
type ExpenseType = Tables<"expense_types">;
type Expense = Tables<"expenses">;

interface UseExpenseDataReturn {
	locations: Location[];
	accounts: Account[];
	expenseTypes: ExpenseType[];
	recentExpenses: Expense[];
	loading: boolean;
	refetch: () => Promise<void>;
}

export const useExpenseData = (): UseExpenseDataReturn => {
	const [locations, setLocations] = useState<Location[]>([]);
	const [accounts, setAccounts] = useState<Account[]>([]);
	const [expenseTypes, setExpenseTypes] = useState<ExpenseType[]>([]);
	const [recentExpenses, setRecentExpenses] = useState<Expense[]>([]);
	const [loading, setLoading] = useState(true);

	const { tenant } = useAuth();
	const { selectedLocation } = useLocationContext();

	const fetchData = useCallback(async () => {
		if (!tenant?.id) return;

		try {
			setLoading(true);

			// Fetch locations - simplified query
			const locationsQuery = supabase
				.from("locations")
				.select("*")
				.eq("tenant_id", tenant.id)
				.eq("is_active", true);

			// Fetch accounts - simplified query
			const accountsQuery = supabase
				.from("accounts")
				.select("*")
				.eq("tenant_id", tenant.id);

			// Fetch expense types - simplified query
			const expenseTypesQuery = supabase
				.from("expense_types")
				.select("*")
				.order("main_type");

			// Fetch recent expenses based on location - simplified query
			const expenseQuery = !selectedLocation
				? supabase
						.from("expenses")
						.select("*")
						.order("created_at", { ascending: false })
						.limit(10)
				: supabase
						.from("expenses")
						.select("*")
						.eq("location_id", selectedLocation)
						.order("created_at", { ascending: false })
						.limit(10);

			const [locationsRes, accountsRes, expenseTypesRes, expensesRes] =
				await Promise.all([
					locationsQuery,
					accountsQuery,
					expenseTypesQuery,
					expenseQuery,
				]);

			setLocations(locationsRes.data || []);
			setAccounts(accountsRes.data || []);
			setExpenseTypes(expenseTypesRes.data || []);
			setRecentExpenses(expensesRes.data || []);
		} catch (error) {
			console.error("Error fetching expense data:", error);
		} finally {
			setLoading(false);
		}
	}, [tenant?.id, selectedLocation]);

	useEffect(() => {
		fetchData();
	}, [fetchData]);

	return {
		locations,
		accounts,
		expenseTypes,
		recentExpenses,
		loading,
		refetch: fetchData,
	};
};
