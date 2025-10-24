import { CheckCircle, Loader2, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import {
	CompanyInfoStep,
	CompletionStep,
	FeaturesStep,
	type OnboardingFormData,
	OnboardingNavigation,
	OnboardingProgress,
	type Plan,
	PlanSelectionStep,
	PropertyDetailsStep,
	STEPS,
} from "@/components/onboarding";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/context/auth-context";
import { usePaymentStatus } from "@/hooks/use-payment-status";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { createCheckoutSession } from "@/lib/creem";

export default function Onboarding() {
	const [currentStep, setCurrentStep] = useState(1);
	const [loading, setLoading] = useState(false);
	const [plans, setPlans] = useState<Plan[]>([]);
	const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
	const [processingPayment, setProcessingPayment] = useState(false);
	const [hasExistingTenant, setHasExistingTenant] = useState(false);
	const [pendingTenantId, setPendingTenantId] = useState<string | null>(null);
	const [awaitingPayment, setAwaitingPayment] = useState(false);
	const [formData, setFormData] = useState<OnboardingFormData>({
		// Company Info
		companyName: "",
		contactName: "",
		email: "",
		phone: "",
		address: "",
		country: "",

		// Property Details
		propertyType: "",
		propertyCount: "",
		totalRooms: "",
		description: "",

		// Features
		selectedFeatures: ["bookings", "payments"], // Essential features pre-selected

		// User preferences
		currency: "USD",
		timezone: "",
	});

	const navigate = useNavigate();
	const { toast } = useToast();
	const { user, profile, tenant } = useAuth();
	const [searchParams] = useSearchParams();
	const {
		status: paymentStatus,
		isVerified,
		isFailed,
	} = usePaymentStatus({
		tenantId: pendingTenantId,
		enabled: awaitingPayment,
	});

	useEffect(() => {
		if (!user) {
			navigate("/");
			return;
		}

		// Check if user already has a tenant (returning user with no locations)
		if (profile?.tenant_id && tenant) {
			setHasExistingTenant(true);
		}

		// Pre-fill user email if available
		if (user.email && !formData.email) {
			setFormData((prev) => ({
				...prev,
				email: user.email!,
				contactName: user.user_metadata?.name || "",
			}));
		}

		// Fetch available plans
		const fetchPlans = async () => {
			try {
				const { data: plansData, error } = await supabase
					.from("plans")
					.select("*")
					.eq("is_active", true)
					.order("price_cents");

				if (error) throw error;
				setPlans(plansData || []);
			} catch (error) {
				console.error("Error fetching plans:", error);
				toast({
					title: "Error",
					description: "Failed to load subscription plans",
					variant: "destructive",
				});
			}
		};

		fetchPlans();
	}, [user, navigate, formData.email, toast, profile?.tenant_id, tenant]);

	useEffect(() => {
		if (hasExistingTenant) {
			navigate("/dashboard");
		}
	}, [hasExistingTenant, navigate]);

	// Handle payment verification
	useEffect(() => {
		if (isVerified && pendingTenantId) {
			console.log("✅ [ONBOARDING] Payment verified, completing onboarding...");
			toast({
				title: "Payment Verified! 🎉",
				description:
					"Your payment has been confirmed. Setting up your account...",
			});

			// Mark tenant as onboarding complete
			supabase
				.from("tenants")
				.update({ onboarding_completed: true })
				.eq("id", pendingTenantId)
				.then(() => {
					setTimeout(() => {
						navigate("/dashboard", { replace: true });
					}, 2000);
				});
		} else if (isFailed && pendingTenantId) {
			console.error("❌ [ONBOARDING] Payment verification failed or timed out");
			toast({
				title: "Payment Verification Failed",
				description:
					"We couldn't verify your payment. Please try again or contact support.",
				variant: "destructive",
			});
			setAwaitingPayment(false);
			setPendingTenantId(null);
		}
	}, [isVerified, isFailed, pendingTenantId, navigate, toast]);

	// Early return for users with existing tenant - don't render onboarding UI
	if (hasExistingTenant) {
		return (
			<div className="min-h-screen bg-background flex items-center justify-center">
				<div className="text-center">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
					<p className="text-muted-foreground">Redirecting to dashboard...</p>
				</div>
			</div>
		);
	}

	const handleNext = () => {
		if (currentStep < STEPS.length) {
			setCurrentStep(currentStep + 1);
		}
	};

	const handlePrevious = () => {
		if (currentStep > 1) {
			setCurrentStep(currentStep - 1);
		}
	};

	const handlePayNow = async () => {
		if (!selectedPlanId) return;

		try {
			setProcessingPayment(true);

			// ✅ SECURE: Create tenant with "pending_payment" status BEFORE payment
			const tenantId = await createPendingPaymentTenant();
			setPendingTenantId(tenantId);

			const selectedPlan = plans.find((p) => p.id === selectedPlanId);
			if (!selectedPlan?.product_id) {
				throw new Error("Plan does not have a Creem product ID");
			}

			// Create checkout session with Creem
			const checkoutSession = await createCheckoutSession({
				product_id: selectedPlan.product_id,
				success_url: `${window.location.origin}/onboarding?payment_status=checking&tenant_id=${tenantId}`,
				cancel_url: `${window.location.origin}/onboarding`,
				customer: {
					email: user?.email,
				},
				metadata: {
					tenant_id: tenantId,
					user_id: user!.id,
					plan_id: selectedPlanId,
					source: "onboarding",
					timestamp: new Date().toISOString(),
				},
			});

			// ✅ SECURE: Open Creem in NEW TAB (user stays on onboarding)
			if (checkoutSession.checkoutUrl) {
				window.open(checkoutSession.checkoutUrl, "_blank");

				// Start awaiting payment verification
				setAwaitingPayment(true);

				toast({
					title: "Payment Window Opened",
					description:
						"Complete your payment in the new tab. We'll verify it automatically.",
				});
			} else {
				throw new Error("No checkout URL received from Creem");
			}
		} catch (error) {
			console.error("Error creating checkout session:", error);
			toast({
				title: "Payment Error",
				description: "Failed to initiate payment. Please try again.",
				variant: "destructive",
			});
		} finally {
			setProcessingPayment(false);
		}
	};

	const createPendingPaymentTenant = async (): Promise<string> => {
		try {
			setLoading(true);

			// Generate collision-resistant slug with client-side logic
			const generateUniqueSlug = async (name: string): Promise<string> => {
				const baseSlug =
					name
						.toLowerCase()
						.replace(/[^a-z0-9\s-]/g, "")
						.replace(/\s+/g, "-")
						.replace(/-+/g, "-")
						.trim() || "tenant";

				// Check if base slug exists
				const { data: existing } = await supabase
					.from("tenants")
					.select("slug")
					.eq("slug", baseSlug)
					.limit(1);

				if (!existing || existing.length === 0) {
					return baseSlug;
				}

				// Find the next available slug with counter
				let counter = 2;
				let candidateSlug = `${baseSlug}-${counter}`;

				while (true) {
					const { data: existingCandidate } = await supabase
						.from("tenants")
						.select("slug")
						.eq("slug", candidateSlug)
						.limit(1);

					if (!existingCandidate || existingCandidate.length === 0) {
						return candidateSlug;
					}

					counter++;
					candidateSlug = `${baseSlug}-${counter}`;
				}
			};

			const slug = await generateUniqueSlug(formData.companyName);

			// ✅ SECURE: Create tenant with "pending_payment" status
			const { data: tenant, error: tenantError } = await supabase
				.from("tenants")
				.insert({
					name: formData.companyName,
					slug: slug,
					hotel_name: formData.companyName,
					hotel_email: formData.email,
					hotel_phone: formData.phone,
					hotel_address: formData.address,
					hotel_timezone: formData.timezone || "UTC",
					owner_profile_id: user!.id,
					onboarding_completed: false, // Not completed until payment verified
					subscription_status: "pending_payment", // ✅ Waiting for payment
				})
				.select()
				.single();

			if (tenantError) throw tenantError;

			// Update user profile with tenant_id
			const { error: profileError } = await supabase
				.from("profiles")
				.update({
					tenant_id: tenant.id,
					role: "admin",
				})
				.eq("id", user!.id);

			if (profileError) throw profileError;

			// Create default location for the tenant
			const { data: location, error: locationError } = await supabase
				.from("locations")
				.insert({
					name: formData.companyName,
					tenant_id: tenant.id,
					is_active: true,
					property_type: formData.propertyType,
				})
				.select()
				.single();

			if (locationError) throw locationError;

			// Create user permissions for the new location
			const { error: permissionsError } = await supabase
				.from("user_permissions")
				.insert([
					{
						user_id: user.id,
						tenant_id: tenant.id,
						location_id: location.id,
						tenant_role: "tenant_admin",
						is_tenant_admin: true,
						access_dashboard: true,
						access_income: true,
						access_expenses: true,
						access_reports: true,
						access_calendar: true,
						access_bookings: true,
						access_rooms: true,
						access_master_files: true,
						access_accounts: true,
						access_users: true,
						access_settings: true,
						access_booking_channels: true,
					},
				]);
			if (permissionsError) throw permissionsError;

			// Create pending subscription record
			const { error: subscriptionError } = await supabase
				.from("subscriptions")
				.insert({
					tenant_id: tenant.id,
					plan_id: selectedPlanId || "professional",
					status: "incomplete", // Will be updated by webhook
				});

			if (subscriptionError) throw subscriptionError;

			console.log("✅ [ONBOARDING] Created pending tenant:", tenant.id);

			return tenant.id;
		} catch (error: any) {
			console.error("Pending tenant creation error:", error);
			toast({
				title: "Setup Error",
				description:
					error.message || "Failed to create tenant. Please try again.",
				variant: "destructive",
			});
			throw error;
		} finally {
			setLoading(false);
		}
	};

	const handleComplete = async () => {
		try {
			setLoading(true);

			// At this point, tenant, location, and permissions should already be created
			// Just show success message and redirect to dashboard
			toast({
				title: "Welcome aboard! 🎉",
				description:
					"Your account has been set up successfully. Let's get started!",
			});

			// Small delay to show the toast, then redirect
			setTimeout(() => {
				navigate("/dashboard");
			}, 1000);
		} catch (error: any) {
			console.error("Final completion error:", error);
			toast({
				title: "Setup Error",
				description: "Failed to complete setup. Please try again.",
				variant: "destructive",
			});
		} finally {
			setLoading(false);
		}
	};

	const validateStep = (): boolean => {
		switch (currentStep) {
			case 1:
				return !!(
					formData.companyName &&
					formData.contactName &&
					formData.email
				);
			case 2:
				return !!(formData.propertyType && formData.propertyCount);
			case 3:
				return formData.selectedFeatures.length > 0;
			case 4:
				return selectedPlanId !== null;
			default:
				return true;
		}
	};

	const renderStepContent = () => {
		switch (currentStep) {
			case 1:
				return (
					<CompanyInfoStep formData={formData} setFormData={setFormData} />
				);

			case 2:
				return (
					<PropertyDetailsStep formData={formData} setFormData={setFormData} />
				);

			case 3:
				return <FeaturesStep formData={formData} setFormData={setFormData} />;

			case 4:
				return (
					<PlanSelectionStep
						formData={formData}
						setFormData={setFormData}
						plans={plans}
						selectedPlanId={selectedPlanId}
						setSelectedPlanId={setSelectedPlanId}
						processingPayment={processingPayment}
						onPayNow={handlePayNow}
					/>
				);

			case 5:
				return <CompletionStep loading={loading} onComplete={handleComplete} />;

			default:
				return null;
		}
	};

	return (
		<div className="min-h-screen bg-background p-4 sm:p-6 md:p-8">
			<div className="max-w-4xl py-8 sm:py-16 w-full mx-auto">
				{/* Progress Header */}
				<OnboardingProgress
					currentStep={currentStep}
					totalSteps={STEPS.length}
				/>

				{/* Payment Verification Status */}
				{awaitingPayment && (
					<Alert className="mb-4">
						{paymentStatus === "pending" && (
							<>
								<Loader2 className="h-4 w-4 animate-spin" />
								<AlertTitle>Waiting for Payment Verification...</AlertTitle>
								<AlertDescription>
									Please complete your payment in the new tab. We're monitoring
									for confirmation and will update automatically.
								</AlertDescription>
							</>
						)}
						{paymentStatus === "verified" && (
							<>
								<CheckCircle className="h-4 w-4 text-green-600" />
								<AlertTitle>Payment Verified!</AlertTitle>
								<AlertDescription>
									Your payment has been confirmed. Setting up your account...
								</AlertDescription>
							</>
						)}
						{(paymentStatus === "failed" || paymentStatus === "timeout") && (
							<>
								<XCircle className="h-4 w-4 text-red-600" />
								<AlertTitle>Payment Verification Failed</AlertTitle>
								<AlertDescription>
									We couldn't verify your payment. Please try again or contact
									support.
								</AlertDescription>
							</>
						)}
					</Alert>
				)}

				{/* Main Content */}
				<Card className="bg-card border">
					<CardContent className="px-8 py-8">{renderStepContent()}</CardContent>
				</Card>

				{/* Navigation */}
				<OnboardingNavigation
					currentStep={currentStep}
					totalSteps={STEPS.length}
					onNext={handleNext}
					onPrevious={handlePrevious}
					canProceed={validateStep()}
				/>
			</div>
		</div>
	);
}
