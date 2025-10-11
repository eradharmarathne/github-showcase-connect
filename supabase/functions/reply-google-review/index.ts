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
		const { reviewId, replyText, locationId } = await req.json();

		if (!reviewId || !replyText || !locationId) {
			throw new Error("reviewId, replyText, and locationId are required");
		}

		// Validate reply text length (Google limit is 4096 characters)
		if (replyText.length > 4096) {
			throw new Error("Reply text must be 4096 characters or less");
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

		// Check if token is expired
		if (credentials.token_expires_at) {
			const expiresAt = new Date(credentials.token_expires_at);
			const now = new Date();
			if (expiresAt <= now) {
				throw new Error("Access token expired. Please reconnect your Google account.");
			}
		}

		// Get the review details to find google_review_id
		const { data: review, error: reviewError } = await supabaseAdmin
			.from("google_reviews")
			.select("google_review_id")
			.eq("id", reviewId)
			.single();

		if (reviewError || !review) {
			throw new Error("Review not found");
		}

		// Construct Google My Business API endpoint for reply
		// PUT https://mybusiness.googleapis.com/v4/accounts/{accountId}/locations/{locationId}/reviews/{reviewId}/reply
		const apiUrl = `https://mybusiness.googleapis.com/v4/${credentials.google_account_id}/${credentials.google_location_id}/reviews/${review.google_review_id}/reply`;

		console.log(`Posting reply to: ${apiUrl}`);

		// Post reply to Google My Business API
		const response = await fetch(apiUrl, {
			method: "PUT",
			headers: {
				Authorization: `Bearer ${credentials.access_token}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				comment: replyText,
			}),
		});

		if (!response.ok) {
			const errorText = await response.text();
			console.error("Google API Error:", response.status, errorText);
			throw new Error(`Google API Error: ${response.status} - ${errorText}`);
		}

		const replyData = await response.json();
		console.log("Reply posted successfully:", replyData);

		// Update the review in our database with the reply
		// (The sync function will fetch this later, but we update immediately for better UX)
		const { error: updateError } = await supabaseAdmin
			.from("google_reviews")
			.update({
				has_reply: true,
				reply_text: replyData.comment,
				reply_updated_at: replyData.updateTime,
			})
			.eq("id", reviewId);

		if (updateError) {
			console.error("Error updating review in database:", updateError);
		}

		return new Response(
			JSON.stringify({
				success: true,
				reply: {
					comment: replyData.comment,
					updateTime: replyData.updateTime,
				},
			}),
			{
				headers: { ...corsHeaders, "Content-Type": "application/json" },
				status: 200,
			},
		);
	} catch (error) {
		console.error("Reply error:", error);
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
