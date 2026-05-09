import { AlertTriangle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { usePermissions } from "@/hooks/use-permissions";
import { Tables } from "@/integrations/supabase/types";
import { RouteLoadingState } from "./route-loading-state";

type UserPermissions = Tables<"user_permissions">;
type PermissionKey = keyof Omit<
	UserPermissions,
	"id" | "user_id" | "tenant_id" | "created_at"
>;

interface PermissionRouteProps {
	children: React.ReactNode;
	permission: PermissionKey[];
	fallbackPath?: string;
}

export const PermissionRoute = ({
	children,
	permission,
}: PermissionRouteProps) => {
	const { hasAnyPermission, loading } = usePermissions();

	if (loading) {
		return <RouteLoadingState message="Checking page access..." />;
	}

	if (!hasAnyPermission(permission)) {
		// Show access denied message instead of redirecting for better UX
		return (
			<div className="flex items-center justify-center min-h-[400px] p-4">
				<Alert className="max-w-md">
					<AlertTriangle className="size-4" />
					<AlertDescription className="text-center">
						You don't have permission to access this page. Please contact your
						administrator if you believe this is an error.
					</AlertDescription>
				</Alert>
			</div>
		);
	}

	return <>{children}</>;
};
