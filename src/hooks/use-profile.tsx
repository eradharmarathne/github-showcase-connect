import { useAuth } from "@/context/auth-context";

export const useProfile = () => {
	const { profile, profileLoading, refreshProfile } = useAuth();

	return {
		profile,
		loading: profileLoading,
		refetch: refreshProfile,
	};
};
