import { createAdminClient, supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

export interface LocationPermissions extends Record<string, Json | undefined> {
	access_dashboard?: boolean;
	access_income?: boolean;
	access_expenses?: boolean;
	access_reports?: boolean;
	access_calendar?: boolean;
	access_bookings?: boolean;
	access_rooms?: boolean;
	access_master_files?: boolean;
	access_accounts?: boolean;
	access_users?: boolean;
	access_settings?: boolean;
	access_booking_channels?: boolean;
}

export interface AddUserToLocationParams {
	email: string;
	tenantId: string;
	locationId: string;
	addedBy: string;
	permissions: LocationPermissions;
	password?: string;
}

export interface AddUserToLocationResult {
	success: boolean;
	user_id?: string;
	user_created?: boolean;
	user_exists?: boolean;
	permissions_created?: boolean;
	password?: string;
	error?: string;
}

/**
 * Generates a secure temporary password
 */
const generateSecurePassword = (): string => {
	const chars =
		"ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%&*";
	let password = "";
	for (let i = 0; i < 12; i++) {
		password += chars.charAt(Math.floor(Math.random() * chars.length));
	}
	return password;
};

/**
 * Add a user to a specific location with custom permissions
 * Creates new user if doesn't exist, or adds location to existing user
 * Sends login credentials via email (no invitation tokens)
 */
export const addUserToLocation = async (
	params: AddUserToLocationParams,
): Promise<AddUserToLocationResult> => {
	try {
		// First check if user exists in profiles using regular client (RLS allows this)
		const { data: existingProfile, error: profileError } = await supabase
			.from("profiles")
			.select("id, email, tenant_id")
			.eq("email", params.email)
			.maybeSingle();

		if (profileError) {
			console.error("Error checking existing profile:", profileError);
			return {
				success: false,
				error: `Failed to check existing user: ${profileError.message}`,
			};
		}

		let userId: string;
		let userCreated = false;
		let password: string | undefined;

		if (existingProfile) {
			// User exists - update tenant if needed and add location access
			userId = existingProfile.id;
			userCreated = false;

			// Update tenant_id if not set or different (regular client with RLS)
			if (
				!existingProfile.tenant_id ||
				existingProfile.tenant_id !== params.tenantId
			) {
				const { error: updateError } = await supabase
					.from("profiles")
					.update({
						tenant_id: params.tenantId,
					})
					.eq("id", userId);

				if (updateError) {
					console.error("Error updating profile:", updateError);
					return {
						success: false,
						error: `Failed to update user profile: ${updateError.message}`,
					};
				}
			}
		} else {
			// User doesn't exist in profiles - check if auth user exists

			// Get admin client only for auth operations
			const adminClient = createAdminClient();
			if (!adminClient) {
				return {
					success: false,
					error: "Admin operations not available - service role key missing",
				};
			}

			const { data: authUsers, error: authError } =
				await adminClient.auth.admin.listUsers();

			if (authError) {
				console.error("Error checking auth users:", authError);
				return {
					success: false,
					error: `Failed to check existing auth users: ${authError.message}`,
				};
			}

			const existingAuthUser = authUsers.users.find(
				(user: any) => user.email === params.email,
			);

			if (existingAuthUser) {
				// Auth user exists but no profile - create profile using regular client
				userId = existingAuthUser.id;
				userCreated = false;

				const { error: profileCreateError } = await supabase
					.from("profiles")
					.insert({
						id: userId,
						email: params.email,
						name: params.email.split("@")[0],
						tenant_id: params.tenantId,
					});

				if (profileCreateError) {
					console.error(
						"Error creating profile for existing auth user:",
						profileCreateError,
					);
					return {
						success: false,
						error: `Failed to create user profile: ${profileCreateError.message}`,
					};
				}
			} else {
				// User doesn't exist at all - create new user account

				password = params.password || generateSecurePassword();

				// Create auth user using admin client (auth operations require admin)
				const { data: authData, error: authCreateError } =
					await adminClient.auth.admin.createUser({
						email: params.email,
						password: password,
						email_confirm: true,
					});

				if (authCreateError) {
					console.error("Error creating auth user:", authCreateError);
					return {
						success: false,
						error: `Failed to create user account: ${authCreateError.message}`,
					};
				}

				if (!authData.user) {
					return { success: false, error: "Failed to create user account" };
				}

				userId = authData.user.id;
				userCreated = true;

				// Create profile for new user using regular client (RLS allows this now)
				const { error: profileCreateError } = await supabase
					.from("profiles")
					.insert({
						id: userId,
						email: params.email,
						name: params.email.split("@")[0],
						tenant_id: params.tenantId,
					});

				if (profileCreateError) {
					console.error("Error creating profile:", profileCreateError);
					return {
						success: false,
						error: `Failed to create user profile: ${profileCreateError.message}`,
					};
				}
			}
		}

		// Create or update user permissions for this location using regular client (RLS allows this)
		const { data: existingPermissions, error: permError } = await supabase
			.from("user_permissions")
			.select("id")
			.eq("user_id", userId)
			.eq("location_id", params.locationId)
			.eq("tenant_id", params.tenantId)
			.maybeSingle();

		if (permError) {
			console.error("Error checking permissions:", permError);
			return {
				success: false,
				error: `Failed to check user permissions: ${permError.message}`,
			};
		}

		if (!existingPermissions) {
			// No existing permissions - create new using regular client (RLS allows this)
			const { error: createPermError } = await supabase
				.from("user_permissions")
				.insert({
					user_id: userId,
					location_id: params.locationId,
					tenant_id: params.tenantId,
					...params.permissions,
				});

			if (createPermError) {
				console.error("Error creating permissions:", createPermError);
				return {
					success: false,
					error: `Failed to create user permissions: ${createPermError.message}`,
				};
			}
		} else {
			// Update existing permissions using regular client (RLS allows this)
			const { error: updatePermError } = await supabase
				.from("user_permissions")
				.update({
					...params.permissions,
				})
				.eq("id", existingPermissions.id);

			if (updatePermError) {
				console.error("Error updating permissions:", updatePermError);
				return {
					success: false,
					error: `Failed to update user permissions: ${updatePermError.message}`,
				};
			}
		}

		// Send appropriate email
		try {
			if (userCreated && password) {
				// New user - send credentials
				const { error: emailError } = await supabase.functions.invoke(
					"send-user-credentials",
					{
						body: {
							to: params.email,
							email: params.email,
							password: password,
							loginUrl: `${window.location.origin}/auth`,
							organizationName: "CheckingCheckout",
							emailType: "new_user_credentials",
						},
					},
				);

				if (emailError) {
					console.error("Failed to send credentials email:", emailError);
				}
			} else {
				// Existing user - send location access notification
				const { error: emailError } = await supabase.functions.invoke(
					"send-user-credentials",
					{
						body: {
							to: params.email,
							email: params.email,
							loginUrl: `${window.location.origin}/auth`,
							organizationName: "CheckingCheckout",
							emailType: "location_access_granted",
						},
					},
				);

				if (emailError) {
					console.error("Failed to send notification email:", emailError);
				}
			}
		} catch (emailException) {
			console.error("Exception sending email:", emailException);
		}

		return {
			success: true,
			user_id: userId,
			user_created: userCreated,
			user_exists: !userCreated,
			permissions_created: true,
			password: userCreated ? password : undefined,
		};
	} catch (error) {
		console.error("Exception adding user to location:", error);
		return { success: false, error: "Failed to add user to location" };
	}
};

/**
 * Legacy function name for backward compatibility
 */
export const inviteUserToLocation = addUserToLocation;

// Export types for backward compatibility
export type InviteUserToLocationParams = AddUserToLocationParams;
export type InviteUserToLocationResult = AddUserToLocationResult;
