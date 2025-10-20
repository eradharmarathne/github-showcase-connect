import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
	"Access-Control-Allow-Origin": "*",
	"Access-Control-Allow-Headers":
		"authorization, x-client-info, apikey, content-type",
	"Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

serve(async (req) => {
	// Handle CORS preflight requests
	if (req.method === "OPTIONS") {
		return new Response(null, { headers: corsHeaders });
	}

	try {
		console.log("Exchanging Beds24 invite code for refresh token...");

		// The invite code and location_id should be passed in the request body
		const body = await req.json();
		const { inviteCode, locationId } = body;

		console.log("Request body received:", { 
			hasInviteCode: !!inviteCode, 
			inviteCodeLength: inviteCode?.length,
			hasLocationId: !!locationId 
		});

		if (!inviteCode) {
			console.error("Missing invite code in request");
			throw new Error("Invite code is required");
		}

		if (!locationId) {
			console.error("Missing location ID in request");
			throw new Error("Location ID is required");
		}

		console.log("Making request to Beds24 API...");
		
		// Exchange invite code for refresh token
		// According to Beds24 API V2 docs, invite code should be in 'code' header
		const response = await fetch(
			"https://beds24.com/api/v2/authentication/setup",
			{
				method: "GET",
				headers: {
					accept: "application/json",
					code: inviteCode,
				},
			},
		);

		console.log("Beds24 API response status:", response.status);

		if (!response.ok) {
			const errorText = await response.text();
			console.error(
				"Failed to exchange invite code:",
				response.status,
				response.statusText,
				errorText,
			);
			
			// Return more detailed error information
			return new Response(
				JSON.stringify({
					success: false,
					error: `Beds24 API error: ${response.status} ${response.statusText}`,
					details: errorText,
					timestamp: new Date().toISOString(),
				}),
				{
					headers: { ...corsHeaders, "Content-Type": "application/json" },
					status: 400, // Use 400 for client errors
				},
			);
		}

		const tokenData = await response.json();
		console.log("Successfully exchanged invite code for tokens", { 
			hasRefreshToken: !!tokenData.refreshToken,
			hasToken: !!tokenData.token 
		});

		// Get authorization header to create Supabase client
		const authHeader = req.headers.get("Authorization");
		if (!authHeader) {
			throw new Error("Authorization header required");
		}

		// Initialize Supabase client with user's auth token
		const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
		const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
		const supabase = createClient(supabaseUrl, supabaseKey, {
			global: {
				headers: { Authorization: authHeader },
			},
		});

		// Get user's tenant_id
		const { data: { user }, error: userError } = await supabase.auth.getUser();
		if (userError || !user) {
			throw new Error("Failed to get user information");
		}

		const { data: profile, error: profileError } = await supabase
			.from("profiles")
			.select("tenant_id")
			.eq("id", user.id)
			.single();

		if (profileError || !profile?.tenant_id) {
			throw new Error("Failed to get user tenant");
		}

		// Verify that the location belongs to the user's tenant
		const { data: location, error: locationError } = await supabase
			.from("locations")
			.select("id, tenant_id, name")
			.eq("id", locationId)
			.eq("tenant_id", profile.tenant_id)
			.single();

		if (locationError || !location) {
			console.error("Location validation failed:", locationError);
			throw new Error("Invalid location or location does not belong to your organization");
		}

		console.log("Validated location:", { locationId, locationName: location.name, tenantId: profile.tenant_id });

		// Save credentials to database (upsert to handle reconfiguration)
		const { error: saveError } = await supabase
			.from("beds24_credentials")
			.upsert({
				tenant_id: profile.tenant_id,
				location_id: locationId,
				refresh_token: tokenData.refreshToken,
				access_token: tokenData.token,
				token_expires_at: new Date(Date.now() + (tokenData.expiresIn || 3600) * 1000).toISOString(),
				is_active: true,
				sync_status: "active",
				created_by: user.id,
			}, {
				onConflict: "tenant_id,location_id",
			});

		if (saveError) {
			console.error("Failed to save credentials:", saveError);
			throw new Error("Failed to save Beds24 credentials to database");
		}

		console.log("Beds24 credentials saved successfully for tenant:", profile.tenant_id, "location:", locationId);

		return new Response(
			JSON.stringify({
				success: true,
				message: "Beds24 integration configured successfully! Credentials are securely stored.",
				data: {
					expiresIn: tokenData.expiresIn,
					isActive: true,
					syncStatus: "active",
				},
				timestamp: new Date().toISOString(),
			}),
			{
				headers: { ...corsHeaders, "Content-Type": "application/json" },
				status: 200,
			},
		);
	} catch (error: any) {
		console.error("Token exchange error:", error);
		console.error("Error details:", {
			message: error?.message,
			stack: error?.stack,
			name: error?.name,
		});

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
