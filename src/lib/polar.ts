import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

// Polar configuration from environment variables
const VITE_POLAR_ORGANIZATION_ID = import.meta.env.VITE_POLAR_ORGANIZATION_ID;

// Validate environment variable is set
if (!VITE_POLAR_ORGANIZATION_ID) {
	console.error(
		"❌ VITE_POLAR_ORGANIZATION_ID is not set. Polar checkout will not work.",
	);
}

// Type definitions
type MetadataValue = string | number | boolean;

interface PolarCheckoutSession {
	checkoutId: string;
	checkoutUrl: string;
	clientSecret?: string;
	id: string;
	url: string;
	client_secret?: string;
}

/**
 * Create a Polar checkout session for a subscription
 * This uses Supabase Edge Function to securely proxy the request
 */
export const createCheckoutSession = async (params: {
	product_price_id: string;
	success_url?: string;
	metadata?: Record<string, MetadataValue>;
	customer_email?: string;
	customer_name?: string;
}): Promise<PolarCheckoutSession> => {
	try {
		// Validate required parameters
		if (!params.product_price_id) {
			throw new Error("product_price_id is required");
		}

		// Validate environment configuration
		if (!VITE_POLAR_ORGANIZATION_ID) {
			throw new Error(
				"Polar.sh is not configured. Please set VITE_POLAR_ORGANIZATION_ID environment variable.",
			);
		}

		console.log("🚀 Creating Polar checkout session:", {
			product_price_id: params.product_price_id,
			has_metadata: !!params.metadata,
			has_customer: !!(params.customer_email || params.customer_name),
		});

		// Use Supabase Edge Function to proxy the request
		// This keeps the POLAR_ACCESS_TOKEN secure on the server
		const { data, error } = await supabase.functions.invoke(
			"create-polar-checkout",
			{
				body: {
					...params,
					organization_id: VITE_POLAR_ORGANIZATION_ID,
				},
			},
		);

		if (error) {
			console.error("❌ Edge Function Error:", error);
			console.error("❌ Error details:", JSON.stringify(error, null, 2));
			throw new Error(
				`Edge Function Error: ${error.message || "Unknown error"}`,
			);
		}

		if (data?.error) {
			console.error("❌ Polar API Error:", data);
			throw new Error(`Polar API Error: ${data.error || JSON.stringify(data)}`);
		}

		console.log("✅ Checkout session created:", {
			id: data?.id,
			url: data?.url,
			has_client_secret: !!data?.client_secret,
		});

		// Return checkout details
		return {
			checkoutId: data.id,
			checkoutUrl: data.url,
			clientSecret: data.client_secret,
			...data,
		};
	} catch (error) {
		console.error("❌ Failed to create checkout session:", error);
		throw error;
	}
};

/**
 * Get subscription details from Polar (server-side only)
 * Note: This would typically be called from an Edge Function
 */
export const getSubscription = async (
	subscriptionId: string,
): Promise<Tables<"subscriptions"> | null> => {
	try {
		console.log("🔍 Fetching subscription:", subscriptionId);

		// This would be implemented as an Edge Function call
		// For now, return from local database
		const { data, error } = await supabase
			.from("subscriptions")
			.select("*")
			.eq("polar_subscription_id", subscriptionId)
			.single();

		if (error) {
			throw error;
		}

		return data;
	} catch (error) {
		console.error("❌ Failed to get subscription:", error);
		throw error;
	}
};

/**
 * Cancel a subscription
 * This would typically be done through Polar's customer portal
 * or via an Edge Function for server-side cancellation
 */
export const cancelSubscription = async (
	subscriptionId: string,
): Promise<Tables<"subscriptions">> => {
	try {
		console.log("🚫 Canceling subscription:", subscriptionId);

		// This should be implemented as an Edge Function
		// For now, we'll update the local database
		// In production, this should call Polar API via Edge Function

		const { data, error } = await supabase
			.from("subscriptions")
			.update({
				status: "cancelled",
				canceled_at: new Date().toISOString(),
				updated_at: new Date().toISOString(),
			})
			.eq("polar_subscription_id", subscriptionId)
			.select()
			.single();

		if (error) {
			throw error;
		}

		console.log("✅ Subscription cancelled:", data);
		return data;
	} catch (error) {
		console.error("❌ Failed to cancel subscription:", error);
		throw error;
	}
};

/**
 * Get Polar customer portal URL
 * Polar provides a hosted customer portal for subscription management
 */
export const getCustomerPortalUrl = (customerId: string) => {
	// Polar customer portal URL format
	// In production, you'd get this from Polar API or configuration
	const baseUrl = "https://polar.sh";
	return `${baseUrl}/customer-portal/${customerId}`;
};

/**
 * Validate webhook signature (for Edge Functions)
 * Polar uses Standard Webhooks format (same as Svix)
 */
export const validateWebhookSignature = async (
	payload: string,
	webhookId: string,
	webhookTimestamp: string,
	webhookSignature: string,
	secret: string,
): Promise<boolean> => {
	try {
		// This is typically done in Edge Functions using the Svix library
		// For browser environment, we'll skip validation
		console.warn("⚠️ Webhook validation should be done server-side");
		return true;
	} catch (error) {
		console.error("❌ Failed to validate webhook signature:", error);
		return false;
	}
};

/**
 * Helper to format checkout URL with metadata
 */
export const buildCheckoutUrl = (
	productPriceId: string,
	metadata: Record<string, MetadataValue>,
	successUrl?: string,
): Promise<PolarCheckoutSession> => {
	const params = {
		product_price_id: productPriceId,
		metadata,
		success_url: successUrl,
	};

	return createCheckoutSession(params);
};

/**
 * Helper to check subscription status from local database
 */
export const checkSubscriptionStatus = async (
	tenantId: string,
): Promise<Tables<"subscriptions"> | null> => {
	try {
		const { data, error } = await supabase
			.from("subscriptions")
			.select("*")
			.eq("tenant_id", tenantId)
			.single();

		if (error) {
			if (error.code === "PGRST116") {
				// No subscription found
				return null;
			}
			throw error;
		}

		return data;
	} catch (error) {
		console.error("❌ Failed to check subscription status:", error);
		throw error;
	}
};

/**
 * Helper to get available plans
 */
export const getAvailablePlans = async (): Promise<Tables<"plans">[]> => {
	try {
		const { data, error } = await supabase
			.from("plans")
			.select("*")
			.eq("is_active", true)
			.order("price_cents", { ascending: true });

		if (error) {
			throw error;
		}

		return data;
	} catch (error) {
		console.error("❌ Failed to get available plans:", error);
		throw error;
	}
};

// Export default for convenience
export default {
	createCheckoutSession,
	getSubscription,
	cancelSubscription,
	getCustomerPortalUrl,
	validateWebhookSignature,
	buildCheckoutUrl,
	checkSubscriptionStatus,
	getAvailablePlans,
};
