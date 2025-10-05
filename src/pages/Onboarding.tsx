import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { createCheckoutSession } from "@/lib/creem";
import {
	OnboardingProgress,
	OnboardingNavigation,
	CompanyInfoStep,
	PropertyDetailsStep,
	FeaturesStep,
	PlanSelectionStep,
	CompletionStep,
	STEPS,
	type OnboardingFormData,
	type Plan,
} from "@/components/onboarding";

export default function Onboarding() {
	const [currentStep, setCurrentStep] = useState(1);
	const [loading, setLoading] = useState(false);
	const [plans, setPlans] = useState<Plan[]>([]);
	const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
	const [processingPayment, setProcessingPayment] = useState(false);
	const [hasExistingTenant, setHasExistingTenant] = useState(false);
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

	const handleStartTrial = async () => {
		if (!selectedPlanId) return;

		try {
			setProcessingPayment(true);

			// First complete the tenant setup without payment
			await completeOnboarding();

			// Start 7-day trial
			const selectedPlan = plans.find((p) => p.id === selectedPlanId);
			if (selectedPlan && user?.email) {
				const { data: subscription, error } = await supabase
					.from("subscriptions")
					.insert({
						tenant_id: formData.companyName
							.toLowerCase()
							.replace(/[^a-z0-9]/g, "-"),
						plan_id: selectedPlanId,
						status: "trialing",
						trial_start_date: new Date().toISOString(),
						trial_end_date: new Date(
							Date.now() + 7 * 24 * 60 * 60 * 1000,
						).toISOString(), // 7 days
						current_period_start: new Date().toISOString(),
						current_period_end: new Date(
							Date.now() + 7 * 24 * 60 * 60 * 1000,
						).toISOString(),
					})
					.select()
					.single();

				if (error) throw error;

				toast({
					title: "Trial Started!",
					description: "You now have 7 days to explore all features for free.",
				});

				// Navigate to next step
				handleNext();
			}
		} catch (error) {
			console.error("Error starting trial:", error);
			toast({
				title: "Error",
				description: "Failed to start trial. Please try again.",
				variant: "destructive",
			});
		} finally {
			setProcessingPayment(false);
		}
	};

	const handlePayNow = async () => {
		if (!selectedPlanId) return;

		try {
			setProcessingPayment(true);

			const selectedPlan = plans.find((p) => p.id === selectedPlanId);
			if (!selectedPlan?.product_id) {
				throw new Error("Plan does not have a Creem product ID");
			}

			// Create checkout session with Creem
			const checkoutSession = await createCheckoutSession({
				product_id: selectedPlan.product_id,
				success_url: `${window.location.origin}/billing/success?plan_id=${selectedPlanId}&source=onboarding`,
				error_url: `${window.location.origin}/billing/error?source=onboarding`,
				cancel_url: `${window.location.origin}/onboarding`,
				customer: {
					email: user?.email,
				},
				metadata: {
					tenant_id: formData.companyName
						.toLowerCase()
						.replace(/[^a-z0-9]/g, "-"),
					plan_id: selectedPlanId,
					onboarding: "true",
				},
			});

			// Redirect to Creem checkout
			if (checkoutSession.checkoutUrl) {
				window.location.href = checkoutSession.checkoutUrl;
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

	const completeOnboarding = async () => {
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

			// Create tenant
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
					onboarding_completed: true,
					trial_ends_at: new Date(
						Date.now() + 7 * 24 * 60 * 60 * 1000,
					).toISOString(), // 7 days trial
					subscription_status: "trial",
				})
				.select()
				.single();

			if (tenantError) throw tenantError;

			// Update user profile with tenant_id and mark first login as completed
			const { error: profileError } = await supabase
				.from("profiles")
				.update({
					tenant_id: tenant.id,
					role: "admin",
					first_login_completed: true,
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
						tenant_role: "tenant_admin", // Owner gets tenant admin role
						is_tenant_admin: true, // Ensure admin flag is set
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

			// Create trial subscription
			const { error: subscriptionError } = await supabase
				.from("subscriptions")
				.insert({
					tenant_id: tenant.id,
					plan_id: "professional", // Default to professional plan for trial
					status: "trialing",
					current_period_start: new Date().toISOString(),
					current_period_end: new Date(
						Date.now() + 7 * 24 * 60 * 60 * 1000,
					).toISOString(),
					trial_end: new Date(
						Date.now() + 7 * 24 * 60 * 60 * 1000,
					).toISOString(),
				});

			if (subscriptionError) throw subscriptionError;

			toast({
				title: "Welcome aboard! 🎉",
				description: `Your ${formData.companyName} account has been set up successfully. You're on a 7-day free trial!`,
			});

			// Redirect to main app
			navigate("/dashboard");
		} catch (error: any) {
			console.error("Onboarding error:", error);
			toast({
				title: "Setup Error",
				description:
					error.message || "Failed to complete setup. Please try again.",
				variant: "destructive",
			});
		} finally {
			setLoading(false);
		}
	};

	const handleComplete = async () => {
		try {
			setLoading(true);

			// Complete onboarding without payment setup - user already went through trial/payment
			toast({
				title: "Welcome aboard! 🎉",
				description:
					"Your account has been set up successfully. Let's get started!",
			});

			// Redirect to main app
			navigate("/dashboard");
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
				return !!(formData.companyName && formData.contactName && formData.email);
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
						onStartTrial={handleStartTrial}
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
		<div className="min-h-screen bg-background p-4">
			<div className="max-w-4xl mx-auto">
				{/* Progress Header */}
				<OnboardingProgress
					currentStep={currentStep}
					totalSteps={STEPS.length}
				/>

				{/* Main Content */}
				<Card className="bg-card border">
					<CardHeader className="pb-6">
						<CardTitle className="text-center text-2xl">
							{STEPS[currentStep - 1]?.title}
						</CardTitle>
					</CardHeader>
					<CardContent className="px-8 pb-8">{renderStepContent()}</CardContent>
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