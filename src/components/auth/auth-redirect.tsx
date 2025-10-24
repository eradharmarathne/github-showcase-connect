import { Navigate } from "react-router";
import { useAuth } from "@/context/auth-context";

export const AuthRedirect = () => {
	const { user, loading } = useAuth();

	console.log("🔀 [AUTH-REDIRECT] Component rendering:", {
		loading,
		hasUser: !!user,
		userEmail: user?.email,
	});

	if (loading) {
		console.log("⏳ [AUTH-REDIRECT] Still loading...");
		return null;
	}

	// If user is authenticated, redirect to smart redirect for proper routing
	if (user) {
		console.log(
			"➡️ [AUTH-REDIRECT] User authenticated, redirecting to /smart-redirect",
		);
		return <Navigate to="/smart-redirect" replace />;
	}

	// If user is not authenticated, redirect to auth page
	console.log("➡️ [AUTH-REDIRECT] No user, redirecting to /auth");
	return <Navigate to="/auth" replace />;
};
