import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";
import {
	BEDS24_API_URL,
	beds24ApiRequest,
} from "../_shared/beds24-auth.ts";

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

// Using shared helper functions from _shared/beds24-auth.ts
// - refreshBeds24Token: Token refresh with correct GET method
// - getBeds24Token: Get valid token with auto-refresh
// - beds24ApiRequest: Make authenticated requests with rate limit monitoring

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

		const { data: credentials, error: credError } = await credQuery
			.maybeSingle();

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

		// Fetch property details to get currency for each property
		const propertyIdToCurrency = new Map<string, string>();
		
		console.log(`📍 Fetching currency information for ${propertyIdToLocation.size} properties...`);
		
		for (const [propertyId] of propertyIdToLocation) {
			try {
				console.log(`🔍 Fetching property details for property ID: ${propertyId}`);
				
				const propertyData = await beds24ApiRequest(
					`/properties?id=${propertyId}`,
					supabase,
					credentials.id,
					credentials.access_token,
					credentials.token_expires_at ? new Date(credentials.token_expires_at) : null,
					credentials.refresh_token,
				);

				console.log(`📦 Property ${propertyId} API response:`, JSON.stringify(propertyData, null, 2));
				
				// Property API returns: { success: true, type: "property", data: [...] }
				if (propertyData.success && propertyData.data && propertyData.data.length > 0) {
					const property = propertyData.data[0];
					const currency = property.currency || "USD"; // Default to USD if not specified
					propertyIdToCurrency.set(propertyId, currency);
					console.log(`✅ Property ${propertyId} (${property.name}) uses currency: ${currency}`);
				} else {
					console.warn(`⚠️  Property ${propertyId} returned no data, using USD fallback`);
					propertyIdToCurrency.set(propertyId, "USD");
				}
			} catch (error) {
				console.error(`❌ Error fetching currency for property ${propertyId}:`, error);
				console.warn(`⚠️  Using USD fallback for property ${propertyId}`);
				propertyIdToCurrency.set(propertyId, "USD");
			}
		}

		console.log(`✅ Loaded currency information for ${propertyIdToCurrency.size} properties`);

		// Fetch room mappings for automatic room assignment
		// Filter by tenant_id and location_id for security
		let roomMappingsQuery = supabase
			.from("channel_room_mappings")
			.select("channel_room_id, room_id")
			.eq("channel", "beds24")
			.eq("is_active", true);

		// Add tenant filter if provided
		if (tenantId) {
			roomMappingsQuery = roomMappingsQuery.eq("tenant_id", tenantId);
		}
		// Add location filter if provided
		if (locationId) {
			roomMappingsQuery = roomMappingsQuery.eq("location_id", locationId);
		}

		const { data: roomMappings } = await roomMappingsQuery;

		// Build map of Beds24 roomId -> CheckingCheckout room_id
		const beds24RoomToRoomId = new Map<string, string>();
		if (roomMappings) {
			for (const mapping of roomMappings) {
				beds24RoomToRoomId.set(mapping.channel_room_id, mapping.room_id);
			}
			console.log(
				`Loaded ${beds24RoomToRoomId.size} active room mappings`,
			);
		}

		// Fetch bookings from Beds24 API using credentials from database
		console.log("Fetching bookings from Beds24 API v2...");

		// Use shared helper which includes token refresh, rate limit monitoring, and response validation
		const bookingsResponse = await beds24ApiRequest(
			"/bookings",
			supabase,
			credentials.id,
			credentials.access_token,
			credentials.token_expires_at ? new Date(credentials.token_expires_at) : null,
			credentials.refresh_token,
		);
		
		// Extract bookings array from response
		// beds24ApiRequest already validates success field, so we can safely access data
		const bookings: V2Booking[] = Array.isArray(bookingsResponse?.data)
			? bookingsResponse.data
			: Array.isArray(bookingsResponse)
				? bookingsResponse
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

			// Try to map Beds24 roomId to CheckingCheckout room_id
			let mappedRoomId: string | null = null;
			if (b.roomId != null) {
				const beds24RoomId = String(b.roomId);
				mappedRoomId = beds24RoomToRoomId.get(beds24RoomId) || null;
				
				if (mappedRoomId) {
					console.log(`Booking ${externalId}: Mapped Beds24 room ${beds24RoomId} to CCO room ${mappedRoomId}`);
				} else {
					console.log(`Booking ${externalId}: No room mapping found for Beds24 room ${beds24RoomId}`);
				}
			}

			const totalAmount = Number(b.totalAmount ?? b.total ?? b.price ?? 0);
			const depositAmount = Number(b.deposit ?? 0); // Amount paid as deposit/advance
			const balanceAmount = totalAmount - depositAmount; // Remaining balance

			const status = (b.status ?? "unknown").toString().toLowerCase();

			// Get currency from property settings (booking objects don't include currency)
			// Beds24 API V2 booking schema does not include currency field
			// Currency is a property-level setting, not per-booking
			const currency = propId ? (propertyIdToCurrency.get(propId) || "USD") : "USD";
			
			if (externalId) {
				console.log(`💰 Booking ${externalId}: Total ${totalAmount} ${currency}, Paid ${depositAmount} ${currency}, Balance ${balanceAmount} ${currency} (property: ${propId})`);
			}

			// Calculate nights for the reservation
			const nights = Math.ceil(
				(checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24)
			);
			const roomRate = nights > 0 ? totalAmount / nights : 0;

			const reservationData: Record<string, unknown> = {
				external_id: externalId,
				property_id: propId,
				source_channel: source,
				guest_name: guestName,
				check_in_timestamp: checkInDate.toISOString(),
				check_out_timestamp: checkOutDate.toISOString(),
				check_in_date: checkInDate.toISOString().split('T')[0], // Extract date only
				check_out_date: checkOutDate.toISOString().split('T')[0], // Extract date only
				status,
				total_amount: totalAmount,
				paid_amount: depositAmount,
				balance_amount: balanceAmount,
				currency: currency,
				location_id: locationMapping.location_id,
				tenant_id: locationMapping.tenant_id,
				room_id: mappedRoomId,  // ✅ Auto-assigned room via mapping!
				room_name: roomName ?? null,
				adults,
				children,
				nights,
				room_rate: roomRate,
				is_external: true, // ✅ Mark as external booking
				booking_source: source,
				raw_data: b as JsonRecord,
				last_synced_at: new Date().toISOString(),
			};

			const { error: upsertError } = await supabase
				.from("reservations")
				.upsert(reservationData, {
					onConflict: "external_id,property_id,source_channel",
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
