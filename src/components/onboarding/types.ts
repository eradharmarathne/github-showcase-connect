import { Tables } from "@/integrations/supabase/types";

export type Plan = Tables<"plans">;

export interface OnboardingFormData {
	// Company Info
	companyName: string;
	contactName: string;
	email: string;
	phone: string;
	address: string;
	country: string;

	// Property Details
	propertyType: string;
	propertyCount: string;
	totalRooms: string;
	description: string;

	// Features
	selectedFeatures: string[];

	// User preferences
	currency: string;
	timezone: string;
}

export interface OnboardingStepProps {
	formData: OnboardingFormData;
	setFormData: React.Dispatch<React.SetStateAction<OnboardingFormData>>;
}

export interface PlanSelectionStepProps extends OnboardingStepProps {
	plans: Plan[];
	selectedPlanId: string | null;
	setSelectedPlanId: (planId: string | null) => void;
	processingPayment: boolean;
	onStartTrial: () => void;
	onPayNow: () => void;
}

export interface OnboardingProgressProps {
	currentStep: number;
	totalSteps: number;
}

export interface OnboardingNavigationProps {
	currentStep: number;
	totalSteps: number;
	onNext: () => void;
	onPrevious: () => void;
	canProceed: boolean;
}
