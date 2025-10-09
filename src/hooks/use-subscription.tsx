import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/context/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";

type Subscription = Tables<"subscriptions">;

export const useSubscription = () => {
	const { tenant, user } = useAuth();

	return useQuery({
		queryKey: ["subscription", tenant?.id],
		queryFn: async (): Promise<Subscription | null> => {
			if (!tenant?.id || !user) {
				return null;
			}

			try {
				// Try to fetch subscription with better error handling
				const { data, error } = await supabase
					.from("subscriptions")
					.select("*")
					.eq("tenant_id", tenant.id)
					.in("status", ["active", "trialing"])
					.order("created_at", { ascending: false })
					.maybeSingle(); // Use maybeSingle to handle no results gracefully

				if (error) {
					// Log the error but don't throw for expected cases
					console.warn("Subscription query error:", error);

					// 406 errors are expected when RLS policies block access
					// This can happen when user doesn't have proper permissions
					if (
						error.message?.includes("406") ||
						error.message?.includes("Not Acceptable")
					) {
						console.info(
							"No subscription access - this may be expected for this user",
						);
						return null;
					}

					// For other errors, we might want to throw
					throw error;
				}

				return data;
			} catch (error) {
				console.error("Exception in subscription fetch:", error);
				throw error;
			}
		},
		enabled: !!tenant?.id && !!user,
		retry: (failureCount, error: any) => {
			// Don't retry on 406 errors - they're permissions related
			if (
				error?.message?.includes("406") ||
				error?.message?.includes("Not Acceptable")
			) {
				return false;
			}
			// Retry other errors up to 2 times
			return failureCount < 2;
		},
		retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
		staleTime: 5 * 60 * 1000, // 5 minutes
		gcTime: 10 * 60 * 1000, // 10 minutes
	});
};

export default useSubscription;
