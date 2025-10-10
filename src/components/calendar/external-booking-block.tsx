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

	return (
		<div
			className="absolute inset-y-[2px] flex items-center"
			style={{
				left: `calc(${(startIndex / totalDays) * 100}% + 50%)`,
				right: `calc(${100 - ((startIndex + spanDays) / totalDays) * 100}% + 50%)`,
			}}
		>
			<button
				type="button"
				onClick={() => onClick(booking)}
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
					backgroundImage: `repeating-linear-gradient(90deg, transparent 0%, transparent calc(100% / ${spanDays} - 1px), rgba(0,0,0,0.05) calc(100% / ${spanDays} - 1px), rgba(0,0,0,0.05) calc(100% / ${spanDays}))`,
				}}
				title={`${formatSourceName(booking.source)} - ${booking.guest_name}`}
			>
				{/* Channel indicator stripe */}
				<div
					className={`absolute top-0 left-0 right-0 h-0.5 ${colors.border.replace("border-", "bg-")}`}
				/>

				{/* Booking details - guest name and guest count */}
				{spanDays >= 2 ? (
					<div className="flex items-center gap-1 w-full">
						<span className="text-[8px] sm:text-[9px]" title={formatSourceName(booking.source)}>
							{colors.icon}
						</span>
						<span
							className={`${colors.text} text-[9px] sm:text-[10px] font-semibold truncate flex-1`}
						>
							{booking.guest_name}
						</span>
						<span className={`${colors.text} text-[9px] sm:text-[10px] font-semibold shrink-0`}>
							• ({adults + children} {adults + children === 1 ? "guest" : "guests"})
						</span>
					</div>
				) : (
					<div className="flex items-center justify-center">
						<span className={`${colors.text} text-[9px]`}>•</span>
					</div>
				)}

				{/* Unmapped indicator */}
				{!booking.room_id && spanDays >= 2 && (
					<div
						className="absolute bottom-0 right-0 bg-yellow-400 text-[6px] sm:text-[7px] px-0.5 rounded-tl"
						title="Room not mapped"
					>
						⚠️
					</div>
				)}
			</button>
		</div>
	);
}
