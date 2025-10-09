import { useCallback, useEffect, useState } from "react";
import { useProfile } from "@/hooks/useProfile";
import { supabase } from "@/integrations/supabase/client";

export function useReservationIncomeMapping() {
	const { profile } = useProfile();
	const [reservationIncomeMap, setReservationIncomeMap] = useState<
		Record<string, boolean>
	>({});
	const [loading, setLoading] = useState(true);

	const fetchReservationIncomeMapping = useCallback(async () => {
		if (!profile?.tenant_id) {
			setLoading(false);
			return;
		}

		try {
			setLoading(true);
			const { data, error } = await supabase
				.from("income")
				.select("booking_id")
				.eq("tenant_id", profile.tenant_id)
				.not("booking_id", "is", null);

			if (error) throw error;

			// Create a map of reservation IDs that have income records
			const incomeMap: Record<string, boolean> = {};
			data?.forEach((income) => {
				if (income.booking_id) {
					incomeMap[income.booking_id] = true;
				}
			});
			setReservationIncomeMap(incomeMap);
		} catch (error) {
			console.error("Error fetching reservation income mapping:", error);
		} finally {
			setLoading(false);
		}
	}, [profile?.tenant_id]);

	useEffect(() => {
		fetchReservationIncomeMapping();
	}, [fetchReservationIncomeMapping]);

	return {
		reservationIncomeMap,
		loading,
		refetch: fetchReservationIncomeMapping,
	};
}
