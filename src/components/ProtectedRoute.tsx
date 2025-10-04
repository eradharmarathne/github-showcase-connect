import { Navigate, useLocation } from "react-router";
import { useAuth } from "@/context/AuthContext";

interface ProtectedRouteProps {
	children: React.ReactNode;
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
	const { user, loading } = useAuth();
	const location = useLocation();

	if (loading) {
		return null;
	}

	if (!user) {
		return <Navigate to="/" state={{ from: location }} replace />;
	}

	return <>{children}</>;
};
