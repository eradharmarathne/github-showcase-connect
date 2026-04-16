import { supabase } from "@/integrations/supabase/client";
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
 * Add a user to a specific location with custom permissions.
 * Delegates admin operations (user creation, profile updates) to the
 * invite-user Edge Function which runs server-side with the service role key.
 * After the user is created/updated, sends login credentials via email.
 */
export const addUserToLocation = async (
	params: AddUserToLocationParams,
): Promise<AddUserToLocationResult> => {
	try {
		const { data, error } = await supabase.functions.invoke("invite-user", {
			body: {
				email: params.email,
				tenantId: params.tenantId,
				locationId: params.locationId,
				addedBy: params.addedBy,
				permissions: params.permissions,
				password: params.password,
			},
		});

		if (error) {
			console.error("Edge function invocation error:", error);
			return {
				success: false,
				error: `Failed to invite user: ${error.message}`,
			};
		}

		if (!data?.success) {
			return {
				success: false,
				error: data?.error || "Failed to add user to location",
			};
		}

		// Send appropriate email after successful user creation/update
		try {
			if (data.user_created && data.password) {
				await supabase.functions.invoke("send-user-credentials", {
					body: {
						to: params.email,
						email: params.email,
						password: data.password,
						loginUrl: `${window.location.origin}/auth`,
						organizationName: "CheckingCheckout",
						emailType: "new_user_credentials",
					},
				});
			} else {
				await supabase.functions.invoke("send-user-credentials", {
					body: {
						to: params.email,
						email: params.email,
						loginUrl: `${window.location.origin}/auth`,
						organizationName: "CheckingCheckout",
						emailType: "location_access_granted",
					},
				});
			}
		} catch (emailException) {
			console.error("Exception sending email:", emailException);
		}

		return {
			success: true,
			user_id: data.user_id,
			user_created: data.user_created,
			user_exists: data.user_exists,
			permissions_created: data.permissions_created,
			password: data.password,
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
