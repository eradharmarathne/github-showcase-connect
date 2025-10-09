import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";

type UserPermission = Tables<"user_permissions">;
type Location = Tables<"locations">;

export interface PermissionMatrix {
	userId: string;
	userName: string;
	userEmail: string;
	permissions: Array<{
		locationId: string;
		locationName: string;
		permissions: UserPermission;
	}>;
}

interface UseUserPermissionsReturn {
	permissionMatrix: PermissionMatrix[];
	loading: boolean;
	error: string | null;
	refetch: () => Promise<void>;
	updatePermission: (
		userId: string,
		locationId: string,
		permission: string,
		value: boolean,
	) => Promise<void>;
}

export const useUserPermissions = (): UseUserPermissionsReturn => {
	const [permissionMatrix, setPermissionMatrix] = useState<PermissionMatrix[]>(
		[],
	);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const { tenant } = useAuth();

	const fetchPermissions = useCallback(async () => {
		if (!tenant?.id) return;

		try {
			setLoading(true);
			setError(null);

			// Fetch all user permissions with profile and location data
			const { data: userPermissions, error: permissionsError } = await supabase
				.from("user_permissions")
				.select(`
					*,
					profiles!inner(
						id,
						name,
						email,
						tenant_id
					),
					locations!inner(
						id,
						name,
						is_active
					)
				`)
				.eq("tenant_id", tenant.id)
				.eq("locations.is_active", true);

			if (permissionsError) {
				throw permissionsError;
			}

			// Group permissions by user
			const userMap = new Map<string, PermissionMatrix>();

			userPermissions?.forEach((permission: any) => {
				const profile = permission.profiles;
				const location = permission.locations;
				const userId = profile.id;

				if (!userMap.has(userId)) {
					userMap.set(userId, {
						userId: userId,
						userName: profile.name,
						userEmail: profile.email,
						permissions: [],
					});
				}

				const user = userMap.get(userId)!;
				user.permissions.push({
					locationId: location.id,
					locationName: location.name,
					permissions: permission,
				});
			});

			setPermissionMatrix(Array.from(userMap.values()));
		} catch (error: any) {
			console.error("Error fetching user permissions:", error);
			setError(error.message || "Failed to fetch user permissions");
		} finally {
			setLoading(false);
		}
	}, [tenant?.id]);

	const updatePermission = useCallback(
		async (
			userId: string,
			locationId: string,
			permission: string,
			value: boolean,
		) => {
			try {
				const { error } = await supabase
					.from("user_permissions")
					.update({ [permission]: value })
					.eq("user_id", userId)
					.eq("location_id", locationId)
					.eq("tenant_id", tenant?.id);

				if (error) {
					throw error;
				}

				// Update local state
				setPermissionMatrix((prev) =>
					prev.map((user) => {
						if (user.userId === userId) {
							return {
								...user,
								permissions: user.permissions.map((perm) => {
									if (perm.locationId === locationId) {
										return {
											...perm,
											permissions: {
												...perm.permissions,
												[permission]: value,
											},
										};
									}
									return perm;
								}),
							};
						}
						return user;
					}),
				);
			} catch (error: any) {
				console.error("Error updating permission:", error);
				throw error;
			}
		},
		[tenant?.id],
	);

	useEffect(() => {
		fetchPermissions();
	}, [fetchPermissions]);

	return {
		permissionMatrix,
		loading,
		error,
		refetch: fetchPermissions,
		updatePermission,
	};
};
