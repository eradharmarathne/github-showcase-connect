import { format, parseISO } from "date-fns";
import { Plus } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import type { Database } from "@/integrations/supabase/types";
import { cn } from "@/lib/utils";
import { ExternalBookingBlock } from "./external-booking-block";
import type { ExternalBooking } from "./timeline-view";

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

interface BookingSpan {
	startIndex: number;
	spanDays: number;
	isVisible: boolean;
}

interface RoomRowProps {
	room: Room;
	calendarDays: Date[];
	reservations: Reservation[];
	externalBookings: ExternalBooking[];
	onBookingClick: (booking: Reservation | ExternalBooking) => void;
	onQuickBook: (room: Room, date: Date) => void;
	getStatusColor: (status: string) => string;
	getCurrencySymbol: (currency: string) => string;
	calculateBookingSpan: (
		booking: Reservation,
		calendarDays: Date[],
	) => BookingSpan;
}

export function RoomRow({
	room,
	calendarDays,
	reservations,
	externalBookings,
	onBookingClick,
	onQuickBook,
	getStatusColor,
	getCurrencySymbol,
	calculateBookingSpan,
}: RoomRowProps) {
	const isMobile = useIsMobile();

	// Filter reservations for this room
	const roomBookings = reservations
		.filter((reservation) => reservation.room_id === room.id)
		.map((booking) => ({
			...booking,
			span: calculateBookingSpan(booking, calendarDays),
		}))
		.filter((booking) => booking.span.isVisible);

	// Filter external bookings for this room
	const roomExternalBookings = externalBookings
		.filter((booking) => booking.room_id === room.id)
		.map((booking) => {
			// Convert external booking to match reservation format for span calculation
			const fakeReservation = {
				...booking,
				room_id: booking.room_id || room.id,
				check_in_date: booking.check_in,
				check_out_date: booking.check_out,
				total_amount: booking.total_amount || 0,
				currency: booking.currency || "USD",
				adults: booking.adults || 0,
				children: booking.children || 0,
				reservation_number: booking.external_id,
			};
			return {
				...booking,
				span: calculateBookingSpan(fakeReservation as any, calendarDays),
			};
		})
		.filter((booking) => booking.span.isVisible);

	return (
		<div className="border-b last:border-b-0 hover:bg-muted/20 transition-colors">
			<div className="flex w-full">
				{/* Room Info Column - Compact & Responsive */}
				<div className="w-24 sm:w-28 md:w-32 shrink-0 px-1.5 sm:px-2 py-1 border-r flex items-center">
					<div className="font-medium text-[10px] sm:text-xs truncate">
						{room.room_number}
					</div>
				</div>

				{/* Calendar Grid - Full width responsive */}
				<div className="flex flex-1 relative">
					{calendarDays.map((day, dayIndex) => {
						// Find booking that starts on this day
						const bookingStartingToday = roomBookings.find(
							(booking) => booking.span.startIndex === dayIndex,
						);

						// Find external booking that starts on this day
						const externalBookingStartingToday = roomExternalBookings.find(
							(booking) => booking.span.startIndex === dayIndex,
						);

						// Check if this day is occupied by any booking
						const isOccupied =
							roomBookings.some(
								(booking) =>
									dayIndex >= booking.span.startIndex &&
									dayIndex < booking.span.startIndex + booking.span.spanDays,
							) ||
							roomExternalBookings.some(
								(booking) =>
									dayIndex >= booking.span.startIndex &&
									dayIndex < booking.span.startIndex + booking.span.spanDays,
							);

						const cellWidth = isMobile ? 32 : 40;

						return (
							<div
								key={dayIndex}
								className={cn(
									"flex-1 min-w-[32px] sm:min-w-[40px] h-8 sm:h-9 border-r last:border-r-0 relative flex items-center justify-center",
									isOccupied && !bookingStartingToday && "bg-muted/20",
								)}
							>
								{/* Render external bookings first (below direct bookings) */}
								{externalBookingStartingToday && (
									<ExternalBookingBlock
										booking={externalBookingStartingToday}
										startIndex={externalBookingStartingToday.span.startIndex}
										spanDays={externalBookingStartingToday.span.spanDays}
										getCurrencySymbol={getCurrencySymbol}
										onClick={onBookingClick}
									/>
								)}

								{/* Render direct bookings on top */}
								{bookingStartingToday && (
									<div
										className={cn(
											"absolute inset-[1px] rounded-sm cursor-pointer transition-all z-10 flex items-center justify-center overflow-visible group",
											getStatusColor(bookingStartingToday.status),
										)}
										style={{
											width: `calc(${bookingStartingToday.span.spanDays * 100}% + ${(bookingStartingToday.span.spanDays - 1) * cellWidth}px)`,
										}}
										onClick={() => onBookingClick(bookingStartingToday)}
									>
										{/* Tooltip on hover - improved visibility */}
										<div className="absolute hidden group-hover:block bottom-full left-1/2 -translate-x-1/2 mb-2 z-40 pointer-events-none">
											<div className="bg-popover text-popover-foreground border border-border rounded-lg shadow-xl p-3 text-xs min-w-[200px]">
												<div className="font-semibold text-sm mb-2 text-foreground">
													{bookingStartingToday.guest_name}
												</div>
												<div className="space-y-1">
													<div className="flex justify-between gap-4">
														<span className="text-muted-foreground">
															Check-in:
														</span>
														<span className="font-medium">
															{format(
																parseISO(bookingStartingToday.check_in_date),
																"MMM dd, yyyy",
															)}
														</span>
													</div>
													<div className="flex justify-between gap-4">
														<span className="text-muted-foreground">
															Check-out:
														</span>
														<span className="font-medium">
															{format(
																parseISO(bookingStartingToday.check_out_date),
																"MMM dd, yyyy",
															)}
														</span>
													</div>
													<div className="flex justify-between gap-4">
														<span className="text-muted-foreground">
															Status:
														</span>
														<span className="font-medium capitalize">
															{bookingStartingToday.status.replace("_", " ")}
														</span>
													</div>
													<div className="flex justify-between gap-4">
														<span className="text-muted-foreground">
															Guests:
														</span>
														<span className="font-medium">
															{bookingStartingToday.adults +
																(bookingStartingToday.children || 0)}
														</span>
													</div>
													<div className="flex justify-between gap-4">
														<span className="text-muted-foreground">
															Amount:
														</span>
														<span className="font-medium">
															{getCurrencySymbol(bookingStartingToday.currency)}
															{bookingStartingToday.total_amount.toLocaleString()}
														</span>
													</div>
													<div className="flex justify-between gap-4">
														<span className="text-muted-foreground">
															Booking #:
														</span>
														<span className="font-medium text-xs">
															{bookingStartingToday.reservation_number}
														</span>
													</div>
												</div>
											</div>
										</div>

										{/* Compact content - just initials or dot for mobile */}
										<div className="text-white text-[8px] sm:text-[9px] md:text-[10px] font-semibold truncate px-0.5">
											{isMobile && bookingStartingToday.span.spanDays < 3
												? "•"
												: bookingStartingToday.guest_name
														.split(" ")
														.map((n) => n[0])
														.join("")
														.slice(0, 3)}
										</div>
									</div>
								)}

								{!isOccupied && (
									<button
										className="w-full h-full hover:bg-primary/10 transition-colors flex items-center justify-center group"
										onClick={() => onQuickBook(room, day)}
										title={`Book ${room.room_number} for ${format(day, "MMM dd, yyyy")}`}
									>
										<Plus className="size-3 text-muted-foreground/30 group-hover:text-primary group-hover:scale-125 transition-all" />
									</button>
								)}
							</div>
						);
					})}
				</div>
			</div>
		</div>
	);
}
