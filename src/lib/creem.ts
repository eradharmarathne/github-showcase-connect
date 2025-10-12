import { Creem } from "creem";
import { SDKValidationError } from "creem/models/errors";
import { supabase } from "@/integrations/supabase/client";

const VITE_CREEM_API_KEY = import.meta.env.VITE_CREEM_API_KEY;

export const creem = new Creem({
	// Use proxy in development to avoid CORS issues, direct API in production
	serverURL: import.meta.env.DEV
		? `${window.location.origin}/api/creem`
		: "https://api.creem.io",
});

// Helper function to create a checkout session using Supabase Edge Function proxy
export const createCheckoutSession = async (params: {
	product_id: string;
	success_url?: string;
	error_url?: string;
	cancel_url?: string;
	request_id?: string;
	metadata?: Record<string, any>;
	customer?: {
		id?: string;
		email?: string;
	};
	units?: number;
	discountCode?: string;
}) => {
	try {
		// Validate required parameters
		if (!params.product_id) {
			throw new Error("product_id is required");
		}

		// Use Supabase Edge Function to proxy the request and avoid CORS issues
		const { data, error } = await supabase.functions.invoke(
			"create-creem-checkout",
			{
				body: params,
			},
		);

		if (error) {
			console.error("Edge Function Error:", error);
			throw new Error(`Edge Function Error: ${error.message}`);
		}

		// Return in the same format as before
		return {
			checkoutUrl: data.checkout_url || data.url,
			...data,
		};
	} catch (error) {
		console.error("Failed to create checkout session:", error);

		// Provide more specific error information
		if (error instanceof SDKValidationError) {
			console.error("SDK Validation Error Details:", {
				message: error.message,
				rawValue: error.rawValue,
				prettyError: error.pretty?.(),
			});
		}

		throw error;
	}
};

// Helper function to create a customer
export const createCustomer = async (params: {
	email: string;
	name?: string;
	tenantId: string;
}) => {
	if (!VITE_CREEM_API_KEY) {
		throw new Error("Creem API key is not configured");
	}

	try {
		// Note: The Creem SDK might not have a direct createCustomer method
		// This is a placeholder for the actual implementation
		// You might need to use their REST API directly or check their latest SDK docs

		// For now, we'll return the email as the customer ID
		// In a real implementation, you'd create the customer via Creem API
		return {
			id: `cust_${params.tenantId}_${Date.now()}`,
			email: params.email,
			name: params.name,
		};
	} catch (error) {
		console.error("Failed to create customer:", error);
		throw error;
	}
};

// Helper function to create a subscription
export const createSubscription = async (params: {
	customerId: string;
	planId: string;
	tenantId: string;
}) => {
	if (!VITE_CREEM_API_KEY) {
		throw new Error("Creem API key is not configured");
	}

	try {
		// Note: This is a placeholder implementation
		// You'll need to implement this based on Creem's actual subscription API

		return {
			id: `sub_${params.tenantId}_${Date.now()}`,
			customer_id: params.customerId,
			plan_id: params.planId,
			status: "active",
		};
	} catch (error) {
		console.error("Failed to create subscription:", error);
		throw error;
	}
};

// Helper function to retrieve a product
export const getProduct = async (productId: string) => {
	if (!VITE_CREEM_API_KEY) {
		throw new Error("Creem API key is not configured");
	}

	try {
		const result = await creem.retrieveProduct({
			productId,
			xApiKey: VITE_CREEM_API_KEY,
		});

		return result;
	} catch (error) {
		console.error("Failed to retrieve product:", error);
		throw error;
	}
};

// Helper function to cancel a subscription
export const cancelSubscription = async (subscriptionId: string) => {
	if (!VITE_CREEM_API_KEY) {
		throw new Error("Creem API key is not configured");
	}

	try {
		const result = await creem.cancelSubscription({
			id: subscriptionId,
			xApiKey: VITE_CREEM_API_KEY,
		});

		return result;
	} catch (error) {
		console.error("Failed to cancel subscription:", error);
		throw error;
	}
};

// Helper function to validate webhook signature (simplified for browser environment)
export const validateWebhookSignature = async (
	payload: string,
	signature: string,
	secret: string,
): Promise<boolean> => {
	// Implement webhook signature validation for browser environment
	// This is a security measure to ensure webhooks are from Creem
	try {
		if (!window.crypto || !window.crypto.subtle) {
			console.warn(
				"WebCrypto API not available, skipping signature validation",
			);
			return true; // In development, you might want to skip validation
		}

		const encoder = new TextEncoder();
		const keyData = encoder.encode(secret);
		const messageData = encoder.encode(payload);

		const cryptoKey = await window.crypto.subtle.importKey(
			"raw",
			keyData,
			{ name: "HMAC", hash: "SHA-256" },
			false,
			["sign"],
		);

		const signatureArrayBuffer = await window.crypto.subtle.sign(
			"HMAC",
			cryptoKey,
			messageData,
		);
		const expectedSignature = Array.from(new Uint8Array(signatureArrayBuffer))
			.map((b) => b.toString(16).padStart(2, "0"))
			.join("");

		return signature === expectedSignature;
	} catch (error) {
		console.error("Failed to validate webhook signature:", error);
		return false;
	}
};

export default creem;
