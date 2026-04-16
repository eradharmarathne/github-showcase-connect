import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
	"Access-Control-Allow-Origin": "*",
	"Access-Control-Allow-Headers":
		"authorization, x-client-info, apikey, content-type",
};

interface InviteRequest {
	email: string;
	tenantId: string;
	locationId: string;
	addedBy: string;
	permissions: Record<string, boolean>;
	password?: string;
}

const generateSecurePassword = (): string => {
	const chars =
		"ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%&*";
	let password = "";
	for (let i = 0; i < 12; i++) {
		password += chars.charAt(Math.floor(Math.random() * chars.length));
	}
	return password;
};

serve(async (req) => {
	if (req.method === "OPTIONS") {
		return new Response(null, { status: 200, headers: corsHeaders });
	}

	try {
		const supabaseUrl = Deno.env.get("SUPABASE_URL");
		const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
		const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");

		if (!supabaseUrl || !supabaseServiceKey || !supabaseAnonKey) {
			throw new Error("Missing Supabase configuration");
		}

		const authHeader = req.headers.get("authorization");
		if (!authHeader) {
			return new Response(
				JSON.stringify({ success: false, error: "Missing authorization" }),
				{
					status: 401,
					headers: { ...corsHeaders, "Content-Type": "application/json" },
				},
			);
		}

		// Verify the calling user is authenticated
		const anonClient = createClient(supabaseUrl, supabaseAnonKey);
		const {
			data: { user: callingUser },
			error: authError,
		} = await anonClient.auth.getUser(authHeader.replace("Bearer ", ""));

		if (authError || !callingUser) {
			return new Response(
				JSON.stringify({ success: false, error: "Unauthorized" }),
				{
					status: 401,
					headers: { ...corsHeaders, "Content-Type": "application/json" },
				},
			);
		}

		const {
			email,
			tenantId,
			locationId,
			addedBy,
			permissions,
			password: customPassword,
		}: InviteRequest = await req.json();

		if (!email || !tenantId || !locationId || !addedBy) {
			return new Response(
				JSON.stringify({
					success: false,
					error: "Missing required fields: email, tenantId, locationId, addedBy",
				}),
				{
					status: 400,
					headers: { ...corsHeaders, "Content-Type": "application/json" },
				},
			);
		}

		const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
			auth: { autoRefreshToken: false, persistSession: false },
		});

		// Check if user exists in profiles
		const { data: existingProfile, error: profileError } = await adminClient
			.from("profiles")
			.select("id, email, tenant_id")
			.eq("email", email)
			.maybeSingle();

		if (profileError) {
			console.error("Error checking existing profile:", profileError);
			return new Response(
				JSON.stringify({
					success: false,
					error: `Failed to check existing user: ${profileError.message}`,
				}),
				{
					status: 500,
					headers: { ...corsHeaders, "Content-Type": "application/json" },
				},
			);
		}

		let userId: string;
		let userCreated = false;
		let password: string | undefined;

		if (existingProfile) {
			userId = existingProfile.id;

			if (
				!existingProfile.tenant_id ||
				existingProfile.tenant_id !== tenantId
			) {
				const { error: updateError } = await adminClient
					.from("profiles")
					.update({ tenant_id: tenantId })
					.eq("id", userId);

				if (updateError) {
					console.error("Error updating profile:", updateError);
					return new Response(
						JSON.stringify({
							success: false,
							error: `Failed to update user profile: ${updateError.message}`,
						}),
						{
							status: 500,
							headers: {
								...corsHeaders,
								"Content-Type": "application/json",
							},
						},
					);
				}
			}
		} else {
			// Check if auth user exists without a profile
			const { data: authUsers, error: authListError } =
				await adminClient.auth.admin.listUsers();

			if (authListError) {
				console.error("Error checking auth users:", authListError);
				return new Response(
					JSON.stringify({
						success: false,
						error: `Failed to check existing auth users: ${authListError.message}`,
					}),
					{
						status: 500,
						headers: {
							...corsHeaders,
							"Content-Type": "application/json",
						},
					},
				);
			}

			const existingAuthUser = authUsers.users.find(
				(user: any) => user.email === email,
			);

			if (existingAuthUser) {
				userId = existingAuthUser.id;

				const { error: profileCreateError } = await adminClient
					.from("profiles")
					.upsert(
						{
							id: userId,
							email: email,
							name: email.split("@")[0],
							tenant_id: tenantId,
						},
						{ onConflict: "id" },
					);

				if (profileCreateError) {
					console.error(
						"Error creating profile for existing auth user:",
						profileCreateError,
					);
					return new Response(
						JSON.stringify({
							success: false,
							error: `Failed to create user profile: ${profileCreateError.message}`,
						}),
						{
							status: 500,
							headers: {
								...corsHeaders,
								"Content-Type": "application/json",
							},
						},
					);
				}
			} else {
				password = customPassword || generateSecurePassword();

				const { data: authData, error: authCreateError } =
					await adminClient.auth.admin.createUser({
						email: email,
						password: password,
						email_confirm: true,
					});

				if (authCreateError) {
					console.error("Error creating auth user:", authCreateError);
					return new Response(
						JSON.stringify({
							success: false,
							error: `Failed to create user account: ${authCreateError.message}`,
						}),
						{
							status: 500,
							headers: {
								...corsHeaders,
								"Content-Type": "application/json",
							},
						},
					);
				}

				if (!authData.user) {
					return new Response(
						JSON.stringify({
							success: false,
							error: "Failed to create user account",
						}),
						{
							status: 500,
							headers: {
								...corsHeaders,
								"Content-Type": "application/json",
							},
						},
					);
				}

				userId = authData.user.id;
				userCreated = true;

				const { error: profileCreateError } = await adminClient
					.from("profiles")
					.upsert(
						{
							id: userId,
							email: email,
							name: email.split("@")[0],
							tenant_id: tenantId,
						},
						{ onConflict: "id" },
					);

				if (profileCreateError) {
					console.error("Error creating profile:", profileCreateError);
					return new Response(
						JSON.stringify({
							success: false,
							error: `Failed to create user profile: ${profileCreateError.message}`,
						}),
						{
							status: 500,
							headers: {
								...corsHeaders,
								"Content-Type": "application/json",
							},
						},
					);
				}
			}
		}

		// Create or update user permissions
		const { data: existingPermissions, error: permError } = await adminClient
			.from("user_permissions")
			.select("id")
			.eq("user_id", userId!)
			.eq("location_id", locationId)
			.eq("tenant_id", tenantId)
			.maybeSingle();

		if (permError) {
			console.error("Error checking permissions:", permError);
			return new Response(
				JSON.stringify({
					success: false,
					error: `Failed to check user permissions: ${permError.message}`,
				}),
				{
					status: 500,
					headers: { ...corsHeaders, "Content-Type": "application/json" },
				},
			);
		}

		if (!existingPermissions) {
			const { error: createPermError } = await adminClient
				.from("user_permissions")
				.insert({
					user_id: userId!,
					location_id: locationId,
					tenant_id: tenantId,
					...permissions,
				});

			if (createPermError) {
				console.error("Error creating permissions:", createPermError);
				return new Response(
					JSON.stringify({
						success: false,
						error: `Failed to create user permissions: ${createPermError.message}`,
					}),
					{
						status: 500,
						headers: {
							...corsHeaders,
							"Content-Type": "application/json",
						},
					},
				);
			}
		} else {
			const { error: updatePermError } = await adminClient
				.from("user_permissions")
				.update({ ...permissions })
				.eq("id", existingPermissions.id);

			if (updatePermError) {
				console.error("Error updating permissions:", updatePermError);
				return new Response(
					JSON.stringify({
						success: false,
						error: `Failed to update user permissions: ${updatePermError.message}`,
					}),
					{
						status: 500,
						headers: {
							...corsHeaders,
							"Content-Type": "application/json",
						},
					},
				);
			}
		}

		return new Response(
			JSON.stringify({
				success: true,
				user_id: userId!,
				user_created: userCreated,
				user_exists: !userCreated,
				permissions_created: true,
				password: userCreated ? password : undefined,
			}),
			{
				status: 200,
				headers: { ...corsHeaders, "Content-Type": "application/json" },
			},
		);
	} catch (error) {
		console.error("Exception in invite-user:", error);
		return new Response(
			JSON.stringify({
				success: false,
				error: error instanceof Error ? error.message : "Failed to add user to location",
			}),
			{
				status: 500,
				headers: { ...corsHeaders, "Content-Type": "application/json" },
			},
		);
	}
});
