import { Navigate } from "react-router";
import { useAuth } from "@/context/auth-context";
import { useLocationContext } from "@/context/location-context";
import { useInvitations } from "@/hooks/use-invitations";
import { usePermissions } from "@/hooks/use-permissions";

export const SmartRedirect = () => {
	const { tenant, tenantLoading, profile, profileLoading, user } = useAuth();
	const { hasAnyPermission, loading } = usePermissions();
	const { loading: locationsLoading } = useLocationContext();
	const { hasInvitations, loading: invitationsLoading } = useInvitations();

	console.log("🔀 [REDIRECT] SmartRedirect rendering:", {
		loading,
		locationsLoading,
		tenantLoading,
		profileLoading,
		invitationsLoading,
		hasUser: !!user,
		hasProfile: !!profile,
		hasTenant: !!tenant,
		hasInvitations,
	});

	// Wait for all loading states to complete
	// Also wait for profile to be fully loaded when user exists
	if (
		loading ||
		locationsLoading ||
		tenantLoading ||
		profileLoading ||
		invitationsLoading ||
		(user && !profile)
	) {
		console.log("⏳ [REDIRECT] Still loading, waiting...");
		return null;
	}

	console.log("📊 [REDIRECT] All data loaded:", {
		profile: profile
			? {
					id: profile.id,
					email: profile.email,
					tenant_id: profile.tenant_id,
					tenant_role: profile.tenant_role,
				}
			: null,
		tenant: tenant
			? {
					id: tenant.id,
					name: tenant.name,
					onboarding_completed: tenant.onboarding_completed,
				}
			: null,
		user: user ? { id: user.id, email: user.email } : null,
		hasInvitations,
	});

	// If user doesn't have a tenant_id in their profile, check for pending invitations
	if (!profile?.tenant_id || !tenant) {
		if (hasInvitations) {
			console.log("🎫 [REDIRECT] No tenant_id but has invitations - redirecting to /pending-invitation");
			return <Navigate to="/pending-invitation" replace />;
		}

		console.log("🚀 [REDIRECT] No tenant_id and no invitations - redirecting to /onboarding");
		return <Navigate to="/onboarding" replace />;
	}

	// If tenant hasn't completed onboarding, redirect to onboarding
	if (!tenant.onboarding_completed) {
		console.log("🚨 [REDIRECT] Tenant onboarding not completed - redirecting to /onboarding");
		return <Navigate to="/onboarding" replace />;
	}

	console.log("✅ [REDIRECT] Tenant valid, checking permissions...");

	// Redirect to the first page the user has access to
	if (hasAnyPermission(["access_dashboard"])) {
		console.log("➡️ [REDIRECT] Redirecting to /dashboard");
		return <Navigate to="/dashboard" replace />;
	} else if (hasAnyPermission(["access_calendar"])) {
		return <Navigate to="/calendar" replace />;
	} else if (hasAnyPermission(["access_bookings"])) {
		return <Navigate to="/reservations" replace />;
	} else if (hasAnyPermission(["access_expenses"])) {
		return <Navigate to="/expense" replace />;
	} else if (hasAnyPermission(["access_reports"])) {
		return <Navigate to="/reports" replace />;
	} else if (hasAnyPermission(["access_accounts"])) {
		return <Navigate to="/accounts" replace />;
	} else if (hasAnyPermission(["access_master_files"])) {
		return <Navigate to="/master-files" replace />;
	} else if (hasAnyPermission(["access_booking_channels"])) {
		return <Navigate to="/booking-channels" replace />;
	} else if (hasAnyPermission(["access_rooms"])) {
		return <Navigate to="/rooms" replace />;
	} else if (hasAnyPermission(["access_users"])) {
		return <Navigate to="/users" replace />;
	} else if (hasAnyPermission(["access_settings"])) {
		return <Navigate to="/settings" replace />;
	} else {
		// User has no permissions - show access denied
		return <Navigate to="/access-denied" replace />;
	}
};
