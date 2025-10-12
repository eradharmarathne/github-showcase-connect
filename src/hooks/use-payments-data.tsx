import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/context/auth-context";
import { useLocationContext } from "@/context/location-context";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export type PaymentWithReservation = {
	id: string;
	amount: number;
	payment_method: string;
	currency: string;
	date: string;
	note: string | null;
	created_at: string;
	is_advance: boolean;
	type: string;
	booking_source: string | null;

	// Reservation details
	booking_id: string | null;
	reservation_number: string | null;
	guest_name: string | null;
	guest_email: string | null;
	guest_phone: string | null;
	room_number: string | null;
	room_type: string | null;
	check_in_date: string | null;
	check_out_date: string | null;
	nights: number | null;
	adults: number | null;
	children: number | null;
	reservation_status: string | null;
	total_amount: number | null;
	paid_amount: number | null;
	balance_amount: number | null;

	// Account details
	account_id: string | null;
	account_name: string | null;
};

export function usePaymentsData() {
	const { toast } = useToast();
	const { tenant } = useAuth();
	const { selectedLocation } = useLocationContext();

	const {
		data: payments = [],
		isLoading: loading,
		error,
		refetch,
	} = useQuery({
		queryKey: ["payments", tenant?.id, selectedLocation],
		queryFn: async () => {
			if (!tenant?.id || !selectedLocation) return [];

			const { data, error } = await supabase
				.from("income")
				.select(`
					id,
					amount,
					payment_method,
					currency,
					date,
					note,
					created_at,
					is_advance,
					type,
					booking_source,
					booking_id,
					account_id,
					reservations:booking_id (
						id,
						reservation_number,
						guest_name,
						guest_email,
						guest_phone,
						check_in_date,
						check_out_date,
						nights,
						adults,
						children,
						status,
						total_amount,
						paid_amount,
						balance_amount,
						rooms (
							room_number,
							room_type
						)
					),
					accounts (
						name
					)
				`)
				.eq("tenant_id", tenant.id)
				.eq("location_id", selectedLocation)
				.order("date", { ascending: false })
				.order("created_at", { ascending: false });

			if (error) {
				console.error("Error fetching payments:", error);
				toast({
					title: "Error",
					description: "Failed to fetch payments data",
					variant: "destructive",
				});
				throw error;
			}

			// Transform the data to flatten the nested structure
			const transformedData: PaymentWithReservation[] = data.map((payment) => ({
				id: payment.id,
				amount: payment.amount,
				payment_method: payment.payment_method,
				currency: payment.currency,
				date: payment.date,
				note: payment.note,
				created_at: payment.created_at,
				is_advance: payment.is_advance,
				type: payment.type,
				booking_source: payment.booking_source,
				booking_id: payment.booking_id,
				account_id: payment.account_id,

				// Reservation details (flatten from nested structure)
				reservation_number: payment.reservations?.reservation_number || null,
				guest_name: payment.reservations?.guest_name || null,
				guest_email: payment.reservations?.guest_email || null,
				guest_phone: payment.reservations?.guest_phone || null,
				room_number: payment.reservations?.rooms?.room_number || null,
				room_type: payment.reservations?.rooms?.room_type || null,
				check_in_date: payment.reservations?.check_in_date || null,
				check_out_date: payment.reservations?.check_out_date || null,
				nights: payment.reservations?.nights || null,
				adults: payment.reservations?.adults || null,
				children: payment.reservations?.children || null,
				reservation_status: payment.reservations?.status || null,
				total_amount: payment.reservations?.total_amount || null,
				paid_amount: payment.reservations?.paid_amount || null,
				balance_amount: payment.reservations?.balance_amount || null,

				// Account details
				account_name: payment.accounts?.name || null,
			}));

			return transformedData;
		},
		enabled: !!tenant?.id && !!selectedLocation,
	});

	return {
		payments,
		loading,
		error,
		refetch,
	};
}
