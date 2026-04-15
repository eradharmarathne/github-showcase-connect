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
	booking_source: string | null;
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
							// Find ALL bookings that occupy this day
							const allBookingsHere = [
								...roomBookings.map((b) => {
									const src = (b.booking_source || "direct").toLowerCase();
									const hasOtaSource = !["direct", "manual", ""].includes(src);
									return { ...b, isExternal: false, ...(hasOtaSource ? { source: src } : {}) };
								}),
								...roomExternalBookings.map((b) => ({
									...b,
									isExternal: true,
								})),
							].filter(
								(booking) =>
									dayIndex >= booking.span.startIndex &&
									dayIndex < booking.span.startIndex + booking.span.spanDays,
							);

							// Determine what type of day this is for each booking
							const getBookingDayType = (booking: any) => {
								if (!booking) return null;
								const isFirstDay = dayIndex === booking.span.startIndex;
								const isLastDay =
									dayIndex ===
									booking.span.startIndex + booking.span.spanDays - 1;

								if (isFirstDay && isLastDay) return "single"; // 1-day booking
								if (isFirstDay) return "checkin"; // Check-in day
								if (isLastDay) return "checkout"; // Check-out day
								return "middle"; // Middle day (fully occupied)
							};

							// Separate bookings by their day type
							const checkoutBooking = allBookingsHere.find(
								(b) => getBookingDayType(b) === "checkout",
							);
							const checkinBooking = allBookingsHere.find(
								(b) => getBookingDayType(b) === "checkin",
							);
							const middleBooking = allBookingsHere.find(
								(b) => getBookingDayType(b) === "middle",
							);
							const singleBooking = allBookingsHere.find(
								(b) => getBookingDayType(b) === "single",
							);

							// Priority: single > middle > checkout/checkin split
							const hasMultipleBookings = allBookingsHere.length > 1;
							const primaryBooking =
								singleBooking ||
								middleBooking ||
								checkoutBooking ||
								checkinBooking;

							return (
								<Tooltip key={dayIndex}>
									<TooltipTrigger asChild>
										<div
											className={cn(
												"flex-1 h-12 relative cursor-pointer transition-all overflow-hidden",
												primaryBooking && "hover:brightness-110",
												// Add subtle right border only when cell is empty (for day separation)
												!primaryBooking && "border-r border-border/30",
											)}
											style={{ minWidth: "32px" }}
											onClick={() =>
												primaryBooking && onBookingClick(primaryBooking)
											}
										>
											{/* Colored background based on booking status */}

											{/* Handle checkout booking (left half triangle) */}
											{checkoutBooking && (
												<div
													className={cn(
														"absolute inset-y-0 left-0 w-1/2",
														checkoutBooking.isExternal
															? "opacity-60"
															: "opacity-90",
														getStatusColor(checkoutBooking.status),
													)}
													style={{
														clipPath: "polygon(100% 0, 0 0, 0 100%, 50% 100%)",
													}}
												/>
											)}

											{/* Handle checkin booking (right half triangle) */}
											{checkinBooking && (
												<>
													<div
														className={cn(
															"absolute inset-y-0 right-0 w-1/2",
															checkinBooking.isExternal
																? "opacity-60"
																: "opacity-90",
															getStatusColor(checkinBooking.status),
														)}
														style={{
															clipPath:
																"polygon(50% 0, 100% 0, 100% 100%, 0% 100%)",
														}}
													/>
													{/* Booking source badge */}
													{"source" in checkinBooking &&
														checkinBooking.source && (
															<div className="absolute top-0.5 left-1/2 ml-1 z-20">
																<div className="bg-white/90 text-[8px] px-1 py-0.5 rounded font-bold text-blue-600">
																	{checkinBooking.source === "booking_com" &&
																		"B"}
																	{checkinBooking.source === "airbnb" && "A"}
																	{checkinBooking.source === "expedia" && "E"}
																	{checkinBooking.source === "beds24" && "B24"}
																	{checkinBooking.source === "ical" && "iCal"}
																	{!["booking_com", "airbnb", "expedia", "beds24", "ical"].includes(checkinBooking.source) &&
																		checkinBooking.source.slice(0, 3).toUpperCase()}
																</div>
															</div>
														)}
												</>
											)}

											{/* Handle middle day booking (full width) */}
											{middleBooking && !checkoutBooking && !checkinBooking && (
												<div
													className={cn(
														"absolute inset-0",
														middleBooking.isExternal
															? "opacity-60"
															: "opacity-90",
														getStatusColor(middleBooking.status),
													)}
												/>
											)}

											{/* Handle single day booking (diamond shape) */}
											{singleBooking &&
												!checkoutBooking &&
												!checkinBooking &&
												!middleBooking && (
													<>
														<div
															className={cn(
																"absolute inset-0",
																singleBooking.isExternal
																	? "opacity-60"
																	: "opacity-90",
																getStatusColor(singleBooking.status),
															)}
															style={{
																clipPath:
																	"polygon(50% 0, 100% 50%, 50% 100%, 0 50%)",
															}}
														/>
														{/* Guest name for single day */}
														<div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
															<span className="text-white text-[10px] sm:text-xs drop-shadow-md truncate">
																{singleBooking.guest_name?.split(" ")[0]}
															</span>
														</div>
														{/* Booking source badge */}
														{"source" in singleBooking &&
															singleBooking.source && (
																<div className="absolute top-0.5 right-1 z-20">
																	<div className="bg-white/90 text-[8px] px-1 py-0.5 rounded font-bold text-blue-600">
																		{singleBooking.source === "booking_com" &&
																			"B"}
																		{singleBooking.source === "airbnb" && "A"}
																		{singleBooking.source === "expedia" && "E"}
																		{singleBooking.source === "beds24" && "B24"}
																		{singleBooking.source === "ical" && "iCal"}
																		{!["booking_com", "airbnb", "expedia", "beds24", "ical"].includes(singleBooking.source) &&
																			singleBooking.source.slice(0, 3).toUpperCase()}
																	</div>
																</div>
															)}
													</>
												)}

											{/* Quick book button when cell is empty */}
											{!primaryBooking && (
												<button
													className="w-full h-full hover:bg-primary/10 transition-colors flex items-center justify-center group"
													onClick={() => onQuickBook(room, day)}
													title={`Book ${room.room_number} for ${format(day, "MMM dd, yyyy")}`}
												>
													<Plus className="size-4 text-muted-foreground/40 group-hover:text-primary group-hover:scale-125 transition-all" />
												</button>
											)}
										</div>
									</TooltipTrigger>

									{/* Tooltip with booking details */}
									{primaryBooking && (
										<TooltipContent
											side="top"
											align="center"
											className="p-3 text-xs min-w-[200px]"
										>
											<div className="font-semibold text-sm mb-2">
												{primaryBooking.guest_name}
											</div>
											<div className="space-y-1">
												<div className="flex justify-between gap-4">
													<span className="text-muted-foreground">
														Check-in:
													</span>
													<span className="font-medium">
														{format(
															parseISO(
																"check_in_date" in primaryBooking
																	? primaryBooking.check_in_date
																	: primaryBooking.check_in,
															),
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
															parseISO(
																"check_out_date" in primaryBooking
																	? primaryBooking.check_out_date
																	: primaryBooking.check_out,
															),
															"MMM dd, yyyy",
														)}
													</span>
												</div>
												<div className="flex justify-between gap-4">
													<span className="text-muted-foreground">Status:</span>
													<span className="font-medium capitalize">
														{primaryBooking.status.replace("_", " ")}
													</span>
												</div>
												{"source" in primaryBooking &&
													primaryBooking.source && (
														<div className="flex justify-between gap-4">
															<span className="text-muted-foreground">
																Source:
															</span>
															<span className="font-medium capitalize">
																{primaryBooking.source.replace("_", ".")}
															</span>
														</div>
													)}
												<div className="flex justify-between gap-4">
													<span className="text-muted-foreground">Guests:</span>
													<span className="font-medium">
														{primaryBooking.adults +
															(primaryBooking.children || 0)}
													</span>
												</div>
												{primaryBooking.total_amount > 0 && (
													<div className="flex justify-between gap-4">
														<span className="text-muted-foreground">
															Amount:
														</span>
														<span className="font-medium">
															{getCurrencySymbol(
																primaryBooking.currency || "USD",
															)}
															{primaryBooking.total_amount.toLocaleString()}
														</span>
													</div>
												)}
												<div className="flex justify-between gap-4">
													<span className="text-muted-foreground">
														Booking #:
													</span>
													<span className="font-medium text-xs">
														{"reservation_number" in primaryBooking
															? primaryBooking.reservation_number
															: primaryBooking.external_id}
													</span>
												</div>
											</div>
										</TooltipContent>
									)}
								</Tooltip>
							);
						})}
					</div>
				</div>
			</div>
		</TooltipProvider>
	);
}
