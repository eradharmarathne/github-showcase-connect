import { useQuery } from "@tanstack/react-query";
import {
	addDays,
	differenceInDays,
	eachDayOfInterval,
	endOfDay,
	format,
	isSameDay,
	isWithinInterval,
	parseISO,
	startOfDay,
} from "date-fns";
import { useLocationContext } from "@/context/location-context";
import { useTenant } from "@/hooks/use-tenant";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { TimelineViewSkeleton } from "../skeleton/timeline-view-skelton";
import { CalendarLegend, RoomRow } from ".";

type Room = Database["public"]["Tables"]["rooms"]["Row"];
type Reservation = {
	id: string;
	room_id: string;
	guest_name: string;
	check_in_date: string;
	check_out_date: string;
	status: string;
	total_amount: number;
	currency: string;
	adults: number;
	children: number | null;
	reservation_number: string;
};

export type ExternalBooking = {
	id: string;
	room_id: string | null;
	external_id: string;
	property_id: string;
	source: string;
	guest_name: string;
	check_in: string;
	check_out: string;
	status: string;
	total_amount: number | null;
	currency: string | null;
	adults: number | null;
	children: number | null;
	room_name: string | null;
};

interface BookingSpan {
	startIndex: number;
	spanDays: number;
	isVisible: boolean;
}

interface SourceFilters {
	direct: boolean;
	booking_com: boolean;
	airbnb: boolean;
	expedia: boolean;
	beds24: boolean;
	other: boolean;
}

interface TimelineViewProps {
	currentDate: Date;
	searchTerm: string;
	statusFilter: string;
	roomFilter: string;
	sourceFilters?: SourceFilters;
	onBookingClick: (booking: Reservation | ExternalBooking) => void;
	onQuickBook: (room: Room, date: Date) => void;
	getStatusColor: (status: string) => string;
	getCurrencySymbol: (currency: string) => string;
}

