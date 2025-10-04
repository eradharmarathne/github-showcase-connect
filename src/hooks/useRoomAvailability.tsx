import { useQuery } from "@tanstack/react-query";
import { format, isWithinInterval, parseISO } from "date-fns";
import { useLocationContext } from "@/context/LocationContext";
import { useTenant } from "@/hooks/useTenant";
import { supabase } from "@/integrations/supabase/client";

interface UseRoomAvailabilityOptions {
	roomId?: string;
	startDate?: Date;
	endDate?: Date;
	excludeReservationId?: string;
}

export function useRoomAvailability({
	roomId,
	startDate,
	endDate,
	excludeReservationId,
}: UseRoomAvailabilityOptions = {}) {
	const { selectedLocation } = useLocationContext();
	const { tenant } = useTenant();

	const { data: reservations = [], isLoading } = useQuery({
		queryKey: [
			"room-availability",
			roomId,
			selectedLocation,
			tenant?.id,
			startDate ? format(startDate, "yyyy-MM-dd") : null,
			endDate ? format(endDate, "yyyy-MM-dd") : null,
		],
		queryFn: async () => {
			if (!selectedLocation || !tenant?.id) return [];

			let query = supabase
				.from("reservations")
				.select("id, check_in_date, check_out_date, room_id, status")
				.eq("tenant_id", tenant.id)
				.eq("location_id", selectedLocation)
				.neq("status", "cancelled"); // Exclude cancelled reservations

			// Filter by room if specified
			if (roomId) {
				query = query.eq("room_id", roomId);
			}

			// Filter by date range if specified
			if (startDate && endDate) {
				const start = format(startDate, "yyyy-MM-dd");
				const end = format(endDate, "yyyy-MM-dd");
				query = query.or(
					`check_in_date.lte.${end},check_out_date.gte.${start}`,
				);
			}

			// Exclude specific reservation if editing
			if (excludeReservationId) {
				query = query.neq("id", excludeReservationId);
			}

			const { data, error } = await query;

			if (error) throw error;
			
			// Debug logging for room availability queries
			console.log("🔍 Room availability query result:", {
				location: selectedLocation,
				tenant: tenant.id,
				roomId,
				startDate: startDate ? format(startDate, "yyyy-MM-dd") : null,
				endDate: endDate ? format(endDate, "yyyy-MM-dd") : null,
				excludeReservationId,
				reservationsFound: data?.length || 0,
				reservations: data?.map(r => ({
					id: r.id,
					roomId: r.room_id,
					checkIn: r.check_in_date,
					checkOut: r.check_out_date,
					status: r.status
				})) || []
			});
			
			return data || [];
		},
		enabled: !!selectedLocation && !!tenant?.id,
	});

	/**
	 * Check if a specific date is available for a room
	 */
	const isDateAvailable = (date: Date, roomIdToCheck?: string): boolean => {
		const targetRoomId = roomIdToCheck || roomId;
		if (!targetRoomId) return true; // If no room specified, assume available

		const dateStr = format(date, "yyyy-MM-dd");

		// Check if date falls within any existing reservation
		const isUnavailable = reservations.some((reservation) => {
			// Only check reservations for the target room
			if (reservation.room_id !== targetRoomId) return false;

			const checkIn = parseISO(reservation.check_in_date);
			const checkOut = parseISO(reservation.check_out_date);

			// Date is unavailable if it's between check-in (inclusive) and check-out (exclusive)
			const dateInRange = (
				isWithinInterval(date, {
					start: checkIn,
					end: checkOut,
				}) && format(date, "yyyy-MM-dd") !== format(checkOut, "yyyy-MM-dd")
			);
			
			// Debug logging for room 101
			if (targetRoomId === "74435f82-eb71-40be-8f4e-523bc1a194c2") {
				console.log("🏨 Room 101 availability check:", {
					date: dateStr,
					reservation: {
						id: reservation.id,
						checkIn: format(checkIn, "yyyy-MM-dd"),
						checkOut: format(checkOut, "yyyy-MM-dd"),
						status: reservation.status
					},
					dateInRange,
					isUnavailable: dateInRange
				});
			}
			
			return dateInRange;
		});

		return !isUnavailable;
	};

	/**
	 * Check if a date range is available for a room
	 */
	const isRangeAvailable = (
		checkInDate: Date,
		checkOutDate: Date,
		roomIdToCheck?: string,
	): boolean => {
		const targetRoomId = roomIdToCheck || roomId;
		if (!targetRoomId) return true;

		// Check if there's any overlap with existing reservations
		const hasConflict = reservations.some((reservation) => {
			if (reservation.room_id !== targetRoomId) return false;

			const existingCheckIn = parseISO(reservation.check_in_date);
			const existingCheckOut = parseISO(reservation.check_out_date);

			// Check for any overlap
			// Overlap exists if: (newCheckIn < existingCheckOut) AND (newCheckOut > existingCheckIn)
			const hasOverlap = checkInDate < existingCheckOut && checkOutDate > existingCheckIn;
			
			// Debug logging for room 101
			if (targetRoomId === "74435f82-eb71-40be-8f4e-523bc1a194c2") {
				console.log("🏨 Room 101 range availability check:", {
					requestedRange: {
						checkIn: format(checkInDate, "yyyy-MM-dd"),
						checkOut: format(checkOutDate, "yyyy-MM-dd")
					},
					existingReservation: {
						id: reservation.id,
						checkIn: format(existingCheckIn, "yyyy-MM-dd"),
						checkOut: format(existingCheckOut, "yyyy-MM-dd"),
						status: reservation.status
					},
					hasOverlap,
					available: !hasOverlap
				});
			}
			
			return hasOverlap;
		});

		return !hasConflict;
	};

	/**
	 * Get all unavailable dates for a room in a date range
	 */
	const getUnavailableDates = (
		startRange: Date,
		endRange: Date,
		roomIdToCheck?: string,
	): Date[] => {
		const targetRoomId = roomIdToCheck || roomId;
		if (!targetRoomId) return [];

		const unavailableDates: Date[] = [];
		const currentDate = new Date(startRange);

		while (currentDate <= endRange) {
			if (!isDateAvailable(currentDate, targetRoomId)) {
				unavailableDates.push(new Date(currentDate));
			}
			currentDate.setDate(currentDate.getDate() + 1);
		}

		return unavailableDates;
	};

	/**
	 * Get reservations for a specific room
	 */
	const getRoomReservations = (roomIdToCheck: string) => {
		return reservations.filter((r) => r.room_id === roomIdToCheck);
	};

	return {
		reservations,
		isLoading,
		isDateAvailable,
		isRangeAvailable,
		getUnavailableDates,
		getRoomReservations,
	};
}
