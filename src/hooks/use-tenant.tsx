import { useAuth } from "@/context/AuthContext";

export const useTenant = () => {
	const {
		tenant,
		subscription,
		tenantLoading,
		refreshTenant,
		hasActiveTrial,
		hasActiveSubscription,
		isOwner,
	} = useAuth();

	const canAccessFeature = (feature: string) => {
		// If no tenant, no access
		if (!tenant) return false;

		// Always allow access during trial
		if (hasActiveTrial) return true;

		// Check subscription features based on plan
		if (hasActiveSubscription && subscription) {
			// For now, allow all features for active subscriptions
			// This can be extended based on plan limitations
			return true;
		}

		// No access without trial or subscription
		return false;
	};

	const isTrialExpired = tenant?.trial_ends_at
		? new Date(tenant.trial_ends_at) <= new Date()
		: false;

	const trialDaysLeft = tenant?.trial_ends_at
		? Math.max(
				0,
				Math.ceil(
					(new Date(tenant.trial_ends_at).getTime() - new Date().getTime()) /
						(1000 * 60 * 60 * 24),
				),
			)
		: 0;

	const needsSubscription = !hasActiveTrial && !hasActiveSubscription;

	return {
		tenant,
		subscription,
		loading: tenantLoading,
		refetch: refreshTenant,
		hasActiveTrial,
		hasActiveSubscription,
		isOwner,
		canAccessFeature,
		isTrialExpired,
		trialDaysLeft,
		needsSubscription,
	};
};
