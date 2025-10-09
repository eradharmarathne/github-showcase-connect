import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useLocationContext } from "@/context/LocationContext";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";

type Profile = Tables<"profiles">;
type UserPermission = Tables<"user_permissions">;
type Location = Tables<"locations">;

export interface UserPermissions {
	[key: string]: boolean;
}

export interface User extends Profile {
	last_sign_in_at?: string | null;
	avatar_url?: string | null;
	permissions: {
		[locationName: string]: UserPermissions;
	};
	location_count?: number;
	total_permissions?: number;
}

interface UseUsersDataReturn {
	users: User[];
	loading: boolean;
	error: string | null;
	refetch: () => Promise<void>;
	deleteUser: (userId: string) => Promise<void>;
}

export const useUsersData = (): UseUsersDataReturn => {
	const [users, setUsers] = useState<User[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const { tenant } = useAuth();
	const { locations } = useLocationContext();

	const fetchUsers = useCallback(async () => {
		if (!tenant?.id) return;

		try {
			setLoading(true);
			setError(null);

			// Fetch users with their permissions and location data
			const { data: userPermissions, error: usersError } = await supabase
				.from("user_permissions")
				.select(`
					user_id,
					location_id,
					access_dashboard,
					access_income,
					access_expenses,
					access_reports,
					access_calendar,
					access_bookings,
					access_rooms,
					access_master_files,
					access_accounts,
					access_users,
					access_settings,
					access_booking_channels,
					tenant_role,
					profiles!inner(
						id,
						name,
						email,
						tenant_id,
						is_tenant_admin,
						created_at,
						phone,
						avatar_url,
						last_sign_in_at
					),
					locations!inner(
						id,
						name,
						is_active
					)
				`)
				.eq("tenant_id", tenant.id)
				.eq("locations.is_active", true);

			if (usersError) {
				throw usersError;
			}

			// Group permissions by user
			const userMap = new Map<string, User>();

			userPermissions?.forEach((permission: any) => {
				const profile = permission.profiles;
				const location = permission.locations;
				const userId = profile.id;

				if (!userMap.has(userId)) {
					userMap.set(userId, {
						...profile,
						permissions: {},
						location_count: 0,
						total_permissions: 0,
					});
				}

				const user = userMap.get(userId)!;

				// Add permissions for this location
				const permissionKeys = [
					"access_dashboard",
					"access_income",
					"access_expenses",
					"access_reports",
					"access_calendar",
					"access_bookings",
					"access_rooms",
					"access_master_files",
					"access_accounts",
					"access_users",
					"access_settings",
					"access_booking_channels",
				];

				const locationPermissions: UserPermissions = {};
				permissionKeys.forEach((key) => {
					locationPermissions[key] = permission[key] || false;
				});

				user.permissions[location.name] = locationPermissions;

				// Count active permissions
				const activePermissions = permissionKeys.filter(
					(key) => permission[key],
				).length;
				user.total_permissions =
					(user.total_permissions || 0) + activePermissions;
			});

			// Convert map to array and calculate location counts
			const usersArray = Array.from(userMap.values()).map((user) => ({
				...user,
				location_count: Object.keys(user.permissions).length,
			}));

			setUsers(usersArray);
		} catch (error: any) {
			console.error("Error fetching users:", error);
			setError(error.message || "Failed to fetch users");
		} finally {
			setLoading(false);
		}
	}, [tenant?.id]);

	const deleteUser = useCallback(
		async (userId: string) => {
			if (!tenant?.id) return;

			try {
				// Delete user permissions first
				const { error: permissionsError } = await supabase
					.from("user_permissions")
					.delete()
					.eq("user_id", userId)
					.eq("tenant_id", tenant.id);

				if (permissionsError) {
					throw permissionsError;
				}

				// Delete user profile
				const { error: profileError } = await supabase
					.from("profiles")
					.delete()
					.eq("id", userId)
					.eq("tenant_id", tenant.id);

				if (profileError) {
					throw profileError;
				}

				// Refresh users list
				await fetchUsers();
			} catch (error: any) {
				console.error("Error deleting user:", error);
				throw error;
			}
		},
		[tenant?.id, fetchUsers],
	);

	useEffect(() => {
		fetchUsers();
	}, [fetchUsers]);

	return {
		users,
		loading,
		error,
		refetch: fetchUsers,
		deleteUser,
	};
};
