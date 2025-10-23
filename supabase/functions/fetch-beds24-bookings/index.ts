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
	guestLastName?: string;
	firstName?: string;
	lastName?: string;
	name?: string;
	primaryGuest?: { name?: string };
	status?: string;
	apiSourceId?: number; // 1: direct, 2: airbnb, 3: booking.com (based on v1 knowledge)
	source?: string; // potential v2 naming
	sourceName?: string; // potential v2 naming
	price?: number;
	total?: number;
	totalAmount?: number;
	currency?: string; // Currency code (USD, LKR, EUR, etc.)
	ucurrency?: string; // Alternative currency field name in Beds24 API
}

// Function to refresh access token using refresh token from database
async function refreshAccessToken(
	supabase: any,
	credentialId: string,
	refreshToken: string,
) {
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
	const newAccessToken = tokenData.token;
	const expiresAt = new Date(Date.now() + (tokenData.expiresIn - 60) * 1000);

	// Update the database with new access token and expiry
	const { error: updateError } = await supabase
		.from("beds24_credentials")
		.update({
			access_token: newAccessToken,
			token_expires_at: expiresAt.toISOString(),
		})
		.eq("id", credentialId);

	if (updateError) {
		console.error("Failed to update access token in database:", updateError);
		// Don't throw - we can still use the token for this request
	}

	console.log("Access token refreshed successfully");
	return { token: newAccessToken, expiresAt };
}

