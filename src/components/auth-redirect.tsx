import { Navigate } from "react-router";
import { useAuth } from "@/context/AuthContext";

export const AuthRedirect = () => {
	const { user, loading } = useAuth();

	if (loading) {
		return null;
	}

	// If user is authenticated, redirect to smart redirect for proper routing
	if (user) {
		return <Navigate to="/smart-redirect" replace />;
	}

	// If user is not authenticated, redirect to auth page
	return <Navigate to="/auth" replace />;
};
