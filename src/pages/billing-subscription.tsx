import { AlertTriangle } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import {
	CurrentSubscriptionCard,
	PaymentProcessingInfo,
	SubscriptionPlansGrid,
	TrialStatusAlert,
} from "@/components/subscription";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/context/auth-context";
import { useSubscription } from "@/hooks/use-subscription";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { cancelSubscription, createCheckoutSession } from "@/lib/polar";
import type {
	Invoice,
	PaymentMethod,
	Plan,
	PlanWithPolarProduct,
	UsageData,
} from "@/types/subscription";

export default function BillingSubscription() {
	const { t } = useTranslation("common");
	const { toast } = useToast();
	const navigate = useNavigate();
	const { tenant, user } = useAuth();
	const {
		data: currentSubscription,
		isLoading: subscriptionLoading,
		error: subscriptionError,
	} = useSubscription();

	const [loading, setLoading] = useState(true);
	const [plans, setPlans] = useState<PlanWithPolarProduct[]>([]);
	const [processingPlanId, setProcessingPlanId] = useState<string | null>(null);
	const [cancelling, setCancelling] = useState(false);
	const [trialDaysRemaining, setTrialDaysRemaining] = useState<number | null>(
		null,
	);
	const [invoices, setInvoices] = useState<Invoice[]>([]);
	const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
	const [usageData, setUsageData] = useState<UsageData[]>([]);
	const [activeTab, setActiveTab] = useState("overview");
	const [loadingInvoices, setLoadingInvoices] = useState(false);
	const [loadingPaymentMethods, setLoadingPaymentMethods] = useState(false);
	const [syncing, setSyncing] = useState(false);

	// Fetch invoice history
	const fetchInvoiceHistory = useCallback(async () => {
		if (!tenant) return;

		setLoadingInvoices(true);
		try {
			// Mock invoice data for now - replace with actual Polar API call
			const currentPlan = plans.find(
				(p) => p.id === currentSubscription?.plan_id,
			);
			const mockInvoices: Invoice[] = [
				{
					id: "inv_1",
					amount: currentPlan ? currentPlan.price_cents / 100 : 19.0,
					currency: "USD",
					status: "paid",
					created: new Date(
						Date.now() - 30 * 24 * 60 * 60 * 1000,
					).toISOString(),
					description: `${currentPlan?.name || "Subscription"} - Monthly`,
				},
			];
			setInvoices(mockInvoices);
		} catch (error) {
			console.error("Error fetching invoices:", error);
		} finally {
			setLoadingInvoices(false);
		}
	}, [tenant, currentSubscription, plans]);

	// Fetch payment methods
	const fetchPaymentMethods = useCallback(async () => {
		if (!tenant) return;

		setLoadingPaymentMethods(true);
		try {
			// Mock payment methods - replace with actual Polar API call
			const mockPaymentMethods: PaymentMethod[] = [
				{
					id: "pm_1",
					type: "card",
					last4: "4242",
					brand: "visa",
					exp_month: 12,
					exp_year: 2025,
					is_default: true,
				},
			];
			setPaymentMethods(mockPaymentMethods);
		} catch (error) {
			console.error("Error fetching payment methods:", error);
		} finally {
			setLoadingPaymentMethods(false);
		}
	}, [tenant]);

	// Fetch usage data
	const fetchUsageData = useCallback(async () => {
		if (!tenant) return;

		try {
			// Mock usage data - replace with actual usage tracking
			const currentPlan = plans.find(
				(p) => p.id === currentSubscription?.plan_id,
			);
			if (currentPlan) {
				const mockUsageData: UsageData[] = [
					{
						period: "October 2025",
						usage: 15,
						limit: currentPlan.max_locations || undefined,
						unit: "locations",
					},
					{
						period: "October 2025",
						usage: 45,
						limit: currentPlan.max_rooms || undefined,
						unit: "rooms",
					},
				];
				setUsageData(mockUsageData);
			}
		} catch (error) {
			console.error("Error fetching usage data:", error);
		}
	}, [tenant, plans, currentSubscription]);

	useEffect(() => {
		if (tenant) {
			const fetchPlansAndSubscription = async () => {
				setLoading(true);
				try {
					// Fetch available plans
					const { data: plansData, error: plansError } = await supabase
						.from("plans")
						.select("*")
						.eq("is_active", true)
						.order("price_cents");

					if (plansError) throw plansError;

					// Fetch Polar product details for each plan (if needed)
					const plansWithProducts = await Promise.all(
						(plansData || []).map(async (plan) => {
							try {
								// Plans now use polar_price_id for checkout
								return { ...plan, polarProduct: null };
							} catch (error) {
								console.warn(
									`Failed to fetch Polar product for plan ${plan.id}:`,
									error,
								);
								return { ...plan, polarProduct: null };
							}
						}),
					);

					setPlans(plansWithProducts);
				} catch (error) {
					console.error("Error fetching billing data:", error);
					toast({
						title: "Error",
						description: "Failed to load billing information",
						variant: "destructive",
					});
				} finally {
					setLoading(false);
				}
			};

			fetchPlansAndSubscription();
		}
	}, [tenant, toast]);

	// Additional useEffect for fetch functions
	useEffect(() => {
		if (tenant) {
			fetchInvoiceHistory();
			fetchPaymentMethods();
			fetchUsageData();
		}
	}, [tenant, fetchInvoiceHistory, fetchPaymentMethods, fetchUsageData]);

	// Note: Removed onboarding_completed check to allow billing access anytime
	// Users can manage billing even during onboarding process

	useEffect(() => {
		// Calculate trial days remaining
		if (currentSubscription?.trial_end) {
			const trialEnd = new Date(currentSubscription.trial_end);
			const now = new Date();
			const diffTime = trialEnd.getTime() - now.getTime();
			const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
			setTrialDaysRemaining(Math.max(0, diffDays));
		} else if (tenant?.trial_ends_at) {
			const trialEnd = new Date(tenant.trial_ends_at);
			const now = new Date();
			const diffTime = trialEnd.getTime() - now.getTime();
			const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
			setTrialDaysRemaining(Math.max(0, diffDays));
		}
	}, [currentSubscription, tenant]);

	const handleSubscribe = async (plan: Plan) => {
		if (!tenant || !user) {
			toast({
				title: "Error",
				description: "You must be logged in to subscribe",
				variant: "destructive",
			});
			return;
		}

		setProcessingPlanId(plan.id);
		try {
			// Create checkout session with Polar
			if (!plan.polar_price_id) {
				toast({
					title: "Configuration Error",
					description: `The ${plan.name} plan is not configured yet. Please contact support to set up this plan.`,
					variant: "destructive",
				});
				throw new Error("Plan does not have a Polar price ID configured");
			}

			console.log(
				`🔍 Creating checkout for plan: ${plan.name} with price_id: ${plan.polar_price_id}`,
			);

			const successUrl = `${window.location.origin}/billing/success?plan_id=${plan.id}&tenant_id=${tenant.id}&source=billing&redirect_to=billing`;

			try {
				const checkout = await createCheckoutSession({
					product_price_id: plan.polar_price_id,
					success_url: successUrl,
					customer_email: user.email,
					metadata: {
						tenant_id: tenant.id,
						plan_id: plan.id,
						user_id: user.id,
						upgrade_from_trial: trialDaysRemaining !== null ? "true" : "false",
					},
				});

				// Redirect to Polar checkout
				if (checkout?.checkoutUrl) {
					window.location.href = checkout.checkoutUrl;
				} else {
					throw new Error("No checkout URL returned from Polar.sh");
				}
			} catch (polarError: any) {
				// Enhanced error handling for Polar integration
				console.warn("Polar checkout failed:", polarError);

				if (
					polarError.message?.includes("API key") ||
					polarError.message?.includes("access token")
				) {
					toast({
						title: "Configuration Error",
						description:
							"Payment system is not properly configured. Please contact support or try again later.",
						variant: "destructive",
					});
				} else if (
					polarError.message?.includes("product_id") ||
					polarError.message?.includes("price_id")
				) {
					toast({
						title: "Plan Configuration Error",
						description: `The ${plan.name} plan is not properly configured for payments. Please contact support.`,
						variant: "destructive",
					});
				} else {
					toast({
						title: "Payment System Error",
						description: `Failed to initialize checkout: ${polarError.message || "Unknown error"}. Please try again or contact support.`,
						variant: "destructive",
					});
				}
			}
		} catch (error: any) {
			console.error("Subscription error:", error);
			toast({
				title: "Error",
				description: error.message || "Failed to start subscription process",
				variant: "destructive",
			});
		} finally {
			setProcessingPlanId(null);
		}
	};

	const handleCancelSubscription = async () => {
		if (!currentSubscription?.polar_subscription_id) {
			toast({
				title: "Error",
				description: "No active subscription to cancel",
				variant: "destructive",
			});
			return;
		}

		setCancelling(true);
		try {
			// Cancel subscription in Polar
			try {
				await cancelSubscription(currentSubscription.polar_subscription_id);
			} catch (polarError) {
				console.warn(
					"Polar cancellation failed, proceeding with local cancellation:",
					polarError,
				);
			}

			// Update subscription status in database
			await supabase
				.from("subscriptions")
				.update({
					status: "cancelled",
					cancelled_at: new Date().toISOString(),
				})
				.eq("id", currentSubscription.id);

			// Update tenant status
			if (tenant) {
				await supabase
					.from("tenants")
					.update({ subscription_status: "cancelled" })
					.eq("id", tenant.id);
			}

			toast({
				title: "Success",
				description: "Subscription cancelled successfully",
			});

			// Refresh the page
			window.location.reload();
		} catch (error) {
			console.error("Cancellation error:", error);
			toast({
				title: "Error",
				description: "Failed to cancel subscription",
				variant: "destructive",
			});
		} finally {
			setCancelling(false);
		}
	};

	// Show loading spinner while data is being fetched
	if (loading || subscriptionLoading) {
		return (
			<div className="flex items-center justify-center min-h-[400px]">
				<div className="text-center space-y-4">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
					<p className="text-muted-foreground">
						Loading billing information...
					</p>
				</div>
			</div>
		);
	}

	// Show subscription error if it's not a 406 error (which is expected when no subscription)
	if (
		subscriptionError &&
		!subscriptionError.message?.includes("406") &&
		!subscriptionError.message?.includes("Not Acceptable")
	) {
		return (
			<div className="container mx-auto px-4 sm:px-6 md:px-8">
				<Alert variant="destructive">
					<AlertTriangle className="h-4 w-4" />
					<AlertDescription>
						Unable to load subscription details. Please try refreshing the page.
					</AlertDescription>
				</Alert>
			</div>
		);
	}

	return (
		<div className="w-full mx-auto pt-8 pb-20 sm:pb-8 px-4 sm:px-6 md:px-8 space-y-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-foreground">
						{t("billing.title")}
					</h1>
					<p className="text-muted-foreground">{t("billing.subtitle")}</p>
				</div>
			</div>

			{/* Trial Status Alert */}
			{(tenant?.subscription_status === "trial" ||
				currentSubscription?.status === "trialing") && (
				<TrialStatusAlert trialDaysRemaining={trialDaysRemaining} />
			)}

			{/* Current Subscription Status */}
			<CurrentSubscriptionCard
				subscription={currentSubscription}
				onCancel={handleCancelSubscription}
				cancelling={cancelling}
			/>

			{/* Available Plans */}
			<SubscriptionPlansGrid
				plans={plans}
				currentPlanId={currentSubscription?.plan_id}
				onSubscribe={handleSubscribe}
				processingPlanId={processingPlanId}
			/>

			{/* Polar.sh Integration Info */}
			<PaymentProcessingInfo />
		</div>
	);
}
