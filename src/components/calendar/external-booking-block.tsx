import type { ExternalBooking } from "./timeline-view";

interface ExternalBookingBlockProps {
	booking: ExternalBooking;
	startIndex: number;
	spanDays: number;
	getCurrencySymbol: (currency: string) => string;
	onClick: (booking: any) => void;
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
				icon: "\ud83c\udfdb\ufe0f",
			};
		case "airbnb":
			return {
				bg: "bg-pink-100",
				border: "border-pink-400",
				text: "text-pink-800",
				icon: "\ud83c\udfe1",
			};
		case "expedia":
			return {
				bg: "bg-yellow-100",
				border: "border-yellow-400",
				text: "text-yellow-800",
				icon: "\u2708\ufe0f",
			};
		case "beds24":
			return {
				bg: "bg-purple-100",
				border: "border-purple-400",
				text: "text-purple-800",
				icon: "\ud83d\udecf\ufe0f",
			};
		case "ical":
			return {
				bg: "bg-teal-100",
				border: "border-teal-400",
				text: "text-teal-800",
				icon: "\ud83d\udcc5",
			};
		default:
			return {
				bg: "bg-gray-100",
				border: "border-gray-400",
				text: "text-gray-800",
				icon: "\ud83c\udf10",
			};
	}
};

export function ExternalBookingBlock({
	booking,
	startIndex,
	spanDays,
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

	return (
		<div
			className="absolute top-0 h-full px-0.5 py-1"
			style={{
				left: `${(startIndex / 30) * 100}%`,
				width: `${(spanDays / 30) * 100}%`,
			}}
		>
			<button
				type="button"
				onClick={() => onClick(booking)}
				className={`
					w-full h-full rounded-md border-2 ${colors.border} ${colors.bg}
					flex flex-col justify-center px-1 sm:px-1.5
					hover:opacity-80 transition-opacity
					relative overflow-hidden
					cursor-pointer
					text-left
				`}
				title={`${formatSourceName(booking.source)} - ${booking.guest_name}`}
			>
				{/* Channel indicator stripe */}
				<div
					className={`absolute top-0 left-0 right-0 h-0.5 ${colors.border.replace("border-", "bg-")}`}
				/>

				{/* Booking details */}
				<div className="flex items-center gap-0.5 sm:gap-1">
					<span className="text-[8px] sm:text-[9px]" title={formatSourceName(booking.source)}>
						{colors.icon}
					</span>
					<span
						className={`${colors.text} text-[8px] sm:text-[9px] md:text-[10px] font-semibold truncate flex-1`}
					>
						{booking.guest_name}
					</span>
				</div>

				{spanDays >= 3 && (
					<>
						<div className={`${colors.text} text-[7px] sm:text-[8px] truncate`}>
							{getCurrencySymbol(currency)}
							{amount.toLocaleString()}
						</div>
						{spanDays >= 4 && (
							<div className={`${colors.text} text-[7px] sm:text-[8px]`}>
								{adults}A {children > 0 && `${children}C`}
							</div>
						)}
					</>
				)}

				{/* Unmapped indicator */}
				{!booking.room_id && spanDays >= 2 && (
					<div
						className="absolute bottom-0 right-0 bg-yellow-400 text-[6px] sm:text-[7px] px-0.5 rounded-tl"
						title="Room not mapped"
					>
						\u26a0\ufe0f
					</div>
				)}
			</button>
		</div>
	);
}
