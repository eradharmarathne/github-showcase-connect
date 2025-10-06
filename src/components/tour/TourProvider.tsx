import React, { createContext, useContext, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { CustomTourOverlay } from "./CustomTourOverlay";
import { useToast } from "@/hooks/use-toast";

export interface TourStep {
	id: string;
	title: string;
	content: string;
	targetElement?: string;
	position?: "top" | "bottom" | "left" | "right";
	requiresNavigation?: string; // path to navigate to before showing step
	showSkip?: boolean;
	showBack?: boolean;
	showNext?: boolean;
	showFinish?: boolean;
	customButtons?: Array<{
		label: string;
		onClick: () => void;
		variant?: "default" | "outline" | "secondary" | "destructive" | "ghost";
	}>;
}

export interface PageTour {
	id: string;
	name: string;
	description: string;
	steps: TourStep[];
}

interface TourContextType {
	isActive: boolean;
	currentTour: PageTour | null;
	currentStepIndex: number;
	startTour: (tour: PageTour) => void;
	endTour: () => void;
	nextStep: () => void;
	previousStep: () => void;
	skipTour: () => void;
	completedTours: string[];
	markTourAsCompleted: (tourId: string) => void;
	hasCompletedTour: (tourId: string) => boolean;
}

const TourContext = createContext<TourContextType | undefined>(undefined);

export const useTour = (): TourContextType => {
	const context = useContext(TourContext);
	if (!context) {
		throw new Error("useTour must be used within a TourProvider");
	}
	return context;
};

interface TourProviderProps {
	children: React.ReactNode;
}

export const TourProvider: React.FC<TourProviderProps> = ({ children }) => {
	const [isActive, setIsActive] = useState(false);
	const [currentTour, setCurrentTour] = useState<PageTour | null>(null);
	const [currentStepIndex, setCurrentStepIndex] = useState(0);
	const [completedTours, setCompletedTours] = useState<string[]>([]);
	const [isNavigating, setIsNavigating] = useState(false);

	const navigate = useNavigate();
	const location = useLocation();
	const { toast } = useToast();

	// Load completed tours from localStorage
	useEffect(() => {
		const saved = localStorage.getItem("checkingcheckout-completed-tours");
		if (saved) {
			try {
				setCompletedTours(JSON.parse(saved));
			} catch (error) {
				console.warn("Failed to parse completed tours from localStorage");
			}
		}
	}, []);

	// Save completed tours to localStorage
	useEffect(() => {
		localStorage.setItem(
			"checkingcheckout-completed-tours",
			JSON.stringify(completedTours),
		);
	}, [completedTours]);

	// Handle navigation for steps that require it
	useEffect(() => {
		if (!isActive || !currentTour || isNavigating) return;

		const currentStep = currentTour.steps[currentStepIndex];
		if (currentStep?.requiresNavigation && location.pathname !== currentStep.requiresNavigation) {
			setIsNavigating(true);
			navigate(currentStep.requiresNavigation);
			
			// Wait for navigation to complete
			setTimeout(() => {
				setIsNavigating(false);
			}, 800);
		}
	}, [isActive, currentTour, currentStepIndex, location.pathname, navigate, isNavigating]);

	const startTour = (tour: PageTour) => {
		setCurrentTour(tour);
		setCurrentStepIndex(0);
		setIsActive(true);
		setIsNavigating(false);
		
		// Navigate to first step if needed
		const firstStep = tour.steps[0];
		if (firstStep?.requiresNavigation && location.pathname !== firstStep.requiresNavigation) {
			navigate(firstStep.requiresNavigation);
		}
	};

	const endTour = () => {
		setIsActive(false);
		setCurrentTour(null);
		setCurrentStepIndex(0);
		setIsNavigating(false);
	};

	const nextStep = () => {
		if (!currentTour) return;

		if (currentStepIndex < currentTour.steps.length - 1) {
			setCurrentStepIndex(currentStepIndex + 1);
		} else {
			// Tour completed
			markTourAsCompleted(currentTour.id);
			endTour();
			toast({
				title: "🎉 Tour Completed!",
				description: `You've completed the ${currentTour.name} tour.`,
			});
		}
	};

	const previousStep = () => {
		if (currentStepIndex > 0) {
			setCurrentStepIndex(currentStepIndex - 1);
		}
	};

	const skipTour = () => {
		if (currentTour) {
			endTour();
			toast({
				title: "Tour Skipped",
				description: `You can restart the ${currentTour.name} tour anytime.`,
				variant: "default",
			});
		}
	};

	const markTourAsCompleted = (tourId: string) => {
		setCompletedTours((prev) => {
			if (!prev.includes(tourId)) {
				return [...prev, tourId];
			}
			return prev;
		});
	};

	const hasCompletedTour = (tourId: string) => {
		return completedTours.includes(tourId);
	};

	const currentStep = currentTour?.steps[currentStepIndex] || null;

	return (
		<TourContext.Provider
			value={{
				isActive,
				currentTour,
				currentStepIndex,
				startTour,
				endTour,
				nextStep,
				previousStep,
				skipTour,
				completedTours,
				markTourAsCompleted,
				hasCompletedTour,
			}}
		>
			{children}
			
			{/* Tour Overlay */}
			<CustomTourOverlay
				isOpen={isActive && !isNavigating}
				step={currentStep}
				currentStepIndex={currentStepIndex}
				totalSteps={currentTour?.steps.length || 0}
				onNext={nextStep}
				onBack={previousStep}
				onSkip={skipTour}
				onFinish={() => {
					if (currentTour) {
						markTourAsCompleted(currentTour.id);
						endTour();
						toast({
							title: "🎉 Tour Completed!",
							description: `You've completed the ${currentTour.name} tour.`,
						});
					}
				}}
				onClose={endTour}
			/>
		</TourContext.Provider>
	);
};