// Function to make authenticated requests to Beds24 API
async function beds24Request(
	path: string,
	supabase: any,
	credentialId: string,
	accessToken: string,
	tokenExpiresAt: Date,
	refreshToken: string,
) {
	let currentToken = accessToken;

	// Check if we need to refresh the token
	if (!currentToken || Date.now() > tokenExpiresAt.getTime()) {
		const refreshed = await refreshAccessToken(
			supabase,
			credentialId,
			refreshToken,
		);
		currentToken = refreshed.token;
	}

	let response = await fetch(`${BEDS24_API_BASE}${path}`, {
		headers: {
			accept: "application/json",
			token: currentToken,
		},
	});

	// If we get 401, try refreshing token once more
	if (response.status === 401) {
		console.log("Got 401, refreshing token and retrying...");
		const refreshed = await refreshAccessToken(
			supabase,
			credentialId,
			refreshToken,
		);
		currentToken = refreshed.token;

		response = await fetch(`${BEDS24_API_BASE}${path}`, {
			headers: {
				accept: "application/json",
				token: currentToken,
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

		// Parse request body to get tenant_id and location_id
		let requestBody: { tenant_id?: string; location_id?: string } = {};
		try {
			if (req.method === "POST") {
				requestBody = await req.json();
			}
		} catch (e) {
			// If body parsing fails, continue without filters
			console.log("No request body provided, syncing all locations");
		}

		const tenantId = requestBody.tenant_id;
		const locationId = requestBody.location_id;
		console.log(
			"Filters:",
			tenantId ? `tenant_id=${tenantId}` : "ALL TENANTS",
			locationId ? `location_id=${locationId}` : "ALL LOCATIONS",
		);

		// Initialize Supabase client
		const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
		const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
		const supabase = createClient(supabaseUrl, supabaseServiceKey);

		// Fetch Beds24 credentials - required to authenticate with Beds24 API
		let credQuery = supabase
			.from("beds24_credentials")
			.select("*")
			.eq("is_active", true);

		if (tenantId) {
			credQuery = credQuery.eq("tenant_id", tenantId);
		}
		if (locationId) {
			credQuery = credQuery.eq("location_id", locationId);
		}

		const { data: credentials, error: credError } = await credQuery.limit(1)
			.single();

		if (credError || !credentials) {
			console.error("No active Beds24 credentials found:", credError);
			return new Response(
				JSON.stringify({
					success: false,
					error: "No Beds24 credentials configured. Please connect your Beds24 account first.",
					code: "NO_CREDENTIALS",
					timestamp: new Date().toISOString(),
				}),
				{
					headers: { ...corsHeaders, "Content-Type": "application/json" },
					status: 200,
				},
			);
		}

		console.log(
			`Using Beds24 credentials for location ${credentials.location_id}`,
		);

		// Fetch active Beds24 property mappings for resolving properties to locations
		// Filter by tenant_id if provided
		let query = supabase
			.from("beds24_property_mappings")
			.select("beds24_property_id, location_id, tenant_id, beds24_property_name")
			.eq("is_active", true);

		if (tenantId) {
			query = query.eq("tenant_id", tenantId);
		}
		if (locationId) {
			query = query.eq("location_id", locationId);
		}

		const { data: propertyMappings, error: mappingsError } = await query;

		if (mappingsError) {
			console.error("Failed to fetch property mappings:", mappingsError);
			throw new Error("Cannot sync without property mappings configured");
		}

		if (!propertyMappings || propertyMappings.length === 0) {
			console.warn(
				`No active Beds24 property mappings found${tenantId ? ` for tenant ${tenantId}` : ""}${locationId ? ` and location ${locationId}` : ""}`,
			);
			return new Response(
				JSON.stringify({
					success: false,
					error: `No Beds24 property mappings configured${tenantId ? " for your account" : ""}. Please set up property mappings in the Settings tab.`,
					code: "NO_MAPPINGS",
					timestamp: new Date().toISOString(),
				}),
				{
					headers: { ...corsHeaders, "Content-Type": "application/json" },
					status: 200, // Return 200 with error info instead of 400
				},
			);
		}

		// Build a map of Beds24 property ID -> location details
		const propertyIdToLocation = new Map<
			string,
			{ location_id: string; tenant_id: string; property_name: string }
		>();
		for (const mapping of propertyMappings) {
			propertyIdToLocation.set(mapping.beds24_property_id, {
				location_id: mapping.location_id,
				tenant_id: mapping.tenant_id,
				property_name: mapping.beds24_property_name,
			});
		}

		console.log(
			`Loaded ${propertyIdToLocation.size} active Beds24 property mappings`,
		);

		// Fetch bookings from Beds24 API using credentials from database
		console.log("Fetching bookings from Beds24 API v2...");
		const tokenExpiresAt = credentials.token_expires_at
			? new Date(credentials.token_expires_at)
			: new Date(0);

		const bookingsJson: unknown = await beds24Request(
			"/bookings",
			supabase,
			credentials.id,
			credentials.access_token,
			tokenExpiresAt,
			credentials.refresh_token,
		);
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
			// First, check if there's a channel field (Beds24 v2 API uses this)
			if (typeof (b as any).channel === "string" && (b as any).channel) {
				const channel = (b as any).channel.toLowerCase();
				if (channel === "booking") return "booking_com";
				if (channel === "airbnb") return "airbnb";
				if (channel === "expedia") return "expedia";
				if (channel === "vrbo") return "vrbo";
				// Add more channel mappings as needed
			}
			
			// Fallback to source/sourceName fields
			if (typeof b.source === "string" && b.source)
				return b.source.toLowerCase();
			if (typeof b.sourceName === "string" && b.sourceName)
				return b.sourceName.toLowerCase();
			
			// Legacy apiSourceId mapping (older Beds24 API)
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

			// Extract guest name from various possible fields
			const firstName = b.firstName || b.guestFirstName || "";
			const lastName = b.lastName || b.guestLastName || "";
			const fullName = `${firstName} ${lastName}`.trim();
			
			const guestName =
				fullName ||
				b.guestName ||
				b.name ||
				b.primaryGuest?.name ||
				"Unknown Guest";

			const roomName =
				b.roomName ||
				b.roomType?.name ||
				(b.roomId != null ? `Room ${b.roomId}` : null);

			const totalAmount = b.totalAmount ?? b.total ?? b.price ?? 0;

			const status = (b.status ?? "unknown").toString().toLowerCase();

			// Extract currency from Beds24 API - check multiple possible field names
			const currency = b.currency || b.ucurrency || "USD";

			const externalBookingData: Record<string, unknown> = {
				external_id: externalId,
				property_id: propId,
				source,
				guest_name: guestName,
				check_in: checkInDate.toISOString(),
				check_out: checkOutDate.toISOString(),
				status,
				total_amount: totalAmount,
				currency: currency,
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
