import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { useLocationContext } from "@/context/LocationContext";
import { supabase } from "@/integrations/supabase/client";
import { convertCurrency } from "@/utils/currency";

// Type for the simplified financial view
export interface ReservationFinancial {
	id: string;
	reservation_number: string;
	guest_name: string;
	status: string;
	currency: string;
	room_amount_usd: number;
	expenses_usd: number;
	user_paid_amount_usd: number;
	needs_to_pay_usd: number;
	// Additional fields for compatibility
	rooms?: { room_number: string; room_type: string } | null;
	locations?: { name: string } | null;
	check_in_date: string;
	check_out_date: string;
	nights: number;
	room_rate: number;
	total_amount: number;
	paid_amount: number | null;
	balance_amount: number | null;
}

export const useReservationFinancials = () => {
	const { tenant } = useAuth();
	const { selectedLocation } = useLocationContext();

	return useQuery({
		queryKey: ["reservation-financials", tenant?.id, selectedLocation],
		queryFn: async () => {
			if (!tenant?.id || !selectedLocation) {
				throw new Error("Missing tenant or location");
			}

			// Get basic reservation data with related tables
			const { data: reservations, error } = await supabase
				.from("reservations")
				.select(`
					*,
					rooms(room_number, room_type),
					locations(name)
				`)
				.eq("tenant_id", tenant.id)
				.eq("location_id", selectedLocation)
				.order("created_at", { ascending: false });

			if (error) throw error;

			// Get income records for expense calculations
			const { data: incomeRecords, error: incomeError } = await supabase
				.from("income")
				.select("*")
				.eq("tenant_id", tenant.id)
				.in("booking_id", reservations?.map((r) => r.id) || []);

			if (incomeError) throw incomeError;

			// Calculate financial data with USD conversion using proper currency conversion
			const financialData: ReservationFinancial[] = await Promise.all(
				reservations?.map(async (reservation) => {
			// Convert reservation amounts to USD
			const roomAmountOriginal = reservation.room_rate * reservation.nights;
			const roomAmountUsd = await convertCurrency(
				roomAmountOriginal,
				reservation.currency,
				"USD",
				tenant.id,
				reservation.location_id,
			);
			const paidAmountUsd = await convertCurrency(
				reservation.paid_amount || 0,
				reservation.currency,
				"USD",
				tenant.id,
				reservation.location_id,
			);					// Calculate expenses from income records with proper currency conversion
					const reservationIncomeRecords =
						incomeRecords?.filter((inc) => inc.booking_id === reservation.id) ||
						[];

			// Convert each income record to USD individually
			const expensesUsdPromises = reservationIncomeRecords.map(
				async (inc) => {
					return await convertCurrency(
						Number(inc.amount),
						inc.currency,
						"USD",
						tenant.id,
						reservation.location_id,
					);
				},
			);					const expensesUsdArray = await Promise.all(expensesUsdPromises);
					const expensesUsd = expensesUsdArray.reduce(
						(sum, amount) => sum + amount,
						0,
					);
					const needsToPayUsd = roomAmountUsd + expensesUsd - paidAmountUsd;

					return {
						id: reservation.id,
						reservation_number: reservation.reservation_number,
						guest_name: reservation.guest_name,
						status: reservation.status,
						currency: reservation.currency,
						room_amount_usd: Math.round(roomAmountUsd * 100) / 100,
						expenses_usd: Math.round(expensesUsd * 100) / 100,
						user_paid_amount_usd: Math.round(paidAmountUsd * 100) / 100,
						needs_to_pay_usd: Math.round(needsToPayUsd * 100) / 100,
						rooms: reservation.rooms,
						locations: reservation.locations,
						check_in_date: reservation.check_in_date,
						check_out_date: reservation.check_out_date,
						nights: reservation.nights,
						room_rate: reservation.room_rate,
						total_amount: reservation.total_amount,
						paid_amount: reservation.paid_amount,
						balance_amount: reservation.balance_amount,
					};
				}) || [],
			);

			return financialData;
		},
		enabled: !!tenant?.id && !!selectedLocation,
	});
};
