/**
 * Edge Function: beds24-booking-webhook
 * 
 * Receives webhook notifications from Beds24 when bookings are updated.
 * Keeps local reservations in sync with changes made in Beds24 or on channels.
 * 
 * Webhook Configuration: Settings → Properties → Access → Booking Webhook
 * Set URL to: https://[your-project].supabase.co/functions/v1/beds24-booking-webhook
 * 
 * Handles:
 * - Booking status changes (confirmed, cancelled, etc.)
 * - Booking modifications (dates, guests, amounts)
 * - Cancellations from channels
 * - Updates made in Beds24 interface
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

interface Beds24WebhookPayload {
	timeStamp: string;
	booking: {
		id: number;
		bookingGroup?: {
			master: number;
			ids: number[];
		} | null;
		masterId: number;
		propertyId: number;
		roomId: number;
		unitId: number;
		roomQty: number;
		offerId: number;
		status: string;
		subStatus: string;
		arrival: string; // YYYY-MM-DD
		departure: string; // YYYY-MM-DD
		numAdult: number;
		numChild: number;
		firstName: string;
		lastName: string;
		email: string;
		mobile: string;
		apiReference?: string; // Our reservation ID if we created it
		// ... many more fields available
	};
}

serve(async (req) => {
	try {
		// Only allow POST requests
		if (req.method !== "POST") {
			return new Response(JSON.stringify({ error: "Method not allowed" }), {
				status: 405,
				headers: { "Content-Type": "application/json" },
			});
		}

		const payload: Beds24WebhookPayload = await req.json();
		console.log("Received Beds24 webhook:", payload);

		const { booking } = payload;

		// Initialize Supabase client
		const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
		const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
		const supabase = createClient(supabaseUrl, supabaseServiceKey);

		// Find existing reservation by Beds24 booking ID or apiReference
		let existingReservation = null;

		// First try to find by our apiReference (if we created this booking)
		if (booking.apiReference) {
			const { data } = await supabase
				.from("reservations")
				.select("*")
				.eq("id", booking.apiReference)
				.single();

			if (data) {
				existingReservation = data;
			}
		}

		// If not found, try finding by Beds24 booking ID
		if (!existingReservation) {
			const { data } = await supabase
				.from("reservations")
				.select("*")
				.eq("beds24_booking_id", booking.id)
				.single();

			if (data) {
				existingReservation = data;
			}
		}

		// If still not found, this is a new external booking
		if (!existingReservation) {
			// This is handled by fetch-beds24-bookings function
			// We just acknowledge the webhook
			console.log(
				`New external booking ${booking.id} - will be fetched by sync job`,
			);

			return new Response(
				JSON.stringify({
					success: true,
					message: "New booking - will be synced by fetch job",
					beds24_booking_id: booking.id,
				}),
				{ status: 200, headers: { "Content-Type": "application/json" } },
			);
		}

		// Update existing reservation with changes from Beds24
		const guestName = `${booking.firstName} ${booking.lastName}`.trim();

		// Map Beds24 status to our reservation status
		let reservationStatus = existingReservation.status;
		if (booking.status === "cancelled") {
			reservationStatus = "cancelled";
		} else if (booking.status === "confirmed") {
			reservationStatus = "confirmed";
		} else if (booking.status === "request") {
			reservationStatus = "tentative";
		}

		// Update reservation
		const { error: updateError } = await supabase
			.from("reservations")
			.update({
				guest_name: guestName,
				guest_email: booking.email || null,
				guest_phone: booking.mobile || null,
				check_in_date: booking.arrival,
				check_out_date: booking.departure,
				adults: booking.numAdult,
				children: booking.numChild,
				status: reservationStatus,
				beds24_booking_id: booking.id,
				beds24_synced_at: new Date().toISOString(),
				updated_at: new Date().toISOString(),
			})
			.eq("id", existingReservation.id);

		if (updateError) {
			console.error("Failed to update reservation:", updateError);
			return new Response(
				JSON.stringify({
					error: "Failed to update reservation",
					details: updateError.message,
				}),
				{ status: 500, headers: { "Content-Type": "application/json" } },
			);
		}

		console.log(
			`Updated reservation ${existingReservation.id} from Beds24 webhook`,
		);

		return new Response(
			JSON.stringify({
				success: true,
				message: "Reservation updated from Beds24",
				reservation_id: existingReservation.id,
				beds24_booking_id: booking.id,
			}),
			{ status: 200, headers: { "Content-Type": "application/json" } },
		);
	} catch (error) {
		console.error("Error in beds24-booking-webhook:", error);
		return new Response(
			JSON.stringify({
				error: "Internal server error",
				details: error.message,
			}),
			{ status: 500, headers: { "Content-Type": "application/json" } },
		);
	}
});
