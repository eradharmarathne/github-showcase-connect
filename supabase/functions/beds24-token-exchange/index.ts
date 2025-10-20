import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

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

		// The invite code should be passed in the request body
		const body = await req.json();
		const { inviteCode } = body;

		console.log("Request body received:", { hasInviteCode: !!inviteCode, inviteCodeLength: inviteCode?.length });

		if (!inviteCode) {
			console.error("Missing invite code in request");
			throw new Error("Invite code is required");
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

		return new Response(
			JSON.stringify({
				success: true,
				message: "Successfully exchanged invite code",
				data: {
					refreshToken: tokenData.refreshToken,
					token: tokenData.token,
					expiresIn: tokenData.expiresIn,
					// Don't log sensitive data, but confirm we got it
					hasRefreshToken: !!tokenData.refreshToken,
					hasToken: !!tokenData.token,
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
