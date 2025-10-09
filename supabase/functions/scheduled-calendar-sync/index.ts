import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";

const corsHeaders = {
	"Access-Control-Allow-Origin": "*",
	"Access-Control-Allow-Headers":
		"authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
	// Handle CORS preflight requests
	if (req.method === "OPTIONS") {
		return new Response(null, { headers: corsHeaders });
	}

	try {
		console.log("Starting scheduled calendar sync...");

		// Initialize Supabase client
		const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
		const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
		const supabase = createClient(supabaseUrl, supabaseServiceKey);

		// Get all active booking sync URLs from database
		const { data: syncUrls, error: syncUrlsError } = await supabase
			.from("booking_sync_urls")
			.select(
				`
				id,
				ical_url,
				location_id,
				source,
				tenant_id,
				room_id,
				is_active,
				locations (
					name,
					is_active
				)
			`,
			)
			.eq("is_active", true);

		if (syncUrlsError) {
			throw new Error(
				`Failed to fetch sync URLs: ${syncUrlsError.message}`,
			);
		}

		if (!syncUrls || syncUrls.length === 0) {
			console.log("No active sync URLs found");
			return new Response(
				JSON.stringify({
					success: true,
					message: "No active sync URLs to process",
					totalEvents: 0,
					timestamp: new Date().toISOString(),
				}),
				{
					headers: { ...corsHeaders, "Content-Type": "application/json" },
					status: 200,
				},
			);
		}

		let totalEvents = 0;
		const syncResults = [];

		console.log(`Syncing ${syncUrls.length} calendar URLs...`);

		// Sync each URL
		for (const syncUrl of syncUrls) {
			// Skip if location is inactive
			if (!syncUrl.locations?.is_active) {
				console.log(
					`Skipping ${syncUrl.source} sync for inactive location`,
				);
				continue;
			}

			console.log(
				`Syncing ${syncUrl.source} calendar for ${syncUrl.locations.name}...`,
			);

			const { data: syncResult, error: syncError } =
				await supabase.functions.invoke("sync-ical", {
					body: {
						icalUrl: syncUrl.ical_url,
						locationId: syncUrl.location_id,
						source: syncUrl.source,
						tenantId: syncUrl.tenant_id,
						propertyId: syncUrl.location_id, // Use location_id as property_id
						roomId: syncUrl.room_id,
					},
				});

			if (syncError) {
				console.error(
					`${syncUrl.locations.name} ${syncUrl.source} sync failed: ${syncError.message}`,
				);
			} else if (syncResult?.eventsCount) {
				const count = syncResult.eventsCount;
				totalEvents += count;
				syncResults.push(
					`${syncUrl.locations.name}: ${count} from ${syncUrl.source}`,
				);
			}

			// Update last_synced_at timestamp
			await supabase
				.from("booking_sync_urls")
				.update({ last_synced_at: new Date().toISOString() })
				.eq("id", syncUrl.id);

			console.log(
				`${syncUrl.locations.name}: Synced ${syncResult?.eventsCount || 0} bookings from ${syncUrl.source}`,
			);
		}

		const message =
			totalEvents > 0
				? `Successfully synced ${totalEvents} total bookings across ${syncResults.length} locations`
				: "No new bookings to sync";

		console.log(message);
		if (syncResults.length > 0) {
			console.log("Details:", syncResults.join(" | "));
		}

		return new Response(
			JSON.stringify({
				success: true,
				message,
				totalEvents,
				locations: syncResults,
				timestamp: new Date().toISOString(),
			}),
			{
				headers: { ...corsHeaders, "Content-Type": "application/json" },
				status: 200,
			},
		);
	} catch (error: any) {
		console.error("Scheduled sync error:", error);

		return new Response(
			JSON.stringify({
				success: false,
				error: error.message,
				timestamp: new Date().toISOString(),
			}),
			{
				headers: { ...corsHeaders, "Content-Type": "application/json" },
				status: 500,
			},
		);
	}
});
