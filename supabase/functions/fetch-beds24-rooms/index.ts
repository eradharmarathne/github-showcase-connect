/**
 * Edge Function: fetch-beds24-rooms
 * 
 * Fetches all rooms/properties from Beds24 API for a specific location.
 * Used to set up room mappings between Beds24 and CheckingCheckout.
 * 
 * This enables automatic room assignment when processing external bookings.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const BEDS24_API_URL = "https://api.beds24.com/v2";

const corsHeaders = {
	"Access-Control-Allow-Origin": "*",
	"Access-Control-Allow-Headers":
		"authorization, x-client-info, apikey, content-type",
};

interface Beds24Room {
	id: number;
	propertyId: number;
	name: string;
	description?: string;
	roomQty?: number;
	minOccupancy?: number;
	maxOccupancy?: number;
	type?: string;
}

serve(async (req) => {
	// Handle CORS preflight
	if (req.method === "OPTIONS") {
		return new Response(null, { headers: corsHeaders });
	}

	try {
		if (req.method !== "POST") {
			return new Response(JSON.stringify({ error: "Method not allowed" }), {
				status: 405,
				headers: { ...corsHeaders, "Content-Type": "application/json" },
			});
		}

		const { location_id } = await req.json();

		if (!location_id) {
			return new Response(
				JSON.stringify({ error: "location_id is required" }),
				{ status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
			);
		}

		// Initialize Supabase client
		const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
		const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
		const supabase = createClient(supabaseUrl, supabaseServiceKey);

		// Get Beds24 credentials for this location
		const { data: beds24Creds, error: credsError } = await supabase
			.from("beds24_credentials")
			.select("access_token, refresh_token, token_expires_at, tenant_id")
			.eq("location_id", location_id)
			.eq("is_active", true)
			.single();

		if (credsError || !beds24Creds) {
			return new Response(
				JSON.stringify({
					error: "Beds24 credentials not found for this location",
					details: "Please connect Beds24 in Booking Channels Integration",
				}),
				{ status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
			);
		}

		// Check if access token needs refresh
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
				return new Response(
					JSON.stringify({ error: "Failed to refresh Beds24 access token" }),
					{ status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
				);
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
				.eq("location_id", location_id);
		}

		// Get property mappings to find Beds24 property IDs for this location
		const { data: propertyMappings, error: mappingsError } = await supabase
			.from("beds24_property_mappings")
			.select("beds24_property_id, beds24_property_name")
			.eq("location_id", location_id)
			.eq("is_active", true);

		if (mappingsError || !propertyMappings || propertyMappings.length === 0) {
			return new Response(
				JSON.stringify({
					error: "No Beds24 property mappings found",
					details:
						"Please configure property mappings in Booking Channels Integration",
				}),
				{ status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
			);
		}

		console.log(
			`Fetching rooms for ${propertyMappings.length} Beds24 properties`,
		);

		// Fetch rooms for each property
		const allRooms: Array<Beds24Room & { propertyName: string }> = [];

		for (const mapping of propertyMappings) {
			try {
				// Fetch rooms from Beds24 API
				const roomsResponse = await fetch(
					`${BEDS24_API_URL}/inventory/rooms?propertyId=${mapping.beds24_property_id}`,
					{
						headers: {
							token: accessToken,
						},
					},
				);

				if (!roomsResponse.ok) {
					console.error(
						`Failed to fetch rooms for property ${mapping.beds24_property_id}:`,
						roomsResponse.status,
					);
					continue;
				}

				const roomsData = await roomsResponse.json();
				const rooms: Beds24Room[] = Array.isArray(roomsData?.data)
					? roomsData.data
					: Array.isArray(roomsData)
						? roomsData
						: [];

				console.log(
					`Found ${rooms.length} rooms for property ${mapping.beds24_property_name}`,
				);

				// Add property name to each room
				for (const room of rooms) {
					allRooms.push({
						...room,
						propertyName: mapping.beds24_property_name,
					});
				}
			} catch (error) {
				console.error(
					`Error fetching rooms for property ${mapping.beds24_property_id}:`,
					error,
				);
			}
		}

		// Get existing mappings for this location
		const { data: existingMappings } = await supabase
			.from("channel_room_mappings")
			.select("channel_room_id, room_id, rooms(room_number, room_type)")
			.eq("location_id", location_id)
			.eq("channel", "beds24")
			.eq("is_active", true);

		// Get all rooms for this location for auto-matching
		const { data: ccoRooms } = await supabase
			.from("rooms")
			.select("id, room_number, room_type, bed_type, description")
			.eq("location_id", location_id)
			.eq("is_active", true);

		// Build response with mapping status and suggestions
		const roomsWithStatus = allRooms.map((beds24Room) => {
			// Check if already mapped
			const existingMapping = existingMappings?.find(
				(m) => m.channel_room_id === String(beds24Room.id),
			);

			// Try to auto-match by name similarity
			let suggestedRoomId = null;
			let suggestionScore = 0;

			if (!existingMapping && ccoRooms) {
				for (const ccoRoom of ccoRooms) {
					const score = calculateNameSimilarity(
						beds24Room.name,
						`${ccoRoom.room_number} ${ccoRoom.room_type || ""} ${ccoRoom.bed_type || ""}`,
					);

					if (score > suggestionScore) {
						suggestionScore = score;
						suggestedRoomId = ccoRoom.id;
					}
				}
			}

			return {
				beds24_room_id: beds24Room.id,
				beds24_room_name: beds24Room.name,
				beds24_property_name: beds24Room.propertyName,
				beds24_property_id: beds24Room.propertyId,
				max_occupancy: beds24Room.maxOccupancy,
				description: beds24Room.description,
				mapped_to_room_id: existingMapping?.room_id || null,
				mapped_to_room: existingMapping?.rooms || null,
				is_mapped: !!existingMapping,
				suggested_room_id: suggestionScore > 0.6 ? suggestedRoomId : null,
				suggestion_score: Math.round(suggestionScore * 100),
			};
		});

		return new Response(
			JSON.stringify({
				success: true,
				rooms: roomsWithStatus,
				cco_rooms: ccoRooms,
				total_beds24_rooms: allRooms.length,
				mapped_count: existingMappings?.length || 0,
				unmapped_count:
					allRooms.length - (existingMappings?.length || 0),
			}),
			{ status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
		);
	} catch (error: any) {
		console.error("Error in fetch-beds24-rooms:", error);
		return new Response(
			JSON.stringify({
				error: "Internal server error",
				details: error.message,
			}),
			{ status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
		);
	}
});

/**
 * Calculate string similarity between two names (0-1 scale)
 * Uses simple word matching and Levenshtein-like comparison
 */
function calculateNameSimilarity(str1: string, str2: string): number {
	const s1 = str1.toLowerCase().trim();
	const s2 = str2.toLowerCase().trim();

	// Exact match
	if (s1 === s2) return 1.0;

	// Check if one contains the other
	if (s1.includes(s2) || s2.includes(s1)) return 0.9;

	// Word-level matching
	const words1 = s1.split(/\s+/);
	const words2 = s2.split(/\s+/);
	const commonWords = words1.filter((w) => words2.includes(w)).length;
	const totalWords = Math.max(words1.length, words2.length);
	const wordScore = commonWords / totalWords;

	// Character-level similarity (simplified)
	const maxLen = Math.max(s1.length, s2.length);
	let matches = 0;
	for (let i = 0; i < Math.min(s1.length, s2.length); i++) {
		if (s1[i] === s2[i]) matches++;
	}
	const charScore = matches / maxLen;

	// Weighted average
	return wordScore * 0.7 + charScore * 0.3;
}
