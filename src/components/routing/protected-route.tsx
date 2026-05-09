import { Navigate, useLocation } from "react-router";
import { useAuth } from "@/context/auth-context";
import { RouteLoadingState } from "./route-loading-state";

interface ProtectedRouteProps {
	children: React.ReactNode;
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
	const { user, loading } = useAuth();
	const location = useLocation();

	if (loading) {
		return <RouteLoadingState message="Checking your session..." />;
	}

	if (!user) {
		return <Navigate to="/" state={{ from: location }} replace />;
	}

	return <>{children}</>;
};
