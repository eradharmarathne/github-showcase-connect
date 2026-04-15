import { useQuery } from "@tanstack/react-query";
import {
	addDays,
	endOfMonth,
	endOfWeek,
	format,
	isSameMonth,
	isToday,
	parseISO,
	startOfDay,
	startOfMonth,
	startOfWeek,
} from "date-fns";
import { Plus } from "lucide-react";
import { useMemo } from "react";
import { useLocationContext } from "@/context/location-context";
import { useTenant } from "@/hooks/use-tenant";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { Skeleton } from "@/components/ui/skeleton";
import { CalendarLegend } from ".";

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
	booking_source: string | null;
};

type ExternalBooking = {
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

interface SourceFilters {
	direct: boolean;
	booking_com: boolean;
	airbnb: boolean;
	expedia: boolean;
	beds24: boolean;
	ical: boolean;
	other: boolean;
}

interface CalendarGridViewProps {
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

type UnifiedBooking = {
	id: string;
	guest_name: string;
	status: string;
	room_id: string | null;
	isExternal: boolean;
	source?: string;
	original: Reservation | ExternalBooking;
};

const MAX_VISIBLE_BOOKINGS = 3;
const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function getSourceBarClasses(source: string): string {
	switch (source.toLowerCase()) {
		case "booking_com":
			return "bg-blue-500/80 dark:bg-blue-400/80 text-white";
		case "airbnb":
			return "bg-pink-500/80 dark:bg-pink-400/80 text-white";
		case "expedia":
			return "bg-yellow-500/80 dark:bg-yellow-400/80 text-white";
		case "beds24":
			return "bg-purple-500/80 dark:bg-purple-400/80 text-white";
		case "ical":
			return "bg-teal-500/80 dark:bg-teal-400/80 text-white";
		default:
			return "bg-muted-foreground/60 text-white";
	}
}

function getStatusBarClasses(status: string): string {
	switch (status) {
		case "confirmed":
			return "bg-emerald-500 dark:bg-emerald-400 text-white";
		case "tentative":
			return "bg-amber-500 dark:bg-amber-400 text-white";
		case "pending":
			return "bg-sky-500 dark:bg-sky-400 text-white";
		case "checked_in":
			return "bg-violet-500 dark:bg-violet-400 text-white";
		case "checked_out":
			return "bg-slate-400 dark:bg-slate-500 text-white";
		case "cancelled":
			return "bg-rose-500 dark:bg-rose-400 text-white";
		default:
			return "bg-slate-400 dark:bg-slate-500 text-white";
	}
}

function GridSkeleton() {
	return (
		<div className="border rounded-xl overflow-hidden bg-card shadow-sm">
			<div className="grid grid-cols-7 border-b bg-muted/50">
				{WEEKDAY_LABELS.map((day) => (
					<div
						key={day}
						className="px-2 py-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider border-r last:border-r-0"
					>
						{day}
					</div>
				))}
			</div>
			<div className="grid grid-cols-7">
				{Array.from({ length: 35 }).map((_, i) => (
					<div
						key={i}
						className="aspect-[4/3] border-r border-b last:border-r-0 p-2"
					>
						<Skeleton className="h-4 w-6 mb-2" />
						{i % 3 === 0 && <Skeleton className="h-4 w-full mb-1 rounded" />}
						{i % 5 === 0 && <Skeleton className="h-4 w-3/4 rounded" />}
					</div>
				))}
			</div>
		</div>
	);
}

export function CalendarGridView({
	currentDate,
	searchTerm,
	statusFilter,
	roomFilter,
	sourceFilters,
	onBookingClick,
	onQuickBook,
}: CalendarGridViewProps) {
	const { selectedLocation } = useLocationContext();
	const { tenant } = useTenant();

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

	const { data: reservations = [], isLoading: reservationsLoading } = useQuery(
		{
			queryKey: ["reservations", selectedLocation, tenant?.id, currentDate],
			queryFn: async () => {
				if (!selectedLocation || !tenant?.id) return [];
				const viewStart = startOfMonth(currentDate);
				const viewEnd = endOfMonth(currentDate);
			const { data, error } = await supabase
				.from("reservations")
				.select(
					"id, room_id, guest_name, check_in_date, check_out_date, status, total_amount, currency, adults, children, reservation_number, booking_source, is_external",
				)
				.eq("tenant_id", tenant.id)
				.eq("location_id", selectedLocation)
				.or(
					`check_in_date.lte.${format(viewEnd, "yyyy-MM-dd")},check_out_date.gte.${format(viewStart, "yyyy-MM-dd")}`,
				)
				.order("check_in_date", { ascending: true });
			if (error) throw error;
			return (data || []).filter((r) => !r.is_external);
			},
			enabled: !!selectedLocation && !!tenant?.id,
			staleTime: 30000,
		},
	);

	const { data: externalBookings = [], isLoading: externalBookingsLoading } =
		useQuery({
			queryKey: [
				"reservations_external",
				selectedLocation,
				tenant?.id,
				currentDate,
			],
			queryFn: async () => {
				if (!selectedLocation || !tenant?.id) return [];
				const viewStart = startOfMonth(currentDate);
				const viewEnd = endOfMonth(currentDate);
				const { data, error } = await supabase
					.from("reservations")
					.select(
						"id, room_id, external_id, property_id, source_channel, guest_name, check_in_timestamp, check_out_timestamp, check_in_date, check_out_date, status, total_amount, currency, adults, children, room_name, is_external",
					)
					.eq("tenant_id", tenant.id)
					.eq("location_id", selectedLocation)
					.eq("is_external", true)
					.or(
						`check_in_date.lte.${format(viewEnd, "yyyy-MM-dd")},check_out_date.gte.${format(viewStart, "yyyy-MM-dd")}`,
					)
					.order("check_in_date", { ascending: true });
				if (error) throw error;
				return (data || []).map((booking) => ({
					...booking,
					source: booking.source_channel || "unknown",
					check_in: booking.check_in_timestamp || booking.check_in_date,
					check_out: booking.check_out_timestamp || booking.check_out_date,
				}));
			},
			enabled: !!selectedLocation && !!tenant?.id,
			staleTime: 30000,
		});

	const filteredRooms = useMemo(() => {
		return rooms.filter((room) => {
			if (roomFilter !== "all" && room.id !== roomFilter) return false;
			return true;
		});
	}, [rooms, roomFilter]);

	const filteredReservations = useMemo(() => {
		return reservations.filter((reservation) => {
			if (sourceFilters) {
				const src = (reservation.booking_source || "direct").toLowerCase();
				if (
					(src === "direct" || src === "manual" || src === "") &&
					!sourceFilters.direct
				)
					return false;
				if (src === "booking_com" && !sourceFilters.booking_com) return false;
				if (src === "airbnb" && !sourceFilters.airbnb) return false;
				if (src === "expedia" && !sourceFilters.expedia) return false;
				if (src === "beds24" && !sourceFilters.beds24) return false;
				if (src === "ical" && !sourceFilters.ical) return false;
				if (
					!["direct", "manual", "", "booking_com", "airbnb", "expedia", "beds24", "ical"].includes(src) &&
					!sourceFilters.other
				)
					return false;
			}
			if (searchTerm.trim()) {
				const s = searchTerm.toLowerCase();
				if (
					!reservation.guest_name.toLowerCase().includes(s) &&
					!reservation.reservation_number.toLowerCase().includes(s)
				)
					return false;
			}
			if (statusFilter !== "all" && reservation.status !== statusFilter)
				return false;
			return true;
		});
	}, [reservations, sourceFilters, searchTerm, statusFilter]);

	const filteredExternalBookings = useMemo(() => {
		return externalBookings.filter((booking) => {
			if (sourceFilters) {
				const source = booking.source.toLowerCase();
				if (source === "booking_com" && !sourceFilters.booking_com) return false;
				if (source === "airbnb" && !sourceFilters.airbnb) return false;
				if (source === "expedia" && !sourceFilters.expedia) return false;
				if (source === "beds24" && !sourceFilters.beds24) return false;
				if (source === "ical" && !sourceFilters.ical) return false;
				if (
					!["booking_com", "airbnb", "expedia", "beds24", "ical"].includes(
						source,
					) &&
					!sourceFilters.other
				)
					return false;
			}
			if (searchTerm.trim()) {
				const s = searchTerm.toLowerCase();
				if (
					!booking.guest_name.toLowerCase().includes(s) &&
					!booking.external_id.toLowerCase().includes(s)
				)
					return false;
			}
			return true;
		});
	}, [externalBookings, sourceFilters, searchTerm]);

	const calendarWeeks = useMemo(() => {
		const monthStart = startOfMonth(currentDate);
		const monthEnd = endOfMonth(currentDate);
		const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 });
		const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

		const weeks: Date[][] = [];
		let day = gridStart;
		while (day <= gridEnd) {
			const week: Date[] = [];
			for (let i = 0; i < 7; i++) {
				week.push(day);
				day = addDays(day, 1);
			}
			weeks.push(week);
		}
		return weeks;
	}, [currentDate]);

	const bookingsByDay = useMemo(() => {
		const map = new Map<string, UnifiedBooking[]>();

		const addToDay = (dateKey: string, booking: UnifiedBooking) => {
			if (!map.has(dateKey)) map.set(dateKey, []);
			map.get(dateKey)!.push(booking);
		};

		for (const res of filteredReservations) {
			const checkIn = startOfDay(parseISO(res.check_in_date));
			const checkOut = startOfDay(parseISO(res.check_out_date));
			const src = (res.booking_source || "direct").toLowerCase();
			const isOtaSource = !["direct", "manual", ""].includes(src);
			let d = checkIn;
			while (d <= checkOut) {
				addToDay(format(d, "yyyy-MM-dd"), {
					id: res.id,
					guest_name: res.guest_name,
					status: res.status,
					room_id: res.room_id,
					isExternal: false,
					source: isOtaSource ? src : undefined,
					original: res,
				});
				d = addDays(d, 1);
			}
		}

		for (const ext of filteredExternalBookings) {
			const checkIn = startOfDay(parseISO(ext.check_in));
			const checkOut = startOfDay(parseISO(ext.check_out));
			let d = checkIn;
			while (d <= checkOut) {
				addToDay(format(d, "yyyy-MM-dd"), {
					id: ext.id,
					guest_name: ext.guest_name,
					status: ext.status,
					room_id: ext.room_id,
					isExternal: true,
					source: ext.source,
					original: ext,
				});
				d = addDays(d, 1);
			}
		}

		return map;
	}, [filteredReservations, filteredExternalBookings]);

	if (roomsLoading || reservationsLoading || externalBookingsLoading) {
		return <GridSkeleton />;
	}

	const totalRooms = filteredRooms.length;
	const firstRoom = filteredRooms[0];
	const weekCount = calendarWeeks.length;

	return (
		<div className="border rounded-xl overflow-hidden bg-card shadow-sm">
			{/* Weekday Header */}
			<div className="grid grid-cols-7 bg-muted/40 border-b">
				{WEEKDAY_LABELS.map((day, i) => (
					<div
						key={day}
						className={`py-2.5 text-center text-[11px] font-bold uppercase tracking-widest ${
							i === 0 || i === 6
								? "text-destructive/70"
								: "text-muted-foreground"
						} ${i < 6 ? "border-r" : ""}`}
					>
						{day}
					</div>
				))}
			</div>

			{/* Calendar Grid - rows stretch to fill available space */}
			<div
				className="grid"
				style={{ gridTemplateRows: `repeat(${weekCount}, minmax(0, 1fr))` }}
			>
				{calendarWeeks.map((week, weekIdx) => (
					<div
						key={weekIdx}
						className="grid grid-cols-7"
					>
						{week.map((day, dayIdx) => {
							const dateKey = format(day, "yyyy-MM-dd");
							const dayBookings = bookingsByDay.get(dateKey) || [];
							const inMonth = isSameMonth(day, currentDate);
							const today = isToday(day);

							const bookedRoomIds = new Set(
								dayBookings
									.filter((b) => b.room_id)
									.map((b) => b.room_id),
							);
							const bookedCount = bookedRoomIds.size;
							const availableCount = Math.max(0, totalRooms - bookedCount);

							const visible = dayBookings.slice(0, MAX_VISIBLE_BOOKINGS);
							const overflow = dayBookings.length - MAX_VISIBLE_BOOKINGS;
							const isWeekend = dayIdx === 0 || dayIdx === 6;

							return (
								<div
									key={dateKey}
									className={`group/cell relative flex flex-col border-b ${dayIdx < 6 ? "border-r" : ""} transition-colors ${
										inMonth
											? isWeekend
												? "bg-muted/20"
												: "bg-card"
											: "bg-muted/40"
									} ${today ? "ring-2 ring-inset ring-primary/40" : ""}`}
									style={{ minHeight: "5.5rem" }}
								>
									{/* Day Header Row */}
									<div className="flex items-center justify-between px-2 pt-1.5 pb-0.5">
										<span
											className={`text-xs font-bold leading-none transition-colors ${
												today
													? "bg-primary text-primary-foreground rounded-full size-6 flex items-center justify-center"
													: inMonth
														? "text-foreground"
														: "text-muted-foreground/50"
											}`}
										>
											{format(day, "d")}
										</span>

										{/* + New Reservation button - visible on hover */}
										{inMonth && firstRoom && (
											<button
												type="button"
												onClick={() => onQuickBook(firstRoom, day)}
												className="opacity-0 group-hover/cell:opacity-100 focus:opacity-100 size-5 flex items-center justify-center rounded-md bg-primary/10 hover:bg-primary/20 text-primary transition-all"
												title="New reservation"
											>
												<Plus className="size-3" />
											</button>
										)}
									</div>

									{/* Booking Bars */}
									<div className="flex-1 px-1 pb-1 space-y-[3px] overflow-hidden">
										{visible.map((booking) => (
											<button
												key={booking.id + dateKey}
												type="button"
												onClick={() => onBookingClick(booking.original)}
												className={`w-full text-left rounded-[4px] px-1.5 py-[2px] text-[10px] leading-tight truncate flex items-center gap-1 cursor-pointer transition-opacity hover:opacity-80 ${
													booking.source
														? getSourceBarClasses(booking.source)
														: getStatusBarClasses(booking.status)
												}`}
											>
												<span className="truncate font-medium">
													{booking.guest_name || "Guest"}
												</span>
											</button>
										))}
										{overflow > 0 && (
											<span className="block text-[9px] text-muted-foreground font-semibold px-1 leading-tight">
												+{overflow} more
											</span>
										)}
									</div>

									{/* Availability Badge */}
									{inMonth && totalRooms > 0 && (
										<div className="px-1.5 pb-1">
											<span
												className={`inline-block rounded-full px-1.5 py-[1px] text-[9px] font-semibold leading-tight ${
													availableCount === 0
														? "bg-destructive/10 text-destructive"
														: availableCount <= 2
															? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
															: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
												}`}
											>
												{availableCount === 0
													? "Full"
													: `${availableCount} avail.`}
											</span>
										</div>
									)}
								</div>
							);
						})}
					</div>
				))}
			</div>

			{/* Legend */}
			<CalendarLegend className="p-2.5 sm:p-3 bg-muted/30 border-t" />
		</div>
	);
}
