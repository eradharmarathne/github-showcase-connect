import { format } from "date-fns";
import type { ExternalBooking, SyncStats } from "@/types/booking-channels";

/**
 * Booking Guest Helper Functions
 */
export const getGuestName = (booking: ExternalBooking): string => {
	return booking.guest_name || booking.raw_data?.guest?.name || "Unknown Guest";
};

export const getEmail = (booking: ExternalBooking): string | null => {
	return booking.raw_data?.guest?.email || null;
};

/**
 * Date and Time Helper Functions
 */
export const formatDate = (dateString: string): string => {
	return format(new Date(dateString), "MMM dd");
};

export const calculateNights = (checkIn: string, checkOut: string): number => {
	const start = new Date(checkIn);
	const end = new Date(checkOut);
	const diffTime = Math.abs(end.getTime() - start.getTime());
	return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

/**
 * Price and Payment Helper Functions
 */
export const formatPrice = (booking: ExternalBooking): string => {
	return `${booking.total_amount?.toLocaleString() || 0} ${booking.currency || "USD"}`;
};

export const getPaymentInfo = (booking: ExternalBooking): any => {
	if (booking.source === "airbnb" && booking.raw_data?.pricing) {
		const pricing = booking.raw_data.pricing;
		return {
			type: "airbnb",
			basePrice: pricing.basePrice || 0,
			hostFee: pricing.hostFee || 0,
			payout: pricing.hostPayout || 0,
		};
	}
	return null;
};

/**
 * Statistics Calculation Functions
 */
export const calculateStats = (bookings: ExternalBooking[]): SyncStats => {
	const sourceBreakdown: Record<string, number> = {};
	const statusBreakdown: Record<string, number> = {};
	let recentSync: string | null = null;

	bookings.forEach((booking) => {
		// Source breakdown
		sourceBreakdown[booking.source] =
			(sourceBreakdown[booking.source] || 0) + 1;

		// Status breakdown
		statusBreakdown[booking.status] =
			(statusBreakdown[booking.status] || 0) + 1;

		// Find most recent sync
		if (!recentSync || booking.last_synced_at > recentSync) {
			recentSync = booking.last_synced_at;
		}
	});

	return {
		totalBookings: bookings.length,
		recentSync,
		sourceBreakdown,
		statusBreakdown,
	};
};

/**
 * Styling Helper Functions
 */
export const getSourceColor = (source: string): string => {
	const colors: Record<string, string> = {
		airbnb: "bg-red-500 hover:bg-red-600 text-white",
		booking_com: "bg-blue-500 hover:bg-blue-600 text-white",
		"booking.com": "bg-blue-500 hover:bg-blue-600 text-white",
		beds24: "bg-purple-500 hover:bg-purple-600 text-white",
		expedia: "bg-yellow-500 hover:bg-yellow-600 text-white",
		ical: "bg-gray-500 hover:bg-gray-600 text-white",
	};
	return colors[source] || "bg-gray-400 hover:bg-gray-500 text-white";
};

export const getStatusColor = (status: string): string => {
	const colors: Record<string, string> = {
		confirmed: "bg-green-500 hover:bg-green-600 text-white",
		pending: "bg-yellow-500 hover:bg-yellow-600 text-white",
		cancelled: "bg-red-500 hover:bg-red-600 text-white",
		completed: "bg-blue-500 hover:bg-blue-600 text-white",
	};
	return colors[status] || "bg-gray-400 hover:bg-gray-500 text-white";
};
