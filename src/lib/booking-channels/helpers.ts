import { format } from "date-fns";
import type { ExternalBooking, SyncStats } from "@/types/booking-channels";

export const getGuestName = (booking: ExternalBooking): string => {
	return booking.guest_name || booking.raw_data?.guest?.name || "Unknown Guest";
};

export const getEmail = (booking: ExternalBooking): string | null => {
	return booking.raw_data?.guest?.email || null;
};

export const formatDate = (dateString: string): string => {
	return format(new Date(dateString), "MMM dd");
};

export const calculateNights = (checkIn: string, checkOut: string): number => {
	const start = new Date(checkIn);
	const end = new Date(checkOut);
	const diffTime = Math.abs(end.getTime() - start.getTime());
	return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

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

export const getStatusColor = (status: string): string => {
	switch (status.toLowerCase()) {
		case "confirmed":
			return "bg-green-50 text-green-700 border-green-200";
		case "new":
			return "bg-blue-50 text-blue-700 border-blue-200";
		case "pending":
			return "bg-yellow-50 text-yellow-700 border-yellow-200";
		case "cancelled":
			return "bg-red-50 text-red-700 border-red-200";
		case "checked_in":
			return "bg-purple-50 text-purple-700 border-purple-200";
		case "checked_out":
			return "bg-gray-50 text-gray-700 border-gray-200";
		default:
			return "bg-gray-50 text-gray-700 border-gray-200";
	}
};

export const getSourceColor = (source: string): string => {
	switch (source.toLowerCase()) {
		case "booking_com":
			return "bg-blue-100 text-blue-800 border-blue-200";
		case "airbnb":
			return "bg-pink-100 text-pink-800 border-pink-200";
		case "expedia":
			return "bg-yellow-100 text-yellow-800 border-yellow-200";
		default:
			return "bg-purple-100 text-purple-800 border-purple-200";
	}
};
