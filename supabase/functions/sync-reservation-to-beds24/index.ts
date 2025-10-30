/**
 * Edge Function: sync-reservation-to-beds24
 * 
 * Syncs direct reservations from CheckingCheckout TO Beds24 channel manager.
 * This enables bi-directional sync so direct bookings close dates on all connected channels.
 * 
 * Flow:
 * 1. Receives reservation data from app after user creates booking
 * 2. Maps CheckingCheckout room to Beds24 roomId using beds24_property_mappings
 * 3. POSTs booking to Beds24 API v2 /bookings endpoint
 * 4. Updates reservation with beds24_booking_id and sync status
 * 5. Beds24 automatically propagates to channels (Booking.com, Airbnb, etc.)
 * 
 * Authentication: Uses Beds24 OAuth access token from beds24_credentials
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const BEDS24_API_URL = "https://api.beds24.com/v2";

interface SyncReservationRequest {
	reservation_id: string;
	force?: boolean; // Force resync even if already synced
}

interface Beds24BookingPayload {
	roomId: number;
	status: "confirmed" | "request" | "cancelled";
	arrival: string; // YYYY-MM-DD
	departure: string; // YYYY-MM-DD
	numAdult: number;
	numChild: number;
	firstName?: string;
	lastName?: string;
	email?: string;
	mobile?: string;
	apiReference: string; // Our reservation ID for linking
	comment?: string;
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

		const { reservation_id, force = false }: SyncReservationRequest =
			await req.json();

		if (!reservation_id) {
			return new Response(
				JSON.stringify({ error: "reservation_id is required" }),
				{ status: 400, headers: { "Content-Type": "application/json" } },
			);
		}

		// Initialize Supabase client
		const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
		const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
		const supabase = createClient(supabaseUrl, supabaseServiceKey);

		// Fetch reservation details with related data
		const { data: reservation, error: reservationError } = await supabase
			.from("reservations")
			.select(
				`
        *,
        rooms (
          id,
          room_number,
          room_type
        ),
        locations (
          id,
          name
        )
      `,
			)
			.eq("id", reservation_id)
			.single();

		if (reservationError || !reservation) {
			return new Response(
				JSON.stringify({
					error: "Reservation not found",
					details: reservationError?.message,
				}),
				{ status: 404, headers: { "Content-Type": "application/json" } },
			);
		}

		// Check if already synced and not forcing
		if (
			!force &&
			reservation.beds24_sync_status === "synced" &&
			reservation.beds24_booking_id
		) {
			return new Response(
				JSON.stringify({
					success: true,
					message: "Already synced to Beds24",
					beds24_booking_id: reservation.beds24_booking_id,
					synced_at: reservation.beds24_synced_at,
				}),
				{ status: 200, headers: { "Content-Type": "application/json" } },
			);
		}

		// Only sync direct bookings (not external channel bookings)
		if (
			reservation.booking_source &&
			!["direct", "manual", "online", "phone", "email", "walk_in"].includes(
				reservation.booking_source,
			)
		) {
			// Update status to not_required
			await supabase
				.from("reservations")
				.update({
					beds24_sync_status: "not_required",
					beds24_sync_error:
						"External channel booking - no sync to Beds24 needed",
				})
				.eq("id", reservation_id);

			return new Response(
				JSON.stringify({
					success: true,
					message: "External channel booking - sync not required",
					booking_source: reservation.booking_source,
				}),
				{ status: 200, headers: { "Content-Type": "application/json" } },
			);
		}

		// Get Beds24 room mapping from channel_room_mappings table
		const { data: roomMapping, error: mappingError } = await supabase
			.from("channel_room_mappings")
			.select("channel_room_id, channel_room_name")
			.eq("room_id", reservation.room_id)
			.eq("channel", "beds24")
			.eq("is_active", true)
			.single();

		if (mappingError || !roomMapping) {
			const errorMsg = "No Beds24 room mapping found for this room";
			
			console.error(
				`Room mapping not found: room_id=${reservation.room_id}, error:`,
				mappingError,
			);
			
			await supabase
				.from("reservations")
				.update({
					beds24_sync_status: "failed",
					beds24_sync_error: errorMsg,
				})
				.eq("id", reservation_id);

			return new Response(
				JSON.stringify({
					error: errorMsg,
					details:
						"Configure room mapping in Booking Channels Integration → Room Mappings tab",
					room_id: reservation.room_id,
					room_number: reservation.rooms?.room_number,
				}),
				{ status: 400, headers: { "Content-Type": "application/json" } },
			);
		}
		
		console.log(
			`Found room mapping: CCO room ${reservation.room_id} → Beds24 room ${roomMapping.channel_room_id} (${roomMapping.channel_room_name})`,
		);

		// Get Beds24 credentials for this location
		const { data: beds24Creds, error: credsError } = await supabase
			.from("beds24_credentials")
			.select("access_token, refresh_token, token_expires_at")
			.eq("location_id", reservation.location_id)
			.eq("is_active", true)
			.single();

		if (credsError || !beds24Creds) {
			const errorMsg = "Beds24 credentials not found for this location";
			await supabase
				.from("reservations")
				.update({
					beds24_sync_status: "failed",
					beds24_sync_error: errorMsg,
				})
				.eq("id", reservation_id);

			return new Response(
				JSON.stringify({
					error: errorMsg,
					details: "Connect Beds24 in Booking Channels Integration page",
				}),
				{ status: 400, headers: { "Content-Type": "application/json" } },
			);
		}

		// Check if access token needs refresh (expires within 5 minutes)
		let accessToken = beds24Creds.access_token;
		if (
			!accessToken ||
			new Date(beds24Creds.token_expires_at) < new Date(Date.now() + 5 * 60000)
		) {
			// Refresh the token
			const tokenResponse = await fetch(
				`${BEDS24_API_URL}/authentication/token`,
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						grant_type: "refresh_token",
						refresh_token: beds24Creds.refresh_token,
					}),
				},
			);

			if (!tokenResponse.ok) {
				const errorMsg = "Failed to refresh Beds24 access token";
				await supabase
					.from("reservations")
					.update({
						beds24_sync_status: "failed",
						beds24_sync_error: errorMsg,
					})
					.eq("id", reservation_id);

				return new Response(JSON.stringify({ error: errorMsg }), {
					status: 500,
					headers: { "Content-Type": "application/json" },
				});
			}

			const tokenData = await tokenResponse.json();
			accessToken = tokenData.access_token;

			// Update credentials
			await supabase
				.from("beds24_credentials")
				.update({
					access_token: tokenData.access_token,
					token_expires_at: new Date(
						Date.now() + tokenData.expires_in * 1000,
					).toISOString(),
				})
				.eq("location_id", reservation.location_id);
		}

		// Map reservation status to Beds24 status
		let beds24Status: "confirmed" | "request" | "cancelled" = "confirmed";
		if (reservation.status === "cancelled") {
			beds24Status = "cancelled";
		} else if (reservation.status === "tentative") {
			beds24Status = "request";
		}

		// Split guest name into first and last
		const nameParts = reservation.guest_name.split(" ");
		const firstName = nameParts[0] || reservation.guest_name;
		const lastName = nameParts.slice(1).join(" ") || "";

		// Build Beds24 booking payload
		const bookingPayload: Beds24BookingPayload = {
			roomId: Number.parseInt(roomMapping.channel_room_id), // Beds24 room ID
			status: beds24Status,
			arrival: reservation.check_in_date,
			departure: reservation.check_out_date,
			numAdult: reservation.adults || 1,
			numChild: reservation.children || 0,
			firstName,
			lastName,
			email: reservation.guest_email || undefined,
			mobile: reservation.guest_phone || undefined,
			apiReference: reservation.id, // Link to our reservation ID
			comment: reservation.special_requests || undefined,
		};

		console.log("Posting booking to Beds24:", bookingPayload);

		// Update status to pending
		await supabase
			.from("reservations")
			.update({ beds24_sync_status: "pending" })
			.eq("id", reservation_id);

		// POST to Beds24 API
		const beds24Response = await fetch(`${BEDS24_API_URL}/bookings`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				token: accessToken,
			},
			body: JSON.stringify([bookingPayload]), // Array of bookings
		});

		const beds24Data = await beds24Response.json();
		console.log("Beds24 response:", beds24Data);

		if (!beds24Response.ok) {
			const errorMsg =
				beds24Data.message || "Failed to create booking in Beds24";
			await supabase
				.from("reservations")
				.update({
					beds24_sync_status: "failed",
					beds24_sync_error: JSON.stringify(beds24Data),
				})
				.eq("id", reservation_id);

			return new Response(
				JSON.stringify({ error: errorMsg, details: beds24Data }),
				{ status: beds24Response.status, headers: { "Content-Type": "application/json" } },
			);
		}

		// Extract Beds24 booking ID from response
		const beds24BookingId =
			beds24Data.data?.[0]?.id || beds24Data[0]?.id || null;

		if (!beds24BookingId) {
			const errorMsg = "Beds24 did not return a booking ID";
			await supabase
				.from("reservations")
				.update({
					beds24_sync_status: "failed",
					beds24_sync_error: errorMsg,
				})
				.eq("id", reservation_id);

			return new Response(JSON.stringify({ error: errorMsg }), {
				status: 500,
				headers: { "Content-Type": "application/json" },
			});
		}

		// Block dates in Beds24 calendar to prevent double bookings
		console.log("Blocking dates in Beds24 calendar");
		let datesBlocked = false;
		let blockingError: string | null = null;

		try {
			// Calculate date range: arrival to departure - 1 day (last night booked)
			// Beds24 uses last night booked, not checkout date
			const checkOutDate = new Date(reservation.check_out_date);
			checkOutDate.setDate(checkOutDate.getDate() - 1);
			const lastNightBooked = checkOutDate.toISOString().split("T")[0];

			const calendarPayload = [
				{
					roomId: Number.parseInt(roomMapping.channel_room_id),
					calendar: [
						{
							from: reservation.check_in_date,
							to: lastNightBooked,
							numAvail: 0,
							override: "blackout",
						},
					],
				},
			];

			console.log(
				"Calendar blocking payload:",
				JSON.stringify(calendarPayload),
			);

			const calendarResponse = await fetch(`${BEDS24_API_URL}/calendar`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					token: accessToken,
				},
				body: JSON.stringify(calendarPayload),
			});

			const calendarData = await calendarResponse.json();

			if (!calendarResponse.ok) {
				console.error("Failed to block dates in calendar:", calendarData);
				blockingError = JSON.stringify(calendarData);
				// Don't fail entire sync - booking is already created
			} else {
				console.log("Successfully blocked dates in Beds24 calendar");
				datesBlocked = true;
			}
		} catch (error: any) {
			console.error("Error blocking dates in calendar:", error);
			blockingError = error?.message || "Unknown error blocking dates";
			// Don't fail entire sync - booking is already created
		}

		// Update reservation with Beds24 booking ID and success status
		const updateData: any = {
			beds24_booking_id: beds24BookingId,
			beds24_sync_status: "synced",
			beds24_synced_at: new Date().toISOString(),
			beds24_sync_error: null,
			beds24_dates_blocked: datesBlocked,
		};

		if (datesBlocked) {
			updateData.beds24_dates_blocked_at = new Date().toISOString();
		}

		await supabase.from("reservations").update(updateData).eq("id", reservation_id);

		console.log(
			`Successfully synced reservation ${reservation_id} to Beds24 booking ${beds24BookingId}`,
		);

		if (datesBlocked) {
			console.log(`✅ Dates blocked in Beds24 calendar for reservation ${reservation_id}`);
		} else {
			console.warn(
				`⚠️ Booking synced but dates NOT blocked in Beds24 calendar for reservation ${reservation_id}`,
				blockingError,
			);
		}

		return new Response(
			JSON.stringify({
				success: true,
				message: "Reservation synced to Beds24",
				reservation_id: reservation_id,
				beds24_booking_id: beds24BookingId,
				beds24_response: beds24Data,
				dates_blocked: datesBlocked,
				blocking_error: blockingError,
			}),
			{ status: 200, headers: { "Content-Type": "application/json" } },
		);
	} catch (error: any) {
		console.error("Error in sync-reservation-to-beds24:", error);
		return new Response(
			JSON.stringify({
				error: "Internal server error",
				details: error?.message || "Unknown error",
			}),
			{ status: 500, headers: { "Content-Type": "application/json" } },
		);
	}
});
