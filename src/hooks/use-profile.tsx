import { useAuth } from "@/context/AuthContext";

export const useProfile = () => {
	const { profile, profileLoading, refreshProfile } = useAuth();

	return {
		profile,
		loading: profileLoading,
		refetch: refreshProfile,
	};
};
