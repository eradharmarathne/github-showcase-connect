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
	const nights = spanDays;

	return (
		<TooltipProvider>
			<Tooltip delayDuration={200}>
				<TooltipTrigger asChild>
					<div
						className="absolute flex items-center z-10 cursor-pointer transition-all hover:brightness-110 overflow-visible"
						style={{
							left: "0",
							width: `calc(${spanDays * 100}% + ${(spanDays - 1)}px)`,
							top: "24px",
							height: "18px",
						}}
						onClick={() => onClick(booking)}
					>
						{/* Start indicator dot */}
						<div
							className={`absolute left-0 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full border-[2.5px] border-white shadow-md z-30 ${colors.badge}`}
							style={{ left: "-5px" }}
						/>
						{/* End indicator dot */}
						<div
							className={`absolute right-0 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full border-[2.5px] border-white shadow-md z-30 ${colors.badge}`}
							style={{ right: "-5px" }}
						/>
						{/* Main booking shape with strong parallelogram */}
						<div
							className={`absolute inset-0 shadow-lg ${colors.bg}`}
							style={{
								clipPath: "polygon(8% 0%, 100% 0%, 92% 100%, 0% 100%)",
								backgroundImage: `repeating-linear-gradient(90deg, transparent 0%, transparent calc(100% / ${spanDays} - 1px), rgba(0,0,0,0.1) calc(100% / ${spanDays} - 1px), rgba(0,0,0,0.1) calc(100% / ${spanDays}))`,
							}}
						/>
						{/* Inner layer for depth */}
						<div
							className="absolute inset-[1px] bg-gradient-to-b from-white/10 to-transparent"
							style={{
								clipPath: "polygon(8% 0%, 100% 0%, 92% 100%, 0% 100%)",
							}}
						/>
						{/* Content */}
						<div className="absolute inset-0 flex items-center px-3 py-1 z-10" style={{ paddingLeft: "10%" }}>
							{/* Channel badge */}
							<div
								className={`absolute top-0 left-0 ${colors.badge} text-white text-[9px] px-1.5 py-0.5 font-black uppercase leading-none`}
								style={{
									clipPath: "polygon(0 0, 100% 0, 80% 100%, 0 100%)",
									letterSpacing: "0.5px",
								}}
							>
								{colors.label}
							</div>

							{/* Guest name and count */}
							<span className="text-white text-sm font-bold truncate flex-1 drop-shadow-sm">
								{booking.guest_name}
							</span>
							{spanDays >= 2 && (
								<span className="text-white text-xs font-bold ml-2 drop-shadow-sm shrink-0">
									({adults + children})
								</span>
							)}

							{/* Unmapped indicator */}
							{!booking.room_id && spanDays >= 2 && (
								<div
									className="absolute bottom-0 right-0 bg-amber-500 text-white text-[9px] px-1.5 py-0.5 font-black uppercase leading-none"
									title="Room not mapped"
									style={{
										clipPath: "polygon(20% 0, 100% 0, 100% 100%, 0 100%)",
										letterSpacing: "0.5px",
									}}
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
							<span className={`${colors.badge} text-white text-xs px-2 py-0.5 rounded`}>
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
