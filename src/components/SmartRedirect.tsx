import { Navigate } from "react-router";
import { useAuth } from "@/context/AuthContext";
import { useLocationContext } from "@/context/LocationContext";
import { usePermissions } from "@/hooks/usePermissions";

export const SmartRedirect = () => {
	const { tenant, tenantLoading, profile } = useAuth();
	const { hasAnyPermission, loading } = usePermissions();
	const { locations, loading: locationsLoading } = useLocationContext();

	// Wait for all loading states to complete
	if (loading || locationsLoading || tenantLoading) {
		return null;
	}

	// If user doesn't have a tenant_id in their profile, they need to complete onboarding
	if (!profile?.tenant_id || !tenant) {
		return <Navigate to="/onboarding" replace />;
	}

	// If tenant hasn't completed onboarding, redirect to onboarding
	if (!tenant.onboarding_completed) {
		return <Navigate to="/onboarding" replace />;
	}

	// If user has no locations after onboarding, this should not happen but fallback to onboarding
	if (locations.length === 0) {
		return <Navigate to="/onboarding" replace />;
	}

	// Redirect to the first page the user has access to
	if (hasAnyPermission(["access_dashboard"])) {
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
