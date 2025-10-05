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

	const handleFeatureToggle = (featureId: string, essential: boolean) => {
		if (essential) return; // Don't allow toggling essential features

		setFormData((prev) => ({
			...prev,
			selectedFeatures: prev.selectedFeatures.includes(featureId)
				? prev.selectedFeatures.filter((id) => id !== featureId)
				: [...prev.selectedFeatures, featureId],
		}));
	};

	const handlePlanSelect = (planId: string) => {
		setSelectedPlanId(planId);
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

	const validateStep = () => {
		switch (currentStep) {
			case 1:
				return formData.companyName && formData.contactName && formData.email;
			case 2:
				return formData.propertyType && formData.propertyCount;
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
					<div className="space-y-6">
						<div className="text-center mb-8">
							<Building2 className="h-12 w-12 text-primary mx-auto mb-4" />
							<h2 className="text-lg sm:text-2xl font-bold mb-2">
								Tell us about your business
							</h2>
							<p className="text-muted-foreground">
								We'll use this information to customize your experience
							</p>
						</div>

						<div className="grid md:grid-cols-2 gap-4">
							<div>
								<Label htmlFor="companyName">Company/Hotel Name *</Label>
								<Input
									id="companyName"
									value={formData.companyName}
									onChange={(e) =>
										setFormData((prev) => ({
											...prev,
											companyName: e.target.value,
										}))
									}
									placeholder="e.g., Oceanview Resort"
								/>
							</div>
							<div>
								<Label htmlFor="contactName">Contact Person *</Label>
								<Input
									id="contactName"
									value={formData.contactName}
									onChange={(e) =>
										setFormData((prev) => ({
											...prev,
											contactName: e.target.value,
										}))
									}
									placeholder="Your full name"
								/>
							</div>
						</div>

						<div className="grid md:grid-cols-2 gap-4">
							<div>
								<Label htmlFor="email">Business Email *</Label>
								<Input
									id="email"
									type="email"
									value={formData.email}
									onChange={(e) =>
										setFormData((prev) => ({ ...prev, email: e.target.value }))
									}
									placeholder="contact@yourhotel.com"
								/>
							</div>
							<div>
								<Label htmlFor="phone">Phone Number</Label>
								<PhoneInput
									id="phone"
									defaultCountry="LK"
									international
									value={formData.phone}
									onChange={(value) =>
										setFormData((prev) => ({ ...prev, phone: value || "" }))
									}
									placeholder="Enter a phone number"
								/>
							</div>
						</div>

						<div>
							<Label htmlFor="address">Business Address</Label>
							<Textarea
								id="address"
								value={formData.address}
								onChange={(e) =>
									setFormData((prev) => ({ ...prev, address: e.target.value }))
								}
								placeholder="Street address, city, state/province, country"
								rows={3}
							/>
						</div>

						<div>
							<Label htmlFor="country">Country</Label>
							<Select
								value={formData.country}
								onValueChange={(value) =>
									setFormData((prev) => ({ ...prev, country: value }))
								}
							>
								<SelectTrigger>
									<SelectValue placeholder="Select your country" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="US">United States</SelectItem>
									<SelectItem value="CA">Canada</SelectItem>
									<SelectItem value="UK">United Kingdom</SelectItem>
									<SelectItem value="AU">Australia</SelectItem>
									<SelectItem value="LK">Sri Lanka</SelectItem>
									<SelectItem value="IN">India</SelectItem>
									<SelectItem value="TH">Thailand</SelectItem>
									<SelectItem value="MY">Malaysia</SelectItem>
									<SelectItem value="SG">Singapore</SelectItem>
									<SelectItem value="other">Other</SelectItem>
								</SelectContent>
							</Select>
						</div>
					</div>
				);

			case 2:
				return (
					<div className="space-y-6">
						<div className="text-center mb-8">
							<Hotel className="h-12 w-12 text-primary mx-auto mb-4" />
							<h2 className="text-lg sm:text-2xl font-bold mb-2">
								Property Information
							</h2>
							<p className="text-muted-foreground">
								Help us understand your property setup
							</p>
						</div>

						<div>
							<Label className="text-base font-medium mb-4 block">
								What type of property do you manage? *
							</Label>
							<div className="grid md:grid-cols-2 gap-4">
								{PROPERTY_TYPES.map((type) => (
									<div
										key={type.id}
										className={`p-4 border-2 rounded-lg cursor-pointer transition-all hover:border-primary/50 ${
											formData.propertyType === type.id
												? "border-primary bg-primary/5"
												: "border-border"
										}`}
										onClick={() =>
											setFormData((prev) => ({
												...prev,
												propertyType: type.id,
											}))
										}
									>
										<div className="flex items-start gap-3">
											<type.icon className="size-6 text-primary mt-1" />
											<div>
												<h3 className="font-medium">{type.label}</h3>
												<p className="text-sm text-muted-foreground">
													{type.description}
												</p>
											</div>
										</div>
									</div>
								))}
							</div>
						</div>

						<div className="grid md:grid-cols-2 gap-4">
							<div>
								<Label htmlFor="propertyCount">Number of Properties *</Label>
								<Select
									value={formData.propertyCount}
									onValueChange={(value) =>
										setFormData((prev) => ({ ...prev, propertyCount: value }))
									}
								>
									<SelectTrigger>
										<SelectValue placeholder="Select number" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="1">1 Property</SelectItem>
										<SelectItem value="2-5">2-5 Properties</SelectItem>
										<SelectItem value="6-10">6-10 Properties</SelectItem>
										<SelectItem value="11-25">11-25 Properties</SelectItem>
										<SelectItem value="25+">25+ Properties</SelectItem>
									</SelectContent>
								</Select>
							</div>
							<div>
								<Label htmlFor="totalRooms">Total Rooms/Units *</Label>
								<Select
									value={formData.totalRooms}
									onValueChange={(value) =>
										setFormData((prev) => ({ ...prev, totalRooms: value }))
									}
								>
									<SelectTrigger>
										<SelectValue placeholder="Select range" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="1-10">1-10 Rooms</SelectItem>
										<SelectItem value="11-25">11-25 Rooms</SelectItem>
										<SelectItem value="26-50">26-50 Rooms</SelectItem>
										<SelectItem value="51-100">51-100 Rooms</SelectItem>
										<SelectItem value="100+">100+ Rooms</SelectItem>
									</SelectContent>
								</Select>
							</div>
						</div>

						<div>
							<Label htmlFor="description">Brief Description</Label>
							<Textarea
								id="description"
								value={formData.description}
								onChange={(e) =>
									setFormData((prev) => ({
										...prev,
										description: e.target.value,
									}))
								}
								placeholder="Tell us about your property, target guests, special features..."
								rows={4}
							/>
						</div>
					</div>
				);

			case 3:
				return (
					<div className="space-y-6">
						<div className="text-center mb-8">
							<Zap className="h-12 w-12 text-primary mx-auto mb-4" />
							<h2 className="text-lg sm:text-2xl font-bold mb-2">
								Choose Your Features
							</h2>
							<p className="text-muted-foreground">
								Select the features you need to get started
							</p>
						</div>

						<div className="grid gap-4">
							{FEATURES.map((feature) => (
								<div
									key={feature.id}
									className={`p-4 border-2 rounded-lg transition-all ${
										formData.selectedFeatures.includes(feature.id)
											? "border-primary bg-primary/5"
											: "border-border hover:border-primary/50"
									} ${feature.essential ? "opacity-75" : "cursor-pointer"}`}
									onClick={() =>
										handleFeatureToggle(feature.id, feature.essential)
									}
								>
									<div className="flex items-start gap-4">
										<div className="flex items-center">
											<Checkbox
												checked={formData.selectedFeatures.includes(feature.id)}
												disabled={feature.essential}
												className="mt-1"
											/>
										</div>
										<feature.icon className="size-6 text-primary mt-1" />
										<div className="flex-1">
											<div className="flex items-center gap-2">
												<h3 className="font-medium">{feature.label}</h3>
												{feature.essential && (
													<Badge variant="secondary" className="text-xs">
														Essential
													</Badge>
												)}
											</div>
											<p className="text-sm text-muted-foreground">
												{feature.description}
											</p>
										</div>
									</div>
								</div>
							))}
						</div>

						<div className="grid md:grid-cols-2 gap-4">
							<div>
								<Label htmlFor="currency">Preferred Currency</Label>
								<Select
									value={formData.currency}
									onValueChange={(value) =>
										setFormData((prev) => ({ ...prev, currency: value }))
									}
								>
									<SelectTrigger>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="USD">USD - US Dollar</SelectItem>
										<SelectItem value="EUR">EUR - Euro</SelectItem>
										<SelectItem value="GBP">GBP - British Pound</SelectItem>
										<SelectItem value="LKR">LKR - Sri Lankan Rupee</SelectItem>
										<SelectItem value="INR">INR - Indian Rupee</SelectItem>
										<SelectItem value="THB">THB - Thai Baht</SelectItem>
									</SelectContent>
								</Select>
							</div>
						</div>
					</div>
				);

			case 4:
				return (
					<div className="space-y-6">
						<div className="text-center mb-8">
							<CreditCard className="h-12 w-12 text-primary mx-auto mb-4" />
							<h2 className="text-lg sm:text-2xl font-bold mb-2">
								Choose Your Plan
							</h2>
							<p className="text-muted-foreground">
								Start with a 7-day free trial, then choose the plan that fits
								your needs
							</p>
						</div>

						<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
							{Array.isArray(plans) ? (
								plans.map((plan) => (
									<Card
										key={plan.id}
										className={`cursor-pointer transition-all hover:shadow-md ${
											selectedPlanId === plan.id
												? "ring-0 ring-primary bg-primary/5"
												: "hover:border-primary/50"
										}`}
										onClick={() => handlePlanSelect(plan.id)}
									>
										<CardHeader className="text-center">
											<div className="flex items-center justify-center gap-2 mb-2">
												{plan.name.toLowerCase().includes("professional") && (
													<Crown className="h-5 w-5 text-yellow-500" />
												)}
												<CardTitle className="text-lg">{plan.name}</CardTitle>
											</div>
											<div className="text-2xl font-bold">
												${(plan.price_cents / 100).toFixed(0)}
												<span className="text-sm font-normal text-muted-foreground">
													/{plan.billing_interval}
												</span>
											</div>
											{plan.description && (
												<p className="text-sm text-muted-foreground">
													{plan.description}
												</p>
											)}
										</CardHeader>
										<CardContent className="space-y-3">
											{plan.feature_list &&
												Array.isArray(plan.feature_list) &&
												plan.feature_list.length > 0 && (
													<div className="space-y-2">
														{plan.feature_list.map((feature, index) => (
															<div
																key={index}
																className="flex items-center gap-2 text-sm"
															>
																<CheckCircle className="h-4 w-4 text-green-500" />
																{feature}
															</div>
														))}
													</div>
												)}
											{plan.max_locations && (
												<div className="flex items-center gap-2 text-sm">
													<Building2 className="h-4 w-4 text-blue-500" />
													Up to {plan.max_locations} locations
												</div>
											)}
											{plan.max_rooms && (
												<div className="flex items-center gap-2 text-sm">
													<Bed className="h-4 w-4 text-purple-500" />
													Up to {plan.max_rooms} rooms
												</div>
											)}
										</CardContent>
									</Card>
								))
							) : (
								<div className="col-span-full text-center text-muted-foreground">
									Loading plans...
								</div>
							)}
						</div>

						{selectedPlanId && (
							<div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
								<Button
									size="lg"
									variant="outline"
									onClick={handleStartTrial}
									disabled={processingPayment}
									className="flex items-center gap-2"
								>
									{processingPayment ? "Starting..." : "Start 7-Day Free Trial"}
									<Calendar className="h-4 w-4" />
								</Button>
								<Button
									size="lg"
									onClick={handlePayNow}
									disabled={processingPayment}
									className="flex items-center gap-2"
								>
									{processingPayment ? "Processing..." : "Pay Now & Save"}
									<CreditCard className="h-4 w-4" />
								</Button>
							</div>
						)}

						<div className="text-center text-sm text-muted-foreground">
							<p>✨ 7-day free trial • Cancel anytime • No hidden fees</p>
						</div>
					</div>
				);

			case 5:
				return (
					<div className="text-center space-y-6">
						<CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
						<h2 className="text-lg sm:text-3xl font-bold">
							You're All Set! 🎉
						</h2>
						<p className="text-lg text-muted-foreground max-w-md mx-auto">
							Welcome to Check In_Check Out! Your account has been configured
							based on your preferences.
						</p>

						<div className="bg-muted/30 rounded-lg p-6 text-left max-w-md mx-auto">
							<h3 className="font-medium mb-4">What's Next:</h3>
							<ul className="space-y-2 text-sm text-muted-foreground">
								<li className="flex items-center gap-2">
									<CheckCircle className="size-4 text-green-500" />
									Set up your first property
								</li>
								<li className="flex items-center gap-2">
									<CheckCircle className="size-4 text-green-500" />
									Configure room types and pricing
								</li>
								<li className="flex items-center gap-2">
									<CheckCircle className="size-4 text-green-500" />
									Start accepting bookings
								</li>
							</ul>
						</div>

						<Button
							size="lg"
							onClick={handleComplete}
							disabled={loading}
							className="w-full max-w-sm"
						>
							{loading ? "Setting up..." : "Enter Your Dashboard"}
							<ArrowRight className="size-5 ml-2" />
						</Button>
					</div>
				);

			default:
				return null;
		}
	};

	return (
		<div className="min-h-screen bg-background p-4">
			<div className="max-w-4xl mx-auto">
				{/* Progress Header */}
				<div className="text-center mb-8 pt-8">
					<div className="flex items-center justify-center gap-4 mb-4">
						{STEPS.map((step) => (
							<div key={step.id} className="flex items-center">
								<div
									className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
										currentStep >= step.id
											? "bg-primary text-primary-foreground border-primary"
											: "border-muted-foreground text-muted-foreground"
									}`}
								>
									{currentStep > step.id ? (
										<CheckCircle className="size-4" />
									) : (
										step.id
									)}
								</div>
								{step.id < STEPS.length && (
									<div
										className={`w-12 h-0.5 mx-2 ${
											currentStep > step.id
												? "bg-primary"
												: "bg-muted-foreground/30"
										}`}
									/>
								)}
							</div>
						))}
					</div>

					<Progress
						value={(currentStep / STEPS.length) * 100}
						className="w-full max-w-md mx-auto mb-2"
					/>
					<p className="text-sm text-muted-foreground">
						Step {currentStep} of {STEPS.length}:{" "}
						{STEPS[currentStep - 1]?.description}
					</p>
				</div>

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
				{currentStep < 5 && (
					<div className="flex justify-between items-center mt-6">
						<Button
							variant="outline"
							onClick={handlePrevious}
							disabled={currentStep === 1}
							className="flex items-center gap-2"
						>
							<ArrowLeft className="size-4" />
							Previous
						</Button>

						<Button
							onClick={handleNext}
							disabled={!validateStep()}
							className="flex items-center gap-2"
						>
							Next Step
							<ArrowRight className="size-4" />
						</Button>
					</div>
				)}
			</div>
		</div>
	);
}
