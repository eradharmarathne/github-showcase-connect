import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/context/auth-context";
import { useLocationContext } from "@/context/location-context";
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

			// Fetch direct reservations
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

			// Fetch external bookings (channel manager bookings)
			const { data: externalBookingsData, error: externalBookingsError } =
				await supabase
					.from("external_bookings")
					.select(`
						*,
						locations(id, name, address, phone, email, property_type, tenant_id, is_active, created_at),
						rooms(id, room_number, room_type, bed_type, description, amenities, base_price, max_occupancy, property_type, currency, location_id, tenant_id, is_active, created_at, updated_at)
					`)
					.eq("location_id", selectedLocation)
					.order("last_synced_at", { ascending: false });

			if (externalBookingsError) throw externalBookingsError;

			// Transform external bookings to match ReservationWithJoins format
			const transformedExternalBookings: ReservationWithJoins[] = (
				externalBookingsData || []
			).map((booking) => {
				const rawData = booking.raw_data as any;
				return {
					id: booking.id,
					reservation_number: `${booking.source.toUpperCase()}-${booking.external_id}`,
					location_id: booking.location_id,
					room_id: booking.room_id || "", // May be null if not mapped
					guest_name: booking.guest_name,
					guest_email: rawData?.guest?.email || null,
					guest_phone: rawData?.guest?.phone || null,
					guest_address: null,
					guest_id_number: null,
					guest_nationality: null,
					adults: booking.adults || 0,
					children: booking.children || 0,
					check_in_date: booking.check_in,
					check_out_date: booking.check_out,
					nights: Math.ceil(
						(new Date(booking.check_out).getTime() -
							new Date(booking.check_in).getTime()) /
							(1000 * 60 * 60 * 24),
					),
					room_rate: 0,
					total_amount: booking.total_amount || 0,
					advance_amount: null,
					paid_amount: booking.paid_amount || 0, // Deposit amount paid from Beds24
					balance_amount: booking.balance_amount || 0, // Remaining balance
					currency: (booking.currency || "USD") as
						| "LKR"
						| "USD"
						| "EUR"
						| "GBP",
					status: booking.status as any,
					special_requests: rawData?.notes || null,
					arrival_time: null,
					created_by: null,
					grc_approved: false,
					grc_approved_by: null,
					grc_approved_at: null,
					created_at: booking.last_synced_at,
					updated_at: booking.last_synced_at,
					tenant_id: booking.tenant_id,
					guide_id: null,
					agent_id: null,
					guide_commission: null,
					agent_commission: null,
					booking_source: booking.source, // beds24, airbnb, booking_com, etc.
					locations: booking.locations,
					rooms: booking.rooms,
					guides: null,
					agents: null,
				};
			});

			// Combine direct reservations and external bookings
			const allReservations = [
				...(reservationsData || []),
				...transformedExternalBookings,
			];

			// Sort by check-in date (most recent first)
			allReservations.sort(
				(a, b) =>
					new Date(b.check_in_date).getTime() -
					new Date(a.check_in_date).getTime(),
			);

			setReservations(allReservations);
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
