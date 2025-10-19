import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";

// Beds24 API V2 base URL
const BEDS24_API_BASE = "https://beds24.com/api/v2";

// Token management
let ACCESS_TOKEN = "";
let EXPIRES_AT = 0;

const corsHeaders = {
	"Access-Control-Allow-Origin": "*",
	"Access-Control-Allow-Headers":
		"authorization, x-client-info, apikey, content-type",
	"Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

type JsonRecord = Record<string, unknown>;

interface V2Property {
	id?: string | number;
	name?: string;
}

interface V2Booking extends JsonRecord {
	id?: string | number;
	propertyId?: string | number;
	propId?: string | number; // fallback for potential alt naming
	roomId?: string | number;
	roomName?: string;
	roomType?: { name?: string };
	arrival?: string; // v1 style
	departure?: string; // v1 style
	arrivalDate?: string; // possible v2 naming
	departureDate?: string; // possible v2 naming
	checkin?: string;
	checkout?: string;
	checkIn?: string;
	checkOut?: string;
	numAdult?: number;
	numChild?: number;
	adults?: number;
	children?: number;
	guestName?: string;
	guestFirstName?: string;
	name?: string;
	primaryGuest?: { name?: string };
	status?: string;
	apiSourceId?: number; // 1: direct, 2: airbnb, 3: booking.com (based on v1 knowledge)
	source?: string; // potential v2 naming
	sourceName?: string; // potential v2 naming
	price?: number;
	total?: number;
	totalAmount?: number;
}

// Function to refresh access token using refresh token
async function refreshAccessToken() {
	const refreshToken = Deno.env.get("BEDS24_REFRESH_TOKEN");
	if (!refreshToken) {
		throw new Error("Missing Beds24 refresh token (BEDS24_REFRESH_TOKEN)");
	}

	console.log("Refreshing Beds24 access token...");
	const response = await fetch(
		"https://beds24.com/api/v2/authentication/token",
		{
			method: "GET",
			headers: {
				accept: "application/json",
				refreshToken: refreshToken,
			},
		},
	);

	if (!response.ok) {
		const errorText = await response.text();
		console.error("Token refresh failed:", response.status, errorText);
		throw new Error(
			`Token refresh failed: ${response.status} ${response.statusText}`,
		);
	}

	const tokenData = await response.json();
	ACCESS_TOKEN = tokenData.token;
	EXPIRES_AT = Date.now() + (tokenData.expiresIn - 60) * 1000; // Refresh 1 min early
	console.log("Access token refreshed successfully");
}

// Function to make authenticated requests to Beds24 API
async function beds24Request(path: string) {
	// Check if we need to refresh the token
	if (!ACCESS_TOKEN || Date.now() > EXPIRES_AT) {
		await refreshAccessToken();
	}

	let response = await fetch(`${BEDS24_API_BASE}${path}`, {
		headers: {
			accept: "application/json",
			token: ACCESS_TOKEN,
		},
	});

	// If we get 401, try refreshing token once more
	if (response.status === 401) {
		console.log("Got 401, refreshing token and retrying...");
		await refreshAccessToken();
		response = await fetch(`${BEDS24_API_BASE}${path}`, {
			headers: {
				accept: "application/json",
				token: ACCESS_TOKEN,
			},
		});
	}

	if (!response.ok) {
		const errorText = await response.text();
		console.error(`Beds24 API request failed: ${response.status}`, errorText);
		throw new Error(
			`Beds24 API request failed: ${response.status} ${response.statusText}`,
		);
	}

	return response.json();
}

serve(async (req) => {
	// Handle CORS preflight requests
	if (req.method === "OPTIONS") {
		return new Response(null, { headers: corsHeaders });
	}

	try {
		console.log("Starting Beds24 (API v2) bookings sync...");

		// Initialize Supabase client
		const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
		const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
		const supabase = createClient(supabaseUrl, supabaseServiceKey);

		// Fetch active Beds24 property mappings for resolving properties to locations
		const { data: propertyMappings, error: mappingsError } = await supabase
			.from("beds24_property_mappings")
			.select("beds24_property_id, location_id, tenant_id, beds24_property_name")
			.eq("is_active", true);

		if (mappingsError) {
			console.error("Failed to fetch property mappings:", mappingsError);
			throw new Error("Cannot sync without property mappings configured");
		}

		if (!propertyMappings || propertyMappings.length === 0) {
			console.warn("No active Beds24 property mappings found");
			return new Response(
				JSON.stringify({
					success: false,
					error: "No Beds24 property mappings configured. Please set up property mappings in the Booking Channels Integration page.",
					timestamp: new Date().toISOString(),
				}),
				{
					headers: { ...corsHeaders, "Content-Type": "application/json" },
					status: 400,
				},
			);
		}

		// Build a map of Beds24 property ID -> location details
		const propertyIdToLocation = new Map<string, { location_id: string; tenant_id: string; property_name: string }>();
		for (const mapping of propertyMappings) {
			propertyIdToLocation.set(mapping.beds24_property_id, {
				location_id: mapping.location_id,
				tenant_id: mapping.tenant_id,
				property_name: mapping.beds24_property_name,
			});
		}

		console.log(`Loaded ${propertyIdToLocation.size} active Beds24 property mappings`);

		// Fetch bookings from Beds24 API
		console.log("Fetching bookings from Beds24 API v2...");
		const bookingsJson: unknown = await beds24Request("/bookings");
		const bookings: V2Booking[] = Array.isArray((bookingsJson as any)?.data)
			? (bookingsJson as any).data
			: Array.isArray(bookingsJson)
				? (bookingsJson as any)
				: [];

		console.log(`Received ${bookings.length} bookings (pre-filter)`);

		let totalSynced = 0;
		const syncDetails: string[] = [];

		// Optional: map source id to name
		const mapSource = (b: V2Booking): string => {
			if (typeof b.source === "string" && b.source)
				return b.source.toLowerCase();
			if (typeof b.sourceName === "string" && b.sourceName)
				return b.sourceName.toLowerCase();
			switch (b.apiSourceId) {
				case 3:
					return "booking_com";
				case 2:
					return "airbnb";
				case 1:
					return "direct";
				default:
					return "unknown";
			}
		};

		// Helper to coerce date strings
		const parseDate = (s?: string): Date | null => {
			if (!s) return null;
			// If only date provided, add time portion for consistency
			if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
				return new Date(`${s}T00:00:00Z`);
			}
			const d = new Date(s);
			return isNaN(d.getTime()) ? null : d;
		};

		// Process each booking
		for (const b of bookings) {
			try {
				const externalId = b.id != null ? String(b.id) : undefined;
				if (!externalId) {
					console.warn("Skipping booking without id");
					continue;
				}

				const source = mapSource(b);
				// Skip direct/self-originated bookings to avoid duplicates
				if (source === "direct" || source === "beds24") {
					continue;
				}

				// Determine dates (try multiple possible fields)
				const arrivalStr =
					b.arrivalDate || b.arrival || (b.checkin ?? b.checkIn);
				const departureStr =
					b.departureDate || b.departure || (b.checkout ?? b.checkOut);
				const checkInDate = parseDate(arrivalStr);
				const checkOutDate = parseDate(departureStr);
				if (!checkInDate || !checkOutDate) {
					console.warn(`Skipping booking ${externalId} due to missing dates`, {
						arrivalStr,
						departureStr,
					});
					continue;
				}

			// Property mapping using beds24_property_mappings table
			const propIdRaw = b.propertyId ?? b.propId;
			const propId = propIdRaw != null ? String(propIdRaw) : undefined;
			
			// Skip if no property ID
			if (!propId) {
				console.warn(`Skipping booking ${externalId} - no property ID found`);
				continue;
			}
			
			// Look up location from property mappings
			const locationMapping = propertyIdToLocation.get(propId);
			
			// Skip if we can't resolve location (no mapping configured for this property)
			if (!locationMapping) {
				console.warn(`Skipping booking ${externalId} - no mapping found for Beds24 property ID: ${propId}. Please configure this property in the Booking Channels Integration page.`);
				continue;
			}

			const adults = b.numAdult ?? b.adults ?? 1;
			const children = b.numChild ?? b.children ?? 0;

			const guestName =
				b.guestName ||
				b.name ||
				b.guestFirstName ||
				b.primaryGuest?.name ||
				"Unknown Guest";

			const roomName =
				b.roomName ||
				b.roomType?.name ||
				(b.roomId != null ? `Room ${b.roomId}` : null);

			const totalAmount = b.totalAmount ?? b.total ?? b.price ?? 0;

			const status = (b.status ?? "unknown").toString().toLowerCase();

			const externalBookingData: Record<string, unknown> = {
				external_id: externalId,
				property_id: propId,
				source,
				guest_name: guestName,
				check_in: checkInDate.toISOString(),
				check_out: checkOutDate.toISOString(),
				status,
				total_amount: totalAmount,
				currency: "USD", // Beds24 v2 does not guarantee currency; adjust if needed
				location_id: locationMapping.location_id,
				tenant_id: locationMapping.tenant_id,
				room_name: roomName ?? null,
				adults,
				children,
				raw_data: b as JsonRecord,
				last_synced_at: new Date().toISOString(),
			};

			const { error: upsertError } = await supabase
				.from("external_bookings")
				.upsert(externalBookingData, {
					onConflict: "external_id,property_id,source",
				});

			if (upsertError) {
				console.error(`Failed to upsert booking ${externalId}:`, upsertError);
			} else {
				totalSynced++;
				syncDetails.push(`${locationMapping.property_name}: 1`);
			}
			} catch (bookingError) {
				console.error("Error processing booking:", bookingError);
			}
		}

		const message =
			totalSynced > 0
				? `Successfully synced ${totalSynced} external bookings (Beds24 v2)`
				: "No new external bookings to sync (Beds24 v2)";

		console.log(message);
		if (syncDetails.length > 0) {
			console.log("Sync details:", syncDetails.join(" | "));
		}

		return new Response(
			JSON.stringify({
				success: true,
				message,
				totalSynced,
				timestamp: new Date().toISOString(),
			}),
			{
				headers: { ...corsHeaders, "Content-Type": "application/json" },
				status: 200,
			},
		);
	} catch (error: any) {
		console.error("Beds24 v2 sync error:", error);

		return new Response(
			JSON.stringify({
				success: false,
				error: error?.message ?? "Unknown error",
				timestamp: new Date().toISOString(),
			}),
			{
				headers: { ...corsHeaders, "Content-Type": "application/json" },
				status: 500,
			},
		);
	}
});
