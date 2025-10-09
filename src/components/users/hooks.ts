import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/context/auth-context";
import { useLocationContext } from "@/context/location-context";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "./types";

// Hook for fetching all users with detailed information
export function useUsers() {
	const [users, setUsers] = useState<User[]>([]);
	const [loading, setLoading] = useState(true);
	const { tenant } = useAuth();
	const { selectedLocation } = useLocationContext();

	const fetchUsers = useCallback(async () => {
		if (!tenant?.id) {
			setLoading(false);
			return;
		}

		try {
			setLoading(true);

			// Fetch users with enhanced profile information
			const { data: tenantPermissions, error: permissionsError } =
				await supabase
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
						last_sign_in_at,
						phone,
						avatar_url
					),
					locations!inner(id, name, is_active)
				`)
					.eq("tenant_id", tenant.id)
					.eq("locations.is_active", true);

			if (permissionsError) throw permissionsError;

			// Group permissions by user and calculate additional metrics
			const userPermissionsMap = new Map<string, any>();

			(tenantPermissions || []).forEach((perm: any) => {
				const userId = perm.user_id;
				const profile = perm.profiles;
				const location = perm.locations;

				// If a specific location is selected, only show users with access to that location
				if (location.id !== selectedLocation) {
					return;
				}

				if (!userPermissionsMap.has(userId)) {
					userPermissionsMap.set(userId, {
						...profile,
						permissions: {},
						is_tenant_admin: profile.is_tenant_admin || false,
						tenant_role: perm.tenant_role,
						is_active: true,
						location_count: 0,
						total_permissions: 0,
					});
				}

				const userRecord = userPermissionsMap.get(userId);
				userRecord.location_count += 1;

				// Count active permissions
				const permissionCount = [
					perm.access_dashboard,
					perm.access_income,
					perm.access_expenses,
					perm.access_reports,
					perm.access_calendar,
					perm.access_bookings,
					perm.access_rooms,
					perm.access_master_files,
					perm.access_accounts,
					perm.access_users,
					perm.access_settings,
					perm.access_booking_channels,
				].filter(Boolean).length;

				userRecord.total_permissions = Math.max(
					userRecord.total_permissions,
					permissionCount,
				);

				userRecord.permissions[location.name] = {
					dashboard: perm.access_dashboard || false,
					income: perm.access_income || false,
					expenses: perm.access_expenses || false,
					reports: perm.access_reports || false,
					calendar: perm.access_calendar || false,
					bookings: perm.access_bookings || false,
					rooms: perm.access_rooms || false,
					master_files: perm.access_master_files || false,
					accounts: perm.access_accounts || false,
					users: perm.access_users || false,
					settings: perm.access_settings || false,
					booking_channels: perm.access_booking_channels || false,
				};
			});

			const usersWithPermissions = Array.from(userPermissionsMap.values());
			setUsers(usersWithPermissions);
		} catch (error: any) {
			console.error("Error fetching users:", error);
			toast({
				title: "Error",
				description: error.message || "Failed to fetch users",
				variant: "destructive",
			});
		} finally {
			setLoading(false);
		}
	}, [tenant?.id, selectedLocation]);

	const refreshUsers = useCallback(() => {
		fetchUsers();
	}, [fetchUsers]);

	const deleteUser = useCallback(
		async (userId: string) => {
			if (!tenant?.id) return false;

			if (
				!confirm(
					"Are you sure you want to remove this user's access? This action cannot be undone.",
				)
			) {
				return false;
			}

			try {
				const { error } = await supabase
					.from("user_permissions")
					.delete()
					.eq("user_id", userId)
					.eq("tenant_id", tenant.id);

				if (error) throw error;

				await refreshUsers();
				toast({
					title: "User Removed",
					description: "User access has been removed successfully.",
				});
				return true;
			} catch (error: any) {
				console.error("Error removing user:", error);
				toast({
					title: "Error",
					description: error.message || "Failed to remove user",
					variant: "destructive",
				});
				return false;
			}
		},
		[tenant?.id, refreshUsers],
	);

	useEffect(() => {
		fetchUsers();
	}, [fetchUsers]);

	return { users, loading, refreshUsers, deleteUser };
}

// Hook for user statistics
export function useUserStats() {
	const { users, loading } = useUsers();

	const stats = {
		totalUsers: users.length,
		totalAdmins: users.filter((u) => u.is_tenant_admin).length,
		totalRegularUsers: users.filter((u) => !u.is_tenant_admin).length,
		activeUsers: users.filter((u) => u.is_active).length,
		recentUsers: users.filter((u) => {
			if (!u.created_at) return false;
			const createdDate = new Date(u.created_at);
			const sevenDaysAgo = new Date();
			sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
			return createdDate > sevenDaysAgo;
		}).length,
		averagePermissions:
			users.length > 0
				? Math.round(
						users.reduce(
							(sum, user) => sum + (user.total_permissions || 0),
							0,
						) / users.length,
					)
				: 0,
	};

	return { stats, loading };
}

// Hook for user activity data
export function useUserActivity() {
	const [activityData, setActivityData] = useState<any[]>([]);
	const [loading, setLoading] = useState(false);
	const { tenant } = useAuth();

	const fetchUserActivity = useCallback(async () => {
		if (!tenant?.id) return;

		try {
			setLoading(true);
			// This would typically fetch from an audit log or activity table
			// For now, we'll use mock data based on user creation dates
			const { data: profiles, error } = await supabase
				.from("profiles")
				.select("id, name, created_at, last_sign_in_at")
				.eq("tenant_id", tenant.id)
				.order("last_sign_in_at", { ascending: false, nullsFirst: false });

			if (error) throw error;

			setActivityData(profiles || []);
		} catch (error: any) {
			console.error("Error fetching user activity:", error);
		} finally {
			setLoading(false);
		}
	}, [tenant?.id]);

	useEffect(() => {
		fetchUserActivity();
	}, [fetchUserActivity]);

	return { activityData, loading, refreshActivity: fetchUserActivity };
}

// Hook for role-based user filtering
export function useUserFilters() {
	const { users } = useUsers();
	const [filters, setFilters] = useState({
		role: "all", // all, admin, user
		status: "all", // all, active, inactive
		location: "all", // all, specific location
		search: "",
	});

	const filteredUsers = users.filter((user) => {
		// Role filter
		if (filters.role === "admin" && !user.is_tenant_admin) return false;
		if (filters.role === "user" && user.is_tenant_admin) return false;

		// Status filter
		if (filters.status === "active" && !user.is_active) return false;
		if (filters.status === "inactive" && user.is_active) return false;

		// Search filter
		if (filters.search) {
			const searchLower = filters.search.toLowerCase();
			const matchesName = user.name.toLowerCase().includes(searchLower);
			const matchesEmail = user.email.toLowerCase().includes(searchLower);
			if (!matchesName && !matchesEmail) return false;
		}

		return true;
	});

	return { filteredUsers, filters, setFilters };
}
