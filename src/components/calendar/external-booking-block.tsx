import { format, parseISO } from "date-fns";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import type { ExternalBooking } from "./timeline-view";

interface ExternalBookingBlockProps {
	booking: ExternalBooking;
	startIndex: number;
	spanDays: number;
	totalDays: number;
	getCurrencySymbol: (currency: string) => string;
	onClick: (booking: any) => void;
}

// Helper to get color based on booking source
const getSourceColor = (source: string) => {
	switch (source.toLowerCase()) {
		case "booking_com":
		case "booking.com":
			return {
				bg: "bg-blue-50",
				border: "border-blue-500",
				text: "text-blue-900",
				badge: "bg-blue-500",
				label: "B.com",
			};
		case "airbnb":
			return {
				bg: "bg-pink-50",
				border: "border-pink-500",
				text: "text-pink-900",
				badge: "bg-pink-500",
				label: "Airbnb",
			};
		case "expedia":
			return {
				bg: "bg-yellow-50",
				border: "border-yellow-500",
				text: "text-yellow-900",
				badge: "bg-yellow-500",
				label: "Expedia",
			};
		case "beds24":
			return {
				bg: "bg-purple-50",
				border: "border-purple-500",
				text: "text-purple-900",
				badge: "bg-purple-500",
				label: "Beds24",
			};
		case "ical":
			return {
				bg: "bg-teal-50",
				border: "border-teal-500",
				text: "text-teal-900",
				badge: "bg-teal-500",
				label: "iCal",
			};
		default:
			return {
				bg: "bg-gray-50",
				border: "border-gray-500",
				text: "text-gray-900",
				badge: "bg-gray-500",
				label: "Other",
			};
	}
};

export function ExternalBookingBlock({
	booking,
	startIndex,
	spanDays,
	totalDays,
	getCurrencySymbol,
	onClick,
}: ExternalBookingBlockProps) {
	const colors = getSourceColor(booking.source);
	const amount = booking.total_amount || 0;
	const currency = booking.currency || "USD";
	const adults = booking.adults || 0;
	const children = booking.children || 0;

	// Format source name for display
	const formatSourceName = (source: string) => {
		if (source === "booking_com") return "Booking.com";
		if (source === "airbnb") return "Airbnb";
		return source.charAt(0).toUpperCase() + source.slice(1);
	};

	// Format dates for tooltip
	const checkInDate = parseISO(booking.check_in);
	const checkOutDate = parseISO(booking.check_out);
	const nights = spanDays - 1; // Number of nights is days minus 1 (check-out day not included)

	return (
		<TooltipProvider>
			<Tooltip delayDuration={200}>
				<TooltipTrigger asChild>
					<div
						className="absolute flex items-center z-10 cursor-pointer transition-all hover:brightness-110 overflow-visible"
						style={{
							left: "50%",
							width: `${(spanDays - 1) * 40}px`,
							top: "0",
							bottom: "0",
							opacity: 0.8,
						}}
						onClick={() => onClick(booking)}
					>
						{/* Start indicator dot */}
						<div
							className={`absolute left-0 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full border-2 border-white shadow-sm z-30 ${colors.badge}`}
							style={{ left: "-4px" }}
						/>
						{/* End indicator dot */}
						<div
							className={`absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full border-2 border-white shadow-sm z-30 ${colors.badge}`}
							style={{ right: "-4px" }}
						/>
						{/* Main booking shape */}
						<div
							className={`absolute inset-0 shadow-sm ${colors.bg} border-t-2 border-b-2 ${colors.border}`}
						/>
						{/* Content */}
						<div className="absolute inset-0 flex items-center px-2 py-1 z-10">
							{/* Channel badge */}
							<div
								className={`absolute top-0 left-0 ${colors.badge} text-white text-[8px] px-1 py-0.5 font-bold uppercase leading-none`}
							>
								{colors.label}
							</div>

							{/* Guest name and count */}
							<span
								className={`text-xs font-semibold truncate flex-1 ${colors.text}`}
							>
								{booking.guest_name}
							</span>
							{spanDays >= 2 && (
								<span
									className={`text-[10px] font-medium ml-1 shrink-0 ${colors.text}`}
								>
									({adults + children})
								</span>
							)}

							{/* Unmapped indicator */}
							{!booking.room_id && spanDays >= 2 && (
								<div
									className="absolute bottom-0 right-0 bg-amber-500 text-white text-[8px] px-1 py-0.5 font-bold uppercase leading-none"
									title="Room not mapped"
								>
									!
								</div>
							)}
						</div>
					</div>
				</TooltipTrigger>
				<TooltipContent side="top" className="max-w-xs">
					<div className="space-y-2">
						<div className="font-semibold flex items-center gap-2">
							<span
								className={`${colors.badge} text-white text-xs px-2 py-0.5 rounded`}
							>
								{colors.label}
							</span>
							<span>{formatSourceName(booking.source)}</span>
						</div>
						<div className="text-sm space-y-1">
							<div>
								<span className="font-medium">Guest:</span> {booking.guest_name}
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
								<span className="font-medium">Nights:</span> {nights}
							</div>
							<div>
								<span className="font-medium">Guests:</span> {adults} adults
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
							{!booking.room_id && (
								<div className="mt-2 p-2 bg-amber-50 border border-amber-300 rounded text-amber-900 text-xs font-medium">
									WARNING: Room not mapped - please assign a room
								</div>
							)}
						</div>
					</div>
				</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	);
}
