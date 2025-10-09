import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useLocationContext } from "@/context/LocationContext";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";

type Reservation = Tables<"reservations">;
type Payment = Tables<"payments">;
type Location = Tables<"locations">;
type Room = Tables<"rooms">;
type Account = Tables<"accounts">;

interface UseIncomeDataReturn {
	reservations: Reservation[];
	payments: Payment[];
	recentPayments: Payment[];
	locations: Location[];
	rooms: Room[];
	accounts: Account[];
	loading: boolean;
	refetch: () => Promise<void>;
}

export const useIncomeData = (): UseIncomeDataReturn => {
	const [reservations, setReservations] = useState<Reservation[]>([]);
	const [payments, setPayments] = useState<Payment[]>([]);
	const [recentPayments, setRecentPayments] = useState<Payment[]>([]);
	const [locations, setLocations] = useState<Location[]>([]);
	const [rooms, setRooms] = useState<Room[]>([]);
	const [accounts, setAccounts] = useState<Account[]>([]);
	const [loading, setLoading] = useState(true);

	const { tenant } = useAuth();
	const { selectedLocation } = useLocationContext();

	const fetchData = useCallback(async () => {
		if (!tenant?.id) return;

		try {
			setLoading(true);

			// Fetch reservations based on location
			const reservationsQuery = !selectedLocation
				? supabase
						.from("reservations")
						.select("*")
						.eq("tenant_id", tenant.id)
						.order("created_at", { ascending: false })
						.limit(20)
				: supabase
						.from("reservations")
						.select("*")
						.eq("tenant_id", tenant.id)
						.eq("location_id", selectedLocation)
						.order("created_at", { ascending: false })
						.limit(20);

			// Fetch locations
			const locationsQuery = supabase
				.from("locations")
				.select("*")
				.eq("tenant_id", tenant.id)
				.eq("is_active", true);

			// Fetch rooms based on location
			const roomsQuery = !selectedLocation
				? supabase
						.from("rooms")
						.select("*")
						.eq("tenant_id", tenant.id)
						.eq("is_active", true)
				: supabase
						.from("rooms")
						.select("*")
						.eq("tenant_id", tenant.id)
						.eq("location_id", selectedLocation)
						.eq("is_active", true);

			// Fetch accounts
			const accountsQuery = supabase
				.from("accounts")
				.select("*")
				.eq("tenant_id", tenant.id);

			// Fetch payments - simplified query to avoid type issues
			const paymentsQuery = supabase
				.from("payments")
				.select("*")
				.order("created_at", { ascending: false })
				.limit(10);

			const [
				reservationsRes,
				locationsRes,
				roomsRes,
				accountsRes,
				paymentsRes,
			] = await Promise.all([
				reservationsQuery,
				locationsQuery,
				roomsQuery,
				accountsQuery,
				paymentsQuery,
			]);

			setReservations(reservationsRes.data || []);
			setLocations(locationsRes.data || []);
			setRooms(roomsRes.data || []);
			setAccounts(accountsRes.data || []);
			setRecentPayments(paymentsRes.data || []);
			setPayments(paymentsRes.data || []);
		} catch (error) {
			console.error("Error fetching income data:", error);
		} finally {
			setLoading(false);
		}
	}, [tenant?.id, selectedLocation]);

	useEffect(() => {
		fetchData();
	}, [fetchData]);

	return {
		reservations,
		payments,
		recentPayments,
		locations,
		rooms,
		accounts,
		loading,
		refetch: fetchData,
	};
};
