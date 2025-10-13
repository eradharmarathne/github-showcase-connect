import { useEffect, useState } from "react";
import { useAuth } from "@/context/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";

type UserPermissions = Tables<"user_permissions">;

export const usePermissions = () => {
	const { user, profile, tenant } = useAuth();
	const [permissions, setPermissions] = useState<UserPermissions | null>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		const fetchPermissions = async () => {
			// If no user or no tenant_id, set loading to false immediately
			if (!user || !profile?.tenant_id) {
				console.log("⚠️ [PERMISSIONS] No user or tenant_id, skipping permissions fetch");
				setPermissions(null);
				setLoading(false);
				return;
			}

			try {
				setLoading(true);
				console.log("🔍 [PERMISSIONS] Fetching permissions for user:", user.id);
				const { data, error } = await supabase
					.from("user_permissions")
					.select("*")
					.eq("user_id", user.id)
					.eq("tenant_id", profile.tenant_id)
					.single();

				if (error && error.code !== "PGRST116") {
					// PGRST116 = no rows returned
					console.error("❌ [PERMISSIONS] Error fetching permissions:", error);
					setPermissions(null);
				} else {
					console.log("✅ [PERMISSIONS] Permissions fetched:", data);
					setPermissions(data || null);
				}
			} catch (error) {
				console.error("❌ [PERMISSIONS] Exception fetching permissions:", error);
				setPermissions(null);
			} finally {
				setLoading(false);
			}
		};

		fetchPermissions();
	}, [user, profile, tenant?.owner_profile_id]); // Check if user is tenant owner (highest level access)
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
