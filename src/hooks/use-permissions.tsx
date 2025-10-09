import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";

type UserPermissions = Tables<"user_permissions">;

export const usePermissions = () => {
	const { user, profile, tenant } = useAuth();
	const [permissions, setPermissions] = useState<UserPermissions | null>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		const fetchPermissions = async () => {
			if (!user || !profile?.tenant_id) {
				setPermissions(null);
				setLoading(false);
				return;
			}

			try {
				// Fetch user permissions with explicit tenant_id filter for RLS performance
				const { data, error } = await supabase
					.from("user_permissions")
					.select("*")
					.eq("user_id", user.id)
					.eq("tenant_id", profile.tenant_id) // Explicit filter helps optimizer
					.single();

				if (error && error.code !== "PGRST116") {
					// PGRST116 = no rows returned
					console.error("Error fetching permissions:", error);
					setPermissions(null);
				} else {
					setPermissions(data || null);
				}
			} catch (error) {
				console.error("Exception fetching permissions:", error);
				setPermissions(null);
			} finally {
				setLoading(false);
			}
		};

		fetchPermissions();
	}, [user, profile?.tenant_id]);

	// Check if user is tenant owner (highest level access)
	const isTenantOwner = profile?.id === tenant?.owner_profile_id;

	const hasPermission = (
		permission: keyof Omit<
			UserPermissions,
			"id" | "user_id" | "tenant_id" | "created_at"
		>,
	): boolean => {
		// Tenant owner always has all permissions
		if (isTenantOwner) return true;

		// If no permissions record, no access
		if (!permissions) return false;

		return Boolean(permissions[permission]);
	};

	const hasAnyPermission = (
		permissionList:
			| Array<
					keyof Omit<
						UserPermissions,
						"id" | "user_id" | "tenant_id" | "created_at"
					>
			  >
			| keyof Omit<
					UserPermissions,
					"id" | "user_id" | "tenant_id" | "created_at"
			  >,
	): boolean => {
		// Handle single permission string
		if (typeof permissionList === "string") {
			return hasPermission(permissionList);
		}
		// Handle array of permissions
		return (
			Array.isArray(permissionList) &&
			permissionList.some((permission) => hasPermission(permission))
		);
	};

	const refetch = async () => {
		if (!user || !profile?.tenant_id) return;

		try {
			setLoading(true);
			const { data, error } = await supabase
				.from("user_permissions")
				.select("*")
				.eq("user_id", user.id)
				.eq("tenant_id", profile.tenant_id)
				.single();

			if (error && error.code !== "PGRST116") {
				console.error("Error fetching permissions:", error);
				setPermissions(null);
			} else {
				setPermissions(data || null);
			}
		} catch (error) {
			console.error("Exception fetching permissions:", error);
			setPermissions(null);
		} finally {
			setLoading(false);
		}
	};

	return {
		permissions,
		loading,
		hasPermission,
		hasAnyPermission,
		isTenantOwner,
		refetch,
	};
};
