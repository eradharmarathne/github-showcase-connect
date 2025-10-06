import {
	AlertTriangle,
	Bed,
	Building2,
	Calendar,
	CheckCircle,
	CreditCard,
	Crown,
	Download,
	FileText,
	History,
	RefreshCw,
	TrendingUp,
	Users,
	XCircle,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useSubscription } from "@/hooks/useSubscription";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import {
	cancelSubscription,
	createCheckoutSession,
	getProduct,
} from "@/lib/creem";

type Plan = Tables<"plans">;
type Subscription = Tables<"subscriptions">;
type Tenant = Tables<"tenants">;

interface PlanWithCreemProduct extends Plan {
	creemProduct?: any;
}

interface Invoice {
	id: string;
	amount: number;
	currency: string;
	status: "paid" | "open" | "failed" | "draft";
	created: string;
	due_date?: string;
	invoice_pdf?: string;
	description?: string;
}

interface PaymentMethod {
	id: string;
	type: "card" | "bank_account";
	last4: string;
	brand?: string;
	exp_month?: number;
	exp_year?: number;
	is_default: boolean;
}

interface UsageData {
	period: string;
	usage: number;
	limit?: number;
	unit: string;
}

export default function BillingSubscription() {
	const { t } = useTranslation("common");
	const navigate = useNavigate();
	const { toast } = useToast();
	const { tenant, user } = useAuth();
	const {
		data: currentSubscription,
		isLoading: subscriptionLoading,
		error: subscriptionError,
	} = useSubscription();

	const [loading, setLoading] = useState(true);
	const [plans, setPlans] = useState<PlanWithCreemProduct[]>([]);
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
			// Mock invoice data for now - replace with actual Creem API call
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
			// Mock payment methods - replace with actual Creem API call
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

					// Fetch Creem product details for each plan (if needed)
					const plansWithProducts = await Promise.all(
						(plansData || []).map(async (plan) => {
							try {
								// If plan has a creem_product_id, fetch its details
								// For now, we'll use mock data since the plans table doesn't have creem_product_id
								return { ...plan, creemProduct: null };
							} catch (error) {
								console.warn(
									`Failed to fetch Creem product for plan ${plan.id}:`,
									error,
								);
								return { ...plan, creemProduct: null };
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
			// Create checkout session with Creem
			if (!plan.product_id) {
				throw new Error("Plan does not have a Creem product ID configured");
			}

			const successUrl = `${window.location.origin}/billing/success?plan_id=${plan.id}&tenant_id=${tenant.id}&source=billing&redirect_to=billing`;

			try {
				const checkout = await createCheckoutSession({
					product_id: plan.product_id,
					success_url: successUrl,
					error_url: `${window.location.origin}/billing/error?source=billing`,
					cancel_url: `${window.location.origin}/billing`,
					customer: {
						email: user.email,
					},
					metadata: {
						tenant_id: tenant.id,
						plan_id: plan.id,
						user_id: user.id,
						upgrade_from_trial: trialDaysRemaining !== null ? "true" : "false",
					},
				});

				// Redirect to Creem checkout
				if (checkout?.checkoutUrl) {
					window.location.href = checkout.checkoutUrl;
				} else {
					throw new Error("No checkout URL returned from Creem.io");
				}
			} catch (creemError: any) {
				// Enhanced error handling for Creem integration
				console.warn("Creem checkout failed:", creemError);

				if (creemError.message?.includes("API key")) {
					toast({
						title: "Configuration Error",
						description:
							"Payment system is not properly configured. Please contact support or try again later.",
						variant: "destructive",
					});
				} else if (creemError.message?.includes("product_id")) {
					toast({
						title: "Plan Configuration Error",
						description: `The ${plan.name} plan is not properly configured for payments. Please contact support.`,
						variant: "destructive",
					});
				} else {
					toast({
						title: "Payment System Error",
						description: `Failed to initialize checkout: ${creemError.message || "Unknown error"}. Please try again or contact support.`,
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

	// Handle manual subscription sync/refresh
	const handleSyncSubscription = async () => {
		if (!tenant) return;

		setSyncing(true);
		try {
			// For now, we'll just refresh the subscription data from our database
			// In a real implementation, you'd fetch from Creem API to get the latest status
			const { data: subscriptionData, error: subscriptionError } =
				await supabase
					.from("subscriptions")
					.select(`
					*,
					plans (*)
				`)
					.eq("tenant_id", tenant.id)
					.maybeSingle();

			if (subscriptionError) {
				console.error("Subscription fetch error:", subscriptionError);
				throw new Error("Failed to fetch subscription data");
			}

			// Also refresh tenant data
			const { data: tenantData, error: tenantError } = await supabase
				.from("tenants")
				.select("*")
				.eq("id", tenant.id)
				.single();

			if (!tenantError && tenantData) {
				// This would update the auth context if needed
				console.log("Updated tenant data:", tenantData);
			}

			toast({
				title: "Success",
				description: "Subscription status refreshed",
			});

			// Force a page reload to ensure all components are updated with fresh data
			window.location.reload();
		} catch (error) {
			console.error("Sync error:", error);
			toast({
				title: "Error",
				description:
					"Failed to sync subscription status. If you just made a payment, please contact support.",
				variant: "destructive",
			});
		} finally {
			setSyncing(false);
		}
	};

	const handleCancelSubscription = async () => {
		if (!currentSubscription?.creem_subscription_id) {
			toast({
				title: "Error",
				description: "No active subscription to cancel",
				variant: "destructive",
			});
			return;
		}

		setCancelling(true);
		try {
			// Cancel subscription in Creem
			try {
				await cancelSubscription(currentSubscription.creem_subscription_id);
			} catch (creemError) {
				console.warn(
					"Creem cancellation failed, proceeding with local cancellation:",
					creemError,
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

	const getStatusColor = (status: string) => {
		switch (status) {
			case "active":
				return "bg-green-100 text-green-800";
			case "trialing":
				return "bg-blue-100 text-blue-800";
			case "past_due":
				return "bg-yellow-100 text-yellow-800";
			case "cancelled":
				return "bg-red-100 text-red-800";
			default:
				return "bg-gray-100 text-gray-800";
		}
	};

	const getStatusIcon = (status: string) => {
		switch (status) {
			case "active":
				return <CheckCircle className="size-4 text-green-600" />;
			case "trialing":
				return <Calendar className="size-4 text-blue-600" />;
			case "past_due":
				return <AlertTriangle className="size-4 text-yellow-600" />;
			case "cancelled":
				return <XCircle className="size-4 text-red-600" />;
			default:
				return <AlertTriangle className="size-4 text-gray-600" />;
		}
	};

	const isTrialExpired =
		tenant?.trial_ends_at && new Date(tenant.trial_ends_at) < new Date();
	const trialDaysLeft = tenant?.trial_ends_at
		? Math.max(
				0,
				Math.ceil(
					(new Date(tenant.trial_ends_at).getTime() - new Date().getTime()) /
						(1000 * 3600 * 24),
				),
			)
		: 0;

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
		<div className="w-full mx-auto pb-20 sm:pb-8 px-4 sm:px-6 md:px-8 space-y-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-foreground">
						{t("billing.title")}
					</h1>
					<p className="text-muted-foreground">
						{t("billing.subtitle")}
					</p>
				</div>
			</div>

			{/* Trial Status Alert */}
			{(tenant?.subscription_status === "trial" ||
				currentSubscription?.status === "trialing") && (
				<Alert
					className={
						trialDaysRemaining === 0
							? "border-red-200 bg-red-50"
							: trialDaysRemaining && trialDaysRemaining <= 2
								? "border-yellow-200 bg-yellow-50"
								: "border-blue-200 bg-blue-50"
					}
				>
					<AlertTriangle
						className={`h-4 w-4 ${
							trialDaysRemaining === 0
								? "text-red-600"
								: trialDaysRemaining && trialDaysRemaining <= 2
									? "text-yellow-600"
									: "text-blue-600"
						}`}
					/>
					<AlertDescription
						className={
							trialDaysRemaining === 0
								? "text-red-800"
								: trialDaysRemaining && trialDaysRemaining <= 2
									? "text-yellow-800"
									: "text-blue-800"
						}
					>
						{trialDaysRemaining === 0
							? "Your 7-day free trial has expired. Please subscribe to continue using the service."
							: trialDaysRemaining === 1
								? "Your 7-day free trial expires tomorrow. Subscribe now to continue using all features."
								: `Your 7-day free trial expires in ${trialDaysRemaining} days. Subscribe now to continue using all features.`}
					</AlertDescription>
				</Alert>
			)}

			{/* Current Subscription Status */}
			{currentSubscription && (
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<Crown className="size-5 text-yellow-600" />
							{t("billing.currentSubscription.title")}
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-2">
								{getStatusIcon(currentSubscription.status)}
								<Badge className={getStatusColor(currentSubscription.status)}>
									{currentSubscription.status.toUpperCase()}
								</Badge>
							</div>
							{currentSubscription.status === "active" && (
								<Button
									variant="outline"
									size="sm"
									onClick={handleCancelSubscription}
									disabled={cancelling}
								>
									{cancelling ? t("billing.currentSubscription.cancelling") : t("billing.currentSubscription.cancelSubscription")}
								</Button>
							)}
						</div>

						{currentSubscription.current_period_end && (
							<p className="text-sm text-muted-foreground">
								{currentSubscription.status === "active" ? "Renews" : "Expires"}{" "}
								on:{" "}
								{new Date(
									currentSubscription.current_period_end,
								).toLocaleDateString()}
							</p>
						)}
					</CardContent>
				</Card>
			)}

			{/* Available Plans */}
			<div className="space-y-4">
				<h2 className="text-lg md:text-xl lg:text-2xl font-semibold">
					{t("billing.plans.title")}
				</h2>
				<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
					{plans.map((plan) => {
						const isCurrentPlan = currentSubscription?.plan_id === plan.id;
						const price = plan.price_cents / 100;

						return (
							<Card
								key={plan.id}
								className={`relative ${isCurrentPlan ? "ring-0 ring-blue-500" : ""}`}
							>
								{isCurrentPlan && (
									<Badge className="absolute -top-2 -right-2 bg-blue-600">
										Current Plan
									</Badge>
								)}
								<CardHeader>
									<CardTitle className="flex items-center justify-between">
										<span>{plan.name}</span>
										<div className="text-right">
											<div className="text-2xl font-bold">
												${price.toFixed(2)}
											</div>
											<div className="text-sm text-muted-foreground">
												/{plan.billing_interval}
											</div>
										</div>
									</CardTitle>
									{plan.description && (
										<p className="text-sm text-muted-foreground">
											{plan.description}
										</p>
									)}
								</CardHeader>
								<CardContent className="space-y-4">
									{/* Plan Features */}
									<div className="space-y-2">
										{plan.max_locations && (
											<div className="flex items-center gap-2 text-sm">
												<Building2 className="size-4 text-muted-foreground" />
												<span>{plan.max_locations} locations</span>
											</div>
										)}
										{plan.max_rooms && (
											<div className="flex items-center gap-2 text-sm">
												<Bed className="size-4 text-muted-foreground" />
												<span>{plan.max_rooms} rooms</span>
											</div>
										)}
										<div className="flex items-center gap-2 text-sm">
											<Users className="size-4 text-muted-foreground" />
											<span>Unlimited users</span>
										</div>
										<div className="flex items-center gap-2 text-sm">
											<CheckCircle className="size-4 text-green-600" />
											<span>24/7 Support</span>
										</div>
									</div>

									{/* Action Button */}
									{!isCurrentPlan && (
										<Button
											className="w-full"
											onClick={() => handleSubscribe(plan)}
											disabled={processingPlanId === plan.id}
										>
											<CreditCard className="size-4 mr-2" />
											{processingPlanId === plan.id
												? t("billing.plans.processing")
												: t("billing.plans.subscribe")}
										</Button>
									)}
								</CardContent>
							</Card>
						);
					})}
				</div>
			</div>

			{/* Creem.io Integration Info */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<CreditCard className="size-5" />
						Payment Processing
					</CardTitle>
				</CardHeader>
				<CardContent>
					<p className="text-sm text-muted-foreground">
						Payments are processed securely through Creem.io. All major credit
						cards are accepted. Your payment information is never stored on our
						servers.
					</p>
					{!import.meta.env.VITE_CREEM_API_KEY && (
						<Alert className="mt-4">
							<AlertTriangle className="h-4 w-4" />
							<AlertDescription>
								<strong>Demo Mode:</strong> Set VITE_CREEM_API_KEY environment
								variable to enable real payment processing.
							</AlertDescription>
						</Alert>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
