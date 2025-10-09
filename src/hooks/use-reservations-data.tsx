import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useLocationContext } from "@/context/LocationContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export type ReservationWithJoins = {
	id: string;
	reservation_number: string;
	location_id: string;
	room_id: string;
	guest_name: string;
	guest_email?: string | null;
	guest_phone?: string | null;
	guest_address?: string | null;
	guest_id_number?: string | null;
	guest_nationality?: string | null;
	adults: number;
	children: number;
	check_in_date: string;
	check_out_date: string;
	nights: number;
	room_rate: number;
	total_amount: number;
	advance_amount?: number | null;
	paid_amount?: number | null;
	balance_amount?: number | null;
	currency: "LKR" | "USD" | "EUR" | "GBP";
	status:
		| "pending"
		| "confirmed"
		| "checked_in"
		| "checked_out"
		| "cancelled"
		| "tentative";
	special_requests?: string | null;
	arrival_time?: string | null;
	created_by?: string | null;
	grc_approved: boolean;
	grc_approved_by?: string | null;
	grc_approved_at?: string | null;
	created_at: string;
	updated_at: string;
	tenant_id?: string | null;
	guide_id?: string | null;
	agent_id?: string | null;
	guide_commission?: number | null;
	agent_commission?: number | null;
	booking_source: string;
	locations: {
		id: string;
		name: string;
		address: string | null;
		phone: string | null;
		email: string | null;
		property_type: string | null;
		tenant_id: string;
		is_active: boolean;
		created_at: string;
	} | null;
	rooms: {
		id: string;
		room_number: string;
		room_type: string;
		bed_type: string;
		description: string | null;
		amenities: string[] | null;
		base_price: number;
		max_occupancy: number;
		property_type: string;
		currency: string;
		location_id: string;
		tenant_id: string;
		is_active: boolean;
		created_at: string;
		updated_at: string;
	} | null;
	guides?: {
		id: string;
		name: string;
		phone: string | null;
		email: string | null;
		address: string | null;
		license_number: string | null;
		is_active: boolean;
	} | null;
	agents?: {
		id: string;
		name: string;
		phone: string | null;
		email: string | null;
		agency_name: string | null;
		is_active: boolean;
	} | null;
};

export type IncomeRecord = {
	id: string;
	booking_id: string | null;
	amount: number;
	payment_method: string;
	currency: string;
	created_at: string;
	date: string;
	note?: string | null;
};

export function useReservationsData() {
	const { user } = useAuth();
	const { selectedLocation } = useLocationContext();
	const { toast } = useToast();

	const [reservations, setReservations] = useState<ReservationWithJoins[]>([]);
	const [loading, setLoading] = useState(true);

	const fetchReservations = useCallback(async () => {
		if (!selectedLocation || !user) return;

		try {
			setLoading(true);

			const { data: reservationsData, error: reservationsError } =
				await supabase
					.from("reservations")
					.select(`
					*,
					locations(id, name, address, phone, email, property_type, tenant_id, is_active, created_at),
					rooms(id, room_number, room_type, bed_type, description, amenities, base_price, max_occupancy, property_type, currency, location_id, tenant_id, is_active, created_at, updated_at),
					guides(id, name, phone, email, address, license_number, is_active),
					agents(id, name, phone, email, agency_name, is_active)
				`)
					.eq("location_id", selectedLocation)
					.order("created_at", { ascending: false });

			if (reservationsError) throw reservationsError;

			setReservations(reservationsData || []);
		} catch (error) {
			console.error("Error fetching reservations:", error);
			toast({
				title: "Error",
				description: "Failed to fetch reservations data",
				variant: "destructive",
			});
		} finally {
			setLoading(false);
		}
	}, [selectedLocation, user, toast]);

	useEffect(() => {
		fetchReservations();
	}, [fetchReservations]);

	return {
		reservations,
		loading,
		refetch: fetchReservations,
	};
}

export function useIncomeData() {
	const { user } = useAuth();
	const { selectedLocation } = useLocationContext();
	const { toast } = useToast();

	const [incomeRecords, setIncomeRecords] = useState<IncomeRecord[]>([]);
	const [loading, setLoading] = useState(true);

	const fetchIncomeRecords = useCallback(async () => {
		if (!selectedLocation || !user) return;

		try {
			setLoading(true);

			const { data: incomeData, error: incomeError } = await supabase
				.from("income")
				.select(
					"id, booking_id, amount, payment_method, currency, created_at, date, note",
				)
				.eq("location_id", selectedLocation)
				.order("created_at", { ascending: false });

			if (incomeError) throw incomeError;

			setIncomeRecords(incomeData || []);
		} catch (error) {
			console.error("Error fetching income records:", error);
			toast({
				title: "Error",
				description: "Failed to fetch income data",
				variant: "destructive",
			});
		} finally {
			setLoading(false);
		}
	}, [selectedLocation, user, toast]);

	useEffect(() => {
		fetchIncomeRecords();
	}, [fetchIncomeRecords]);

	return {
		incomeRecords,
		loading,
		refetch: fetchIncomeRecords,
	};
}
