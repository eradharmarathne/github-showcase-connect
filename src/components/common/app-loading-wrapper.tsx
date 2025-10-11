import { ReactNode } from "react";
import { AnimatedLoadingScreen } from "@/components/common";
import { useAuth } from "@/context/auth-context";

interface AppLoadingWrapperProps {
	children: ReactNode;
}

export function AppLoadingWrapper({ children }: AppLoadingWrapperProps) {
	const { loading, profileLoading, tenantLoading } = useAuth();

	// Show loading screen for initial auth loading or critical data loading
	const isLoading = loading || (profileLoading && tenantLoading);

	if (isLoading) {
		return (
			<AnimatedLoadingScreen message="Loading..." showLogo={true} />
		);
	}

	return <>{children}</>;
}
