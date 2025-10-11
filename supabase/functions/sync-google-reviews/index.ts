import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
		const { locationId } = await req.json();

		if (!locationId) {
			throw new Error("locationId is required");
		}

		// Create Supabase admin client
		const supabaseAdmin = createClient(
			Deno.env.get("SUPABASE_URL") ?? "",
			Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
		);

		// Fetch Google Business credentials for this location
		const { data: credentials, error: credError } = await supabaseAdmin
			.from("google_business_credentials")
			.select("*")
			.eq("location_id", locationId)
			.eq("is_active", true)
			.single();

		if (credError || !credentials) {
			throw new Error("No active Google Business credentials found for this location");
		}

		// Check if access token exists
		if (!credentials.access_token) {
			throw new Error("Access token not found. Please reconnect your Google account.");
		}

		// Check if token is expired and needs refresh
		if (credentials.token_expires_at) {
			const expiresAt = new Date(credentials.token_expires_at);
			const now = new Date();
			if (expiresAt <= now && credentials.refresh_token) {
				// TODO: Implement token refresh logic
				// For now, throw error to prompt re-authentication
				throw new Error("Access token expired. Please reconnect your Google account.");
			}
		}

		// Construct Google My Business API endpoint
		// GET https://mybusiness.googleapis.com/v4/accounts/{accountId}/locations/{locationId}/reviews
		const apiUrl = `https://mybusiness.googleapis.com/v4/${credentials.google_account_id}/${credentials.google_location_id}/reviews`;

		console.log(`Fetching reviews from: ${apiUrl}`);

		// Fetch reviews from Google My Business API
		const response = await fetch(apiUrl, {
			method: "GET",
			headers: {
				Authorization: `Bearer ${credentials.access_token}`,
				"Content-Type": "application/json",
			},
		});

		if (!response.ok) {
			const errorText = await response.text();
			console.error("Google API Error:", response.status, errorText);

			// Update credentials with error status
			await supabaseAdmin
				.from("google_business_credentials")
				.update({
					sync_status: "error",
					error_message: `API Error ${response.status}: ${errorText}`,
				})
				.eq("id", credentials.id);

			throw new Error(`Google API Error: ${response.status} - ${errorText}`);
		}

		const reviewsData = await response.json();
		console.log(`Fetched ${reviewsData.reviews?.length || 0} reviews`);

		// Helper function to convert Google star rating to numeric value
		const convertStarRating = (starRating: string): number => {
			const ratingMap: Record<string, number> = {
				ONE: 1,
				TWO: 2,
				THREE: 3,
				FOUR: 4,
				FIVE: 5,
			};
			return ratingMap[starRating] || 0;
		};

		// Process and upsert each review
		const reviews = reviewsData.reviews || [];
		let successCount = 0;
		let errorCount = 0;

		for (const review of reviews) {
			try {
				const reviewRecord = {
					tenant_id: credentials.tenant_id,
					location_id: credentials.location_id,
					google_review_id: review.reviewId,
					reviewer_name: review.reviewer?.displayName || "Anonymous",
					reviewer_profile_photo_url: review.reviewer?.profilePhotoUrl || null,
					star_rating: convertStarRating(review.starRating),
					comment: review.comment || null,
					review_time: review.createTime,
					has_reply: !!review.reviewReply,
					reply_text: review.reviewReply?.comment || null,
					reply_updated_at: review.reviewReply?.updateTime || null,
					raw_data: review,
					last_fetched_at: new Date().toISOString(),
				};

				const { error: upsertError } = await supabaseAdmin
					.from("google_reviews")
					.upsert(reviewRecord, {
						onConflict: "google_review_id",
					});

				if (upsertError) {
					console.error("Error upserting review:", upsertError);
					errorCount++;
				} else {
					successCount++;
				}
			} catch (reviewError) {
				console.error("Error processing review:", reviewError);
				errorCount++;
			}
		}

		// Update credentials sync status
		await supabaseAdmin
			.from("google_business_credentials")
			.update({
				last_synced_at: new Date().toISOString(),
				sync_status: errorCount > 0 ? "error" : "active",
				error_message: errorCount > 0 ? `${errorCount} reviews failed to sync` : null,
			})
			.eq("id", credentials.id);

		return new Response(
			JSON.stringify({
				success: true,
				totalReviews: reviews.length,
				successCount,
				errorCount,
				averageRating: reviewsData.averageRating || null,
				totalReviewCount: reviewsData.totalReviewCount || reviews.length,
			}),
			{
				headers: { ...corsHeaders, "Content-Type": "application/json" },
				status: 200,
			},
		);
	} catch (error) {
		console.error("Sync error:", error);
		return new Response(
			JSON.stringify({
				success: false,
				error: error instanceof Error ? error.message : "Unknown error occurred",
			}),
			{
				headers: { ...corsHeaders, "Content-Type": "application/json" },
				status: 500,
			},
		);
	}
});
