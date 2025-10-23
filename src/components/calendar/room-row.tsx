import { format, parseISO } from "date-fns";
import { Plus } from "lucide-react";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
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
		<TooltipProvider>
			<div className="border-b last:border-b-0 hover:bg-muted/20 transition-colors">
				<div className="flex w-full">
					{/* Room Info Column - Compact */}
					<div className="w-16 sm:w-20 shrink-0 px-1.5 py-3 border-r flex items-center justify-center">
						<div className="font-bold text-[10px] sm:text-xs truncate">
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

							return (
								<div
									key={dayIndex}
									className={cn(
										"flex-1 h-12 border-r last:border-r-0 relative flex items-center justify-center",
										isOccupied && !bookingStartingToday && !externalBookingStartingToday && "bg-muted/10",
									)}
									style={{ minWidth: "32px" }}
								>
									{/* Render external bookings first (below direct bookings) */}
									{externalBookingStartingToday && (
										<ExternalBookingBlock
											booking={externalBookingStartingToday}
											startIndex={dayIndex}
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
													className="absolute cursor-pointer transition-all z-20 flex items-center justify-center overflow-visible hover:brightness-110"
													style={{
														left: "50%",
														width: `${(bookingStartingToday.span.spanDays - 1) * 40}px`,
														top: "0",
														bottom: "0",
														opacity: 0.8,
													}}
													onClick={() => onBookingClick(bookingStartingToday)}
												>
													{/* Start indicator dot */}
													<div
														className={cn(
															"absolute left-0 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full border-[2.5px] border-white shadow-md z-30",
															getStatusColor(bookingStartingToday.status),
														)}
														style={{ left: "-5px" }}
													/>
													{/* End indicator dot */}
													<div
														className={cn(
															"absolute right-0 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full border-[2.5px] border-white shadow-md z-30",
															getStatusColor(bookingStartingToday.status),
														)}
														style={{ right: "-5px" }}
													/>
													{/* Main booking shape */}
													<div
														className={cn(
															"absolute inset-0 shadow-sm",
															getStatusColor(bookingStartingToday.status),
														)}
													/>
													{/* Content */}
													<div className="absolute inset-0 flex items-center px-2 py-1 z-10">
														<span className="text-white text-xs font-semibold truncate flex-1 drop-shadow-sm">
															{bookingStartingToday.guest_name}
														</span>
														{bookingStartingToday.span.spanDays >= 2 && (
															<span className="text-white text-[10px] font-medium ml-1 drop-shadow-sm shrink-0">
																({bookingStartingToday.adults +
																	(bookingStartingToday.children || 0)})
															</span>
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
													{bookingStartingToday.span.spanDays}
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
											</TooltipContent>
										</Tooltip>
									)}

									{!isOccupied && (
										<button
											className="w-full h-full hover:bg-primary/10 transition-colors flex items-center justify-center group"
											onClick={() => onQuickBook(room, day)}
											title={`Book ${room.room_number} for ${format(day, "MMM dd, yyyy")}`}
										>
											<Plus className="size-4 text-muted-foreground/40 group-hover:text-primary group-hover:scale-125 transition-all" />
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
