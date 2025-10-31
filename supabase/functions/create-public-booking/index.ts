import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
	"Access-Control-Allow-Origin": "*",
	"Access-Control-Allow-Headers":
		"authorization, x-client-info, apikey, content-type",
};

interface PublicBookingRequest {
	locationSlug: string;
	guestName: string;
	guestEmail: string;
	guestPhone?: string;
	guestAddress?: string;
	guestNationality?: string;
	checkInDate: string;
	checkOutDate: string;
	adults: number;
	children: number;
	roomTypePreference?: string;
	specialRequests?: string;
}

serve(async (req) => {
	// Handle CORS preflight requests
	if (req.method === "OPTIONS") {
		return new Response("ok", { headers: corsHeaders });
	}

	try {
		const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
		const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
		const supabase = createClient(supabaseUrl, supabaseServiceKey);

		// Parse request body
		const bookingData: PublicBookingRequest = await req.json();

		// Validate required fields
		if (
			!bookingData.locationSlug ||
			!bookingData.guestName ||
			!bookingData.guestEmail ||
			!bookingData.checkInDate ||
			!bookingData.checkOutDate
		) {
			return new Response(
				JSON.stringify({
					error: "Missing required fields",
					required: [
						"locationSlug",
						"guestName",
						"guestEmail",
						"checkInDate",
						"checkOutDate",
					],
				}),
				{
					status: 400,
					headers: { ...corsHeaders, "Content-Type": "application/json" },
				},
			);
		}

		// Validate dates
		const checkIn = new Date(bookingData.checkInDate);
		const checkOut = new Date(bookingData.checkOutDate);

		if (checkOut <= checkIn) {
			return new Response(
				JSON.stringify({ error: "Check-out date must be after check-in date" }),
				{
					status: 400,
					headers: { ...corsHeaders, "Content-Type": "application/json" },
				},
			);
		}

		// Find location by slug
		const { data: location, error: locationError } = await supabase
			.from("locations")
			.select("id, name, tenant_id, public_booking_enabled")
			.eq("slug", bookingData.locationSlug)
			.eq("public_booking_enabled", true)
			.single();

		if (locationError || !location) {
			return new Response(
				JSON.stringify({ error: "Location not found or public booking is not enabled" }),
				{
					status: 404,
					headers: { ...corsHeaders, "Content-Type": "application/json" },
				},
			);
		}

		// Get tenant info
		const { data: tenant, error: tenantError } = await supabase
			.from("tenants")
			.select("id, name")
			.eq("id", location.tenant_id)
			.single();

		if (tenantError || !tenant) {
			return new Response(
				JSON.stringify({ error: "Hotel not found" }),
				{
					status: 404,
					headers: { ...corsHeaders, "Content-Type": "application/json" },
				},
			);
		}

		// Get client IP and user agent
		const ipAddress = req.headers.get("x-forwarded-for") ||
			req.headers.get("x-real-ip") ||
			"unknown";
		const userAgent = req.headers.get("user-agent") || "unknown";

		// Create public booking record
		const { data: booking, error: bookingError } = await supabase
			.from("public_bookings")
			.insert({
				tenant_id: tenant.id,
				location_id: location.id,
				guest_name: bookingData.guestName,
				guest_email: bookingData.guestEmail,
				guest_phone: bookingData.guestPhone || null,
				guest_address: bookingData.guestAddress || null,
				guest_nationality: bookingData.guestNationality || null,
				check_in_date: bookingData.checkInDate,
				check_out_date: bookingData.checkOutDate,
				adults: bookingData.adults || 1,
				children: bookingData.children || 0,
				room_type_preference: bookingData.roomTypePreference || null,
				special_requests: bookingData.specialRequests || null,
				status: "pending",
				source: "public_form",
				ip_address: ipAddress,
				user_agent: userAgent,
			})
			.select()
			.single();

		if (bookingError) {
			console.error("Error creating booking:", bookingError);
			return new Response(
				JSON.stringify({
					error: "Failed to create booking request",
					details: bookingError.message,
				}),
				{
					status: 500,
					headers: { ...corsHeaders, "Content-Type": "application/json" },
				},
			);
		}

		// TODO: Send email notification to hotel staff
		// You can integrate with email service here

		return new Response(
			JSON.stringify({
				success: true,
				message:
					"Booking request submitted successfully! The hotel will contact you soon.",
				bookingId: booking.id,
			}),
			{
				status: 200,
				headers: { ...corsHeaders, "Content-Type": "application/json" },
			},
		);
	} catch (error) {
		console.error("Unexpected error:", error);
		return new Response(
			JSON.stringify({
				error: "An unexpected error occurred",
				details: error instanceof Error ? error.message : "Unknown error",
			}),
			{
				status: 500,
				headers: { ...corsHeaders, "Content-Type": "application/json" },
			},
		);
	}
});