export function TimelineView({
	currentDate,
	searchTerm,
	statusFilter,
	roomFilter,
	sourceFilters,
	onBookingClick,
	onQuickBook,
	getStatusColor,
	getCurrencySymbol,
}: TimelineViewProps) {
	const { selectedLocation } = useLocationContext();
	const { tenant } = useTenant();

	// Fetch rooms
	const { data: rooms = [], isLoading: roomsLoading } = useQuery({
		queryKey: ["rooms", selectedLocation, tenant?.id],
		queryFn: async () => {
			if (!selectedLocation || !tenant?.id) return [];

			const { data, error } = await supabase
				.from("rooms")
				.select("*")
				.eq("tenant_id", tenant.id)
				.eq("location_id", selectedLocation)
				.eq("is_active", true)
				.order("room_number");

			if (error) throw error;
			return data || [];
		},
		enabled: !!selectedLocation && !!tenant?.id,
	});

	// Fetch reservations - optimized for 30-day view
	const { data: reservations = [], isLoading: reservationsLoading } = useQuery({
		queryKey: ["reservations", selectedLocation, tenant?.id, currentDate],
		queryFn: async () => {
			if (!selectedLocation || !tenant?.id) return [];

			const viewStart = startOfDay(currentDate);
			const viewEnd = addDays(viewStart, 29);

			const { data, error } = await supabase
				.from("reservations")
				.select(
					"id, room_id, guest_name, check_in_date, check_out_date, status, total_amount, currency, adults, children, reservation_number",
				)
				.eq("tenant_id", tenant.id)
				.eq("location_id", selectedLocation)
				.or(
					`check_in_date.lte.${format(viewEnd, "yyyy-MM-dd")},check_out_date.gte.${format(viewStart, "yyyy-MM-dd")}`,
				)
				.order("check_in_date", { ascending: true });

			if (error) throw error;
			return data || [];
		},
		enabled: !!selectedLocation && !!tenant?.id,
		staleTime: 30000, // Cache for 30 seconds
	});

	// Fetch external bookings (Booking.com, Airbnb, etc.)
	const { data: externalBookings = [], isLoading: externalBookingsLoading } =
		useQuery({
			queryKey: [
				"external_bookings",
				selectedLocation,
				tenant?.id,
				currentDate,
			],
			queryFn: async () => {
				if (!selectedLocation || !tenant?.id) return [];

				const viewStart = startOfDay(currentDate);
				const viewEnd = addDays(viewStart, 29);

			const { data, error } = await supabase
				.from("external_bookings")
				.select(
					"id, room_id, external_id, property_id, source, guest_name, check_in, check_out, status, total_amount, currency, adults, children, room_name",
				)
				.eq("tenant_id", tenant.id)
				.eq("location_id", selectedLocation)
				.or(
					`check_in.lte.${format(viewEnd, "yyyy-MM-dd")},check_out.gte.${format(viewStart, "yyyy-MM-dd")}`,
				)
				.order("check_in", { ascending: true });				if (error) throw error;
				return data || [];
			},
			enabled: !!selectedLocation && !!tenant?.id,
			staleTime: 30000, // Cache for 30 seconds
		});

	// Generate calendar days - 30 days from current date
	const startDate = startOfDay(currentDate);
	const endDate = addDays(startDate, 29); // 30 days total (0-29)
	const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });

	// Calculate booking span
	const calculateBookingSpan = (
		booking: Reservation,
		calendarDays: Date[],
	): BookingSpan => {
		const checkIn = parseISO(booking.check_in_date);
		const checkOut = parseISO(booking.check_out_date);

		const monthStart = calendarDays[0];
		const monthEnd = calendarDays[calendarDays.length - 1];

		// Check if booking overlaps with the month
		const bookingStart = startOfDay(checkIn);
		const bookingEnd = endOfDay(checkOut);
		const monthInterval = {
			start: startOfDay(monthStart),
			end: endOfDay(monthEnd),
		};

		const isVisible =
			isWithinInterval(bookingStart, monthInterval) ||
			isWithinInterval(bookingEnd, monthInterval) ||
			(bookingStart <= monthInterval.start && bookingEnd >= monthInterval.end);

		if (!isVisible) {
			return { startIndex: -1, spanDays: 0, isVisible: false };
		}

		// Find start index
		const effectiveStart =
			bookingStart < monthInterval.start ? monthStart : checkIn;
		const startIndex = calendarDays.findIndex((day) =>
			isSameDay(day, effectiveStart),
		);

		// Calculate span days
		const effectiveEnd = bookingEnd > monthInterval.end ? monthEnd : checkOut;
		const spanDays = Math.max(
			1,
			differenceInDays(effectiveEnd, effectiveStart) + 1,
		);

		return {
			startIndex: Math.max(0, startIndex),
			spanDays: Math.min(
				spanDays,
				calendarDays.length - Math.max(0, startIndex),
			),
			isVisible: true,
		};
	};

	// Apply filters to rooms
	const filteredRooms = rooms.filter((room) => {
		if (roomFilter !== "all" && room.id !== roomFilter) {
			return false;
		}
		return true;
	});

	// Group rooms by room_type
	const groupedRooms = filteredRooms.reduce(
		(acc, room) => {
			const type = room.room_type || "Other";
			if (!acc[type]) {
				acc[type] = [];
			}
			acc[type].push(room);
			return acc;
		},
		{} as Record<string, typeof filteredRooms>,
	);

	// Apply filters to reservations
	const filteredReservations = reservations.filter((reservation) => {
		// Source filter - hide direct bookings if disabled
		if (sourceFilters && !sourceFilters.direct) {
			return false;
		}

		// Search filter
		if (searchTerm.trim()) {
			const searchLower = searchTerm.toLowerCase();
			const matchesSearch =
				reservation.guest_name.toLowerCase().includes(searchLower) ||
				reservation.reservation_number.toLowerCase().includes(searchLower);

			if (!matchesSearch) return false;
		}

		// Status filter
		if (statusFilter !== "all" && reservation.status !== statusFilter) {
			return false;
		}

		return true;
	});

	// Apply filters to external bookings
	const filteredExternalBookings = externalBookings.filter((booking) => {
		// Source filter
		if (sourceFilters) {
			const source = booking.source.toLowerCase();
			if (source === "booking_com" && !sourceFilters.booking_com) return false;
			if (source === "airbnb" && !sourceFilters.airbnb) return false;
			if (source === "expedia" && !sourceFilters.expedia) return false;
			if (source === "beds24" && !sourceFilters.beds24) return false;
			if (
				!["booking_com", "airbnb", "expedia", "beds24"].includes(source) &&
				!sourceFilters.other
			)
				return false;
		}

		// Search filter
		if (searchTerm.trim()) {
			const searchLower = searchTerm.toLowerCase();
			const matchesSearch =
				booking.guest_name.toLowerCase().includes(searchLower) ||
				booking.external_id.toLowerCase().includes(searchLower);

			if (!matchesSearch) return false;
		}

		return true;
	});

	if (roomsLoading || reservationsLoading || externalBookingsLoading) {
		return <TimelineViewSkeleton />;
	}

	return (
		<div className="border rounded-lg overflow-hidden bg-background flex flex-col h-fit w-full">
			{/* Calendar Header */}
			<div className="border-b bg-muted/50 sticky top-0 z-20">
				<div className="flex w-full">
					{/* Room Column Header - Compact & Responsive */}
					<div className="w-24 sm:w-28 md:w-32 shrink-0 px-1.5 sm:px-2 py-1.5 border-r font-semibold text-[10px] sm:text-xs flex items-center bg-muted/50">
						Room/Type
					</div>
					{/* Date Headers - Full width responsive */}
					<div className="flex flex-1 bg-muted/50">
						{calendarDays.map((day) => (
							<div
								key={day.toISOString()}
								className="flex-1 min-w-[32px] sm:min-w-[40px] px-0.5 py-0.5 text-center border-r last:border-r-0"
							>
								<div className="text-[8px] sm:text-[9px] md:text-[10px] font-medium text-muted-foreground">
									{format(day, "EEE")}
								</div>
								<div className="text-[9px] sm:text-[10px] md:text-xs font-semibold">
									{format(day, "dd")}
								</div>
							</div>
						))}
					</div>
				</div>
			</div>

			{/* Room Rows */}
			<div className="overflow-y-auto flex-1">
				{filteredRooms.length === 0 ? (
					<div className="p-8 text-center text-muted-foreground">
						No rooms available for the selected filters.
					</div>
				) : (
					<div>
						{Object.entries(groupedRooms).map(([roomType, roomsInGroup]) => (
							<div key={roomType}>
								{/* Room Type Category Header */}
								<div className="bg-muted/80 border-b border-t px-2 py-1 z-10">
									<div className="font-semibold text-[11px] sm:text-xs text-muted-foreground uppercase tracking-wide">
										{roomType}
									</div>
								</div>
								{/* Rooms in this category */}
								{roomsInGroup.map((room) => (
									<RoomRow
										key={room.id}
										room={room}
										calendarDays={calendarDays}
										reservations={filteredReservations}
										externalBookings={filteredExternalBookings}
										onBookingClick={onBookingClick}
										onQuickBook={onQuickBook}
										getStatusColor={getStatusColor}
										getCurrencySymbol={getCurrencySymbol}
										calculateBookingSpan={calculateBookingSpan}
									/>
								))}
							</div>
						))}
					</div>
				)}
			</div>

			{/* Legend */}
			<CalendarLegend className="p-2 sm:p-3 bg-muted/50 border-t" />
		</div>
	);
}
