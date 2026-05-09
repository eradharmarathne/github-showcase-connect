import { Navigate } from "react-router";
import { AnimatedLoadingScreen } from "@/components/common";
import { useAuth } from "@/context/auth-context";
import { useLocationContext } from "@/context/location-context";
import { useInvitations } from "@/hooks/use-invitations";
import { usePermissions } from "@/hooks/use-permissions";
import { logger } from "@/lib/logger";

export const SmartRedirect = () => {
	const { tenant, tenantLoading, profile, profileLoading, user } = useAuth();
	const { hasAnyPermission, loading } = usePermissions();
	const { loading: locationsLoading } = useLocationContext();
	const { hasInvitations, loading: invitationsLoading } = useInvitations();

	logger.debug("SmartRedirect rendering", {
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
		logger.debug("Still loading, waiting...");
		return (
			<AnimatedLoadingScreen
				message="Preparing your workspace..."
				showLogo={true}
			/>
		);
	}

	logger.debug("All data loaded", {
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
			logger.debug(
				"No tenant_id but has invitations - redirecting to /pending-invitation",
			);
			return <Navigate to="/pending-invitation" replace />;
		}

		logger.debug(
			"No tenant_id and no invitations - redirecting to /onboarding",
		);
		return <Navigate to="/onboarding" replace />;
	}

	// Only redirect the tenant OWNER to onboarding for incomplete setup.
	// Invited staff should not be blocked by tenant onboarding/subscription status.
	const isOwner = profile?.id === tenant.owner_profile_id;

	if (!tenant.onboarding_completed && isOwner) {
		logger.debug(
			"Tenant onboarding not completed (owner) - redirecting to /onboarding",
		);
		return <Navigate to="/onboarding" replace />;
	}

	const invalidSubscriptionStatuses = [
		"incomplete",
		"pending_payment",
		"payment_failed",
		"expired",
	];
	if (
		isOwner &&
		tenant.subscription_status &&
		invalidSubscriptionStatuses.includes(tenant.subscription_status)
	) {
		logger.debug(
			`Tenant has invalid subscription status: ${tenant.subscription_status} (owner) - redirecting to /onboarding`,
		);
		return <Navigate to="/onboarding" replace />;
	}

	logger.debug("Tenant valid, checking permissions...");

	// Redirect to the first page the user has access to
	if (hasAnyPermission(["access_dashboard"])) {
		logger.debug("Redirecting to /dashboard");
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
