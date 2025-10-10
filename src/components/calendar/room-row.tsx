import { format, parseISO } from "date-fns";
import { Plus } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import type { Database } from "@/integrations/supabase/types";
import { cn } from "@/lib/utils";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
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
		<TooltipProvider>
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
										totalDays={calendarDays.length}
										getCurrencySymbol={getCurrencySymbol}
										onClick={onBookingClick}
									/>
								)}

								{/* Render direct bookings on top */}
								{bookingStartingToday && (
									<Tooltip>
										<TooltipTrigger asChild>
											<div
												className={cn(
													"absolute inset-y-[2px] cursor-pointer transition-all z-20 flex items-center justify-center overflow-visible",
													getStatusColor(bookingStartingToday.status),
												)}
												style={{
													left: "20%",
													right: `calc(${100 - (bookingStartingToday.span.spanDays * 100)}% + 50%)`,
													clipPath: `polygon(
														0 0,
														6px 50%,
														0 100%,
														calc(100% - 6px) 100%,
														100% 50%,
														calc(100% - 6px) 0
													)`,
													backgroundImage: "repeating-linear-gradient(90deg, transparent 0%, transparent calc(100% / " + bookingStartingToday.span.spanDays + " - 1px), rgba(0,0,0,0.05) calc(100% / " + bookingStartingToday.span.spanDays + " - 1px), rgba(0,0,0,0.05) calc(100% / " + bookingStartingToday.span.spanDays + "))",
												}}
												onClick={() => onBookingClick(bookingStartingToday)}
											>
												{/* Booking details - guest name and count */}
												<div className="text-white capitalize text-[9px] sm:text-[10px] font-semibold truncate px-1 relative z-10 flex items-center gap-1">
													{bookingStartingToday.span.spanDays >= 2 ? (
														<>
															<span className="truncate">{bookingStartingToday.guest_name}</span>
															<span className="shrink-0">• ({bookingStartingToday.adults + (bookingStartingToday.children || 0)} {bookingStartingToday.adults + (bookingStartingToday.children || 0) === 1 ? "guest" : "guests"})</span>
														</>
													) : (
														<span>•</span>
													)}
												</div>
											</div>
										</TooltipTrigger>
										<TooltipContent
											side="top"
											align="center"
											className="p-3 text-xs min-w-[200px]"
										>
											<div className="font-semibold text-sm mb-2">
												{bookingStartingToday.guest_name}
											</div>
											<div className="space-y-1">
												<div className="flex justify-between gap-4">
													<span className="text-muted-foreground">Check-in:</span>
													<span className="font-medium">
														{format(
															parseISO(bookingStartingToday.check_in_date),
															"MMM dd, yyyy",
														)}
													</span>
												</div>
												<div className="flex justify-between gap-4">
													<span className="text-muted-foreground">Check-out:</span>
													<span className="font-medium">
														{format(
															parseISO(bookingStartingToday.check_out_date),
															"MMM dd, yyyy",
														)}
													</span>
												</div>
												<div className="flex justify-between gap-4">
													<span className="text-muted-foreground">Status:</span>
													<span className="font-medium capitalize">
														{bookingStartingToday.status.replace("_", " ")}
													</span>
												</div>
												<div className="flex justify-between gap-4">
													<span className="text-muted-foreground">Guests:</span>
													<span className="font-medium">
														{bookingStartingToday.adults +
															(bookingStartingToday.children || 0)}
													</span>
												</div>
												<div className="flex justify-between gap-4">
													<span className="text-muted-foreground">Amount:</span>
													<span className="font-medium">
														{getCurrencySymbol(bookingStartingToday.currency)}
														{bookingStartingToday.total_amount.toLocaleString()}
													</span>
												</div>
												<div className="flex justify-between gap-4">
													<span className="text-muted-foreground">Booking #:</span>
													<span className="font-medium text-xs">
														{bookingStartingToday.reservation_number}
													</span>
												</div>
											</div>
										</TooltipContent>
									</Tooltip>
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
		</TooltipProvider>
	);
}
