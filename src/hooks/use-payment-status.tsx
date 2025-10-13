import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type PaymentStatus = "pending" | "verified" | "failed" | "timeout";

interface UsePaymentStatusOptions {
	tenantId: string | null;
	enabled?: boolean;
	timeoutMinutes?: number;
	pollIntervalSeconds?: number;
}

export const usePaymentStatus = ({
	tenantId,
	enabled = true,
	timeoutMinutes = 10,
	pollIntervalSeconds = 3,
}: UsePaymentStatusOptions) => {
	const [status, setStatus] = useState<PaymentStatus>("pending");
	const [startTime] = useState(Date.now());

	useEffect(() => {
		if (!tenantId || !enabled) {
			return;
		}

		console.log("💳 [PAYMENT-STATUS] Starting payment status polling for tenant:", tenantId);

		let pollCount = 0;
		const maxPolls = (timeoutMinutes * 60) / pollIntervalSeconds;

		const checkPaymentStatus = async () => {
			try {
				pollCount++;
				console.log(`🔄 [PAYMENT-STATUS] Poll #${pollCount} checking status...`);

				// Check tenant subscription status
				const { data: tenantData, error: tenantError } = await supabase
					.from("tenants")
					.select("subscription_status")
					.eq("id", tenantId)
					.single();

				if (tenantError) {
					console.error("❌ [PAYMENT-STATUS] Error fetching tenant:", tenantError);
					return;
				}

				console.log(`📊 [PAYMENT-STATUS] Tenant status: ${tenantData?.subscription_status}`);

				// Check if payment was verified (status changed from pending_payment)
				if (
					tenantData?.subscription_status === "active" ||
					tenantData?.subscription_status === "trialing"
				) {
					console.log("✅ [PAYMENT-STATUS] Payment verified! Status:", tenantData.subscription_status);
					setStatus("verified");
					return true; // Stop polling
				}

				// Check for payment failure
				if (tenantData?.subscription_status === "payment_failed") {
					console.log("❌ [PAYMENT-STATUS] Payment failed");
					setStatus("failed");
					return true; // Stop polling
				}

				// Check for timeout
				const elapsed = Date.now() - startTime;
				if (elapsed > timeoutMinutes * 60 * 1000) {
					console.warn("⏱️ [PAYMENT-STATUS] Payment verification timeout");
					setStatus("timeout");
					return true; // Stop polling
				}

				return false; // Continue polling
			} catch (err) {
				console.error("❌ [PAYMENT-STATUS] Exception during status check:", err);
				return false; // Continue polling on error
			}
		};

		// Initial check
		checkPaymentStatus();

		// Set up polling interval
		const interval = setInterval(async () => {
			const shouldStop = await checkPaymentStatus();
			if (shouldStop) {
				clearInterval(interval);
			}
		}, pollIntervalSeconds * 1000);

		// Cleanup on unmount
		return () => {
			console.log("🛑 [PAYMENT-STATUS] Stopping payment status polling");
			clearInterval(interval);
		};
	}, [tenantId, enabled, startTime, timeoutMinutes, pollIntervalSeconds]);

	return {
		status,
		isPending: status === "pending",
		isVerified: status === "verified",
		isFailed: status === "failed" || status === "timeout",
		isTimeout: status === "timeout",
	};
};
