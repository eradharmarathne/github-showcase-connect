import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
	"Access-Control-Allow-Origin": "*",
	"Access-Control-Allow-Headers":
		"authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
	if (req.method === "OPTIONS") {
		return new Response("ok", { headers: corsHeaders });
	}

	try {
		const supabaseUrl = Deno.env.get("SUPABASE_URL");
		const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

		if (!supabaseUrl || !supabaseServiceKey) {
			throw new Error("Missing Supabase configuration");
		}

		const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

		const authHeader = req.headers.get("authorization");
		if (!authHeader) {
			return new Response(
				JSON.stringify({ error: "Missing authorization" }),
				{
					status: 401,
					headers: { ...corsHeaders, "Content-Type": "application/json" },
				},
			);
		}

		const supabaseClient = createClient(
			supabaseUrl,
			Deno.env.get("SUPABASE_ANON_KEY")!,
		);
		const {
			data: { user: caller },
			error: authError,
		} = await supabaseClient.auth.getUser(
			authHeader.replace("Bearer ", ""),
		);

		if (authError || !caller) {
			return new Response(JSON.stringify({ error: "Unauthorized" }), {
				status: 401,
				headers: { ...corsHeaders, "Content-Type": "application/json" },
			});
		}

		const { user_id, password } = await req.json();

		if (!user_id || !password) {
			return new Response(
				JSON.stringify({ error: "user_id and password are required" }),
				{
					status: 400,
					headers: { ...corsHeaders, "Content-Type": "application/json" },
				},
			);
		}

		if (password.length < 6) {
			return new Response(
				JSON.stringify({
					error: "Password must be at least 6 characters",
				}),
				{
					status: 400,
					headers: { ...corsHeaders, "Content-Type": "application/json" },
				},
			);
		}

		// Verify caller has access_users permission or is tenant owner
		const { data: callerProfile } = await supabaseAdmin
			.from("profiles")
			.select("id, tenant_id")
			.eq("id", caller.id)
			.single();

		if (!callerProfile?.tenant_id) {
			return new Response(
				JSON.stringify({ error: "Caller has no tenant" }),
				{
					status: 403,
					headers: { ...corsHeaders, "Content-Type": "application/json" },
				},
			);
		}

		const { data: tenant } = await supabaseAdmin
			.from("tenants")
			.select("id, owner_profile_id")
			.eq("id", callerProfile.tenant_id)
			.single();

		const isTenantOwner = tenant?.owner_profile_id === caller.id;

		if (!isTenantOwner) {
			const { data: permissions } = await supabaseAdmin
				.from("user_permissions")
				.select("access_users")
				.eq("user_id", caller.id)
				.eq("tenant_id", callerProfile.tenant_id)
				.limit(1);

			const hasAccess = permissions?.some((p) => p.access_users === true);
			if (!hasAccess) {
				return new Response(
					JSON.stringify({
						error: "You don't have permission to reset passwords",
					}),
					{
						status: 403,
						headers: {
							...corsHeaders,
							"Content-Type": "application/json",
						},
					},
				);
			}
		}

		// Verify target user belongs to the same tenant
		const { data: targetProfile } = await supabaseAdmin
			.from("profiles")
			.select("id, tenant_id")
			.eq("id", user_id)
			.single();

		if (!targetProfile || targetProfile.tenant_id !== callerProfile.tenant_id) {
			return new Response(
				JSON.stringify({ error: "User not found in your organization" }),
				{
					status: 404,
					headers: { ...corsHeaders, "Content-Type": "application/json" },
				},
			);
		}

		const { error: updateError } =
			await supabaseAdmin.auth.admin.updateUserById(user_id, { password });

		if (updateError) {
			console.error("Password update error:", updateError);
			throw updateError;
		}

		console.log(
			`Password reset for user ${user_id} by ${caller.id}`,
		);

		return new Response(JSON.stringify({ success: true }), {
			headers: { ...corsHeaders, "Content-Type": "application/json" },
		});
	} catch (error) {
		console.error("Error:", error);
		return new Response(
			JSON.stringify({
				error: error instanceof Error ? error.message : "Unknown error",
			}),
			{
				status: 500,
				headers: { ...corsHeaders, "Content-Type": "application/json" },
			},
		);
	}
});
