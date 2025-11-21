import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
	"Access-Control-Allow-Origin": "*",
	"Access-Control-Allow-Headers":
		"authorization, x-client-info, apikey, content-type",
	"Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
	// Handle CORS preflight requests
	if (req.method === "OPTIONS") {
		return new Response("ok", { headers: corsHeaders });
	}

	console.log("🚀 Polar checkout Edge Function called");
	console.log("Method:", req.method);

	if (req.method !== "POST") {
		return new Response("Method not allowed", {
			status: 405,
			headers: corsHeaders,
		});
	}

	try {
		const requestBody = await req.json();
		console.log("📥 Received request body:", JSON.stringify(requestBody, null, 2));

		const {
			product_price_id,
			success_url,
			metadata,
			customer_email,
			customer_name,
			organization_id,
		} = requestBody;

		// Validate required parameters
		if (!product_price_id) {
			console.log("❌ product_price_id is missing");
			return new Response(
				JSON.stringify({ error: "product_price_id is required" }),
				{
					status: 400,
					headers: { ...corsHeaders, "Content-Type": "application/json" },
				},
			);
		}

		// Get Polar API access token from environment variables
		const POLAR_ACCESS_TOKEN = Deno.env.get("POLAR_ACCESS_TOKEN");
		if (!POLAR_ACCESS_TOKEN) {
			console.error("❌ POLAR_ACCESS_TOKEN environment variable not set");
			return new Response(
				JSON.stringify({ error: "Server configuration error" }),
				{
					status: 500,
					headers: { ...corsHeaders, "Content-Type": "application/json" },
				},
			);
		}

		// Get organization ID from environment or request
		const orgId = organization_id || Deno.env.get("POLAR_ORGANIZATION_ID");
		if (!orgId) {
			console.error("❌ POLAR_ORGANIZATION_ID not provided");
			return new Response(
				JSON.stringify({
					error: "organization_id is required",
				}),
				{
					status: 400,
					headers: { ...corsHeaders, "Content-Type": "application/json" },
				},
			);
		}

		// Prepare request body for Polar API
		// Note: Polar API expects 'product_price_id' for the custom checkout endpoint
		const polarRequestBody: {
			product_price_id: string;
			payment_processor?: string;
			success_url?: string;
			customer_email?: string;
			customer_name?: string;
			metadata?: Record<string, string | number | boolean>;
		} = {
			product_price_id,
		};

		// Add success URL if provided
		if (success_url) {
			polarRequestBody.success_url = success_url;
		}

		// Add customer information if provided
		if (customer_email) {
			polarRequestBody.customer_email = customer_email;
		}
		if (customer_name) {
			polarRequestBody.customer_name = customer_name;
		}

		// Add metadata (important for tracking tenant_id, user_id, plan_id)
		if (metadata) {
			polarRequestBody.metadata = metadata;
		}

		console.log("📤 Creating Polar checkout session:", {
			url: "https://api.polar.sh/v1/checkouts/custom/",
			product_price_id,
			has_metadata: !!metadata,
			has_customer: !!(customer_email || customer_name),
		});

		// Make request to Polar API
		// Using /custom/ endpoint which accepts product_price_id directly
		const response = await fetch("https://api.polar.sh/v1/checkouts/custom/", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${POLAR_ACCESS_TOKEN}`,
				Accept: "application/json",
			},
			body: JSON.stringify(polarRequestBody),
		});

		const responseData = await response.json();

		if (!response.ok) {
			console.error("❌ Polar API error:", {
				status: response.status,
				statusText: response.statusText,
				body: responseData,
			});

			return new Response(
				JSON.stringify({
					error: "Polar API error",
					details: responseData,
				}),
				{
					status: response.status,
					headers: { ...corsHeaders, "Content-Type": "application/json" },
				},
			);
		}

		console.log("✅ Polar checkout session created:", {
			checkout_id: responseData.id,
			checkout_url: responseData.url,
			client_secret: responseData.client_secret ? "[REDACTED]" : null,
		});

		// Return successful response with checkout URL and client secret
		return new Response(JSON.stringify(responseData), {
			headers: { ...corsHeaders, "Content-Type": "application/json" },
		});
	} catch (error) {
		console.error("❌ Error in create-polar-checkout function:", error);

		return new Response(
			JSON.stringify({
				error: "Internal server error",
				message: error instanceof Error ? error.message : "Unknown error",
			}),
			{
				status: 500,
				headers: { ...corsHeaders, "Content-Type": "application/json" },
			},
		);
	}
});
