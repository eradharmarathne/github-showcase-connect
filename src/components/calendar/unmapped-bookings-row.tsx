import { format, parseISO } from "date-fns";
import { AlertTriangle } from "lucide-react";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import type { ExternalBooking } from "./timeline-view";

interface UnmappedBookingsRowProps {
	unmappedBookings: ExternalBooking[];
	calendarDays: Date[];
	getCurrencySymbol: (currency: string) => string;
	onBookingClick: (booking: ExternalBooking) => void;
	calculateBookingSpan: (
		booking: any,
		calendarDays: Date[],
	) => {
		startIndex: number;
		spanDays: number;
		isVisible: boolean;
	};
}

// Helper to get color based on booking source
const getSourceColor = (source: string) => {
	switch (source.toLowerCase()) {
		case "booking_com":
		case "booking.com":
			return {
				bg: "bg-blue-100",
				border: "border-blue-400",
				text: "text-blue-800",
				icon: "🏛️",
			};
		case "airbnb":
			return {
				bg: "bg-pink-100",
				border: "border-pink-400",
				text: "text-pink-800",
				icon: "🏡",
			};
		case "expedia":
			return {
				bg: "bg-yellow-100",
				border: "border-yellow-400",
				text: "text-yellow-800",
				icon: "✈️",
			};
		case "beds24":
			return {
				bg: "bg-purple-100",
				border: "border-purple-400",
				text: "text-purple-800",
				icon: "🛏️",
			};
		case "ical":
			return {
				bg: "bg-teal-100",
				border: "border-teal-400",
				text: "text-teal-800",
				icon: "📅",
			};
		default:
			return {
				bg: "bg-gray-100",
				border: "border-gray-400",
				text: "text-gray-800",
				icon: "🌐",
			};
	}
};

const formatSourceName = (source: string) => {
	if (source === "booking_com") return "Booking.com";
	if (source === "airbnb") return "Airbnb";
	return source.charAt(0).toUpperCase() + source.slice(1);
};

export function UnmappedBookingsRow({
	unmappedBookings,
	calendarDays,
	getCurrencySymbol,
	onBookingClick,
	calculateBookingSpan,
}: UnmappedBookingsRowProps) {
	if (unmappedBookings.length === 0) return null;

	// Calculate spans for unmapped bookings
	const bookingsWithSpans = unmappedBookings.map((booking) => {
		const fakeReservation = {
			...booking,
			room_id: "unmapped",
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
	}).filter((booking) => booking.span.isVisible);

	if (bookingsWithSpans.length === 0) return null;

	const totalDays = calendarDays.length;

	return (
		<TooltipProvider>
			<div className="border-b bg-yellow-50">
				<div className="flex w-full">
					{/* Warning Label Column */}
					<div className="flex-shrink-0 w-[180px] sm:w-[200px] border-r bg-yellow-100">
						<div className="p-2 sm:p-3 flex items-center gap-2">
							<AlertTriangle className="h-4 w-4 text-yellow-600 flex-shrink-0" />
							<div className="flex-1 min-w-0">
								<div className="text-xs font-semibold text-yellow-900 truncate">
									Unmapped Bookings
								</div>
								<div className="text-[10px] text-yellow-700">
									{bookingsWithSpans.length} booking
									{bookingsWithSpans.length !== 1 ? "s" : ""} need room
									assignment
								</div>
							</div>
						</div>
					</div>

					{/* Calendar Grid */}
					<div className="flex-1 relative min-h-[48px] sm:min-h-[56px]">
						<div className="flex w-full h-full">
							{calendarDays.map((day, index) => (
								<div
									key={index}
									className="flex-1 border-r last:border-r-0 border-yellow-200"
								/>
							))}
						</div>

						{/* Render unmapped booking blocks */}
						{bookingsWithSpans.map((booking) => {
							const colors = getSourceColor(booking.source);
							const checkInDate = parseISO(booking.check_in);
							const checkOutDate = parseISO(booking.check_out);
							const adults = booking.adults || 0;
							const children = booking.children || 0;
							const amount = booking.total_amount || 0;
							const currency = booking.currency || "USD";

							return (
								<Tooltip key={booking.id} delayDuration={200}>
									<TooltipTrigger asChild>
										<div
											className="absolute inset-y-[2px] flex items-center"
											style={{
												left: `calc(${(booking.span.startIndex / totalDays) * 100}% + 50%)`,
												right: `calc(${100 - ((booking.span.startIndex + booking.span.spanDays) / totalDays) * 100}% + 50%)`,
											}}
										>
											<button
												type="button"
												onClick={() => onBookingClick(booking)}
												className={`
													w-full h-full border-2 ${colors.border} ${colors.bg}
													flex flex-col justify-center px-1 sm:px-1.5
													hover:opacity-80 transition-opacity
													relative overflow-visible
													cursor-pointer
													text-left
												`}
												style={{
													clipPath: `polygon(
														0 0,
														6px 50%,
														0 100%,
														calc(100% - 6px) 100%,
														100% 50%,
														calc(100% - 6px) 0
													)`,
												}}
											>
												{/* Warning stripe */}
												<div className="absolute top-0 left-0 right-0 h-1 bg-yellow-500" />

												{/* Booking details */}
												{booking.span.spanDays >= 2 ? (
													<div className="flex items-center gap-1 w-full">
														<span className="text-[8px] sm:text-[9px]">
															{colors.icon}
														</span>
														<span
															className={`${colors.text} text-[9px] sm:text-[10px] font-semibold truncate flex-1`}
														>
															{booking.guest_name}
														</span>
														<AlertTriangle className="h-3 w-3 text-yellow-600 flex-shrink-0" />
													</div>
												) : (
													<div className="flex items-center justify-center">
														<AlertTriangle className="h-2 w-2 text-yellow-600" />
													</div>
												)}
											</button>
										</div>
									</TooltipTrigger>
									<TooltipContent side="top" className="max-w-xs">
										<div className="space-y-2">
											<div className="font-semibold flex items-center gap-2">
												<span>{colors.icon}</span>
												<span>{formatSourceName(booking.source)}</span>
											</div>
											<div className="text-sm space-y-1">
												<div>
													<span className="font-medium">Guest:</span>{" "}
													{booking.guest_name}
												</div>
												<div>
													<span className="font-medium">Check-in:</span>{" "}
													{format(checkInDate, "EEE, MMM d, yyyy")}
												</div>
												<div>
													<span className="font-medium">Check-out:</span>{" "}
													{format(checkOutDate, "EEE, MMM d, yyyy")}
												</div>
												<div>
													<span className="font-medium">Nights:</span>{" "}
													{booking.span.spanDays}
												</div>
												<div>
													<span className="font-medium">Guests:</span> {adults}{" "}
													adults
													{children ? `, ${children} children` : ""}
												</div>
												<div>
													<span className="font-medium">Amount:</span>{" "}
													{getCurrencySymbol(currency)}
													{amount.toFixed(2)}
												</div>
												<div>
													<span className="font-medium">Status:</span>{" "}
													<span className="capitalize">{booking.status}</span>
												</div>
												<div>
													<span className="font-medium">Booking ID:</span>{" "}
													{booking.external_id}
												</div>
												<div className="mt-2 p-2 bg-yellow-50 border border-yellow-300 rounded text-yellow-800 text-xs flex items-start gap-2">
													<AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
													<span>
														Room not mapped - Click to view details and assign a
														room
													</span>
												</div>
											</div>
										</div>
									</TooltipContent>
								</Tooltip>
							);
						})}
					</div>
				</div>
			</div>
		</TooltipProvider>
	);
}
