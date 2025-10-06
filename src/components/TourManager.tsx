import React, { useCallback, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router";
import Shepherd from "shepherd.js";
import { TourType, useTour } from "@/context/TourContext";
import { useToast } from "@/hooks/use-toast";
import { getTourSteps, tourTheme } from "@/lib/tourSteps";

interface TourManagerProps {
	children: React.ReactNode;
}

export const TourManager: React.FC<TourManagerProps> = ({ children }) => {
	const { activeTour, endTour, markTourAsCompleted } = useTour();
	const { toast } = useToast();
	const navigate = useNavigate();
	const location = useLocation();
	const tourInstanceRef = useRef<any | null>(null);

	// Define which page each tour should start on
	const getTourPage = useCallback((tourType: TourType): string => {
		switch (tourType) {
			case "dashboard":
				return "/dashboard";
			case "reservations":
				return "/reservations";
			case "financial-reports":
				return "/reports";
			case "calendar":
				return "/calendar";
			case "master-files":
				return "/master-files";
			case "booking-channels":
				return "/booking-channels";
			case "settings":
				return "/settings";
			case "first-time-user":
				return "/dashboard"; // Start first-time tour on dashboard
			default:
				return "/dashboard";
		}
	}, []);

	const startTourWithNavigation = useCallback(
		async (tourType: TourType) => {
			const requiredPage = getTourPage(tourType);

			// Navigate to the required page if not already there
			if (location.pathname !== requiredPage) {
				navigate(requiredPage);

				// Wait a bit for navigation and page rendering
				await new Promise((resolve) => setTimeout(resolve, 500));
			}

			// Wait a bit more for components to render
			await new Promise((resolve) => setTimeout(resolve, 300));

			// Get steps for the current tour
			const steps = getTourSteps(tourType);
			if (steps.length === 0) {
				console.warn(`No steps found for tour: ${tourType}`);
				endTour();
				return;
			}

			// Create new tour instance
			const tour = new Shepherd.Tour({
				...tourTheme,
				confirmCancel: true,
				confirmCancelMessage: "Are you sure you want to exit the tour?",
			});

			// Add steps to tour
			tour.addSteps(steps);

			// Handle tour completion
			tour.on("complete", () => {
				markTourAsCompleted(tourType);
				endTour();
				toast({
					title: "🎉 Tour Completed!",
					description:
						"Great job! You've completed the tour. You can restart it anytime from the help menu.",
				});
			});

			// Handle tour cancellation
			tour.on("cancel", () => {
				endTour();
				toast({
					title: "Tour Cancelled",
					description: "You can restart the tour anytime from the help menu.",
					variant: "default",
				});
			});

			// Handle individual step events for analytics (optional)
			tour.on("show", (event) => {
				console.log(`Tour step shown: ${event.step?.id} in tour: ${tourType}`);
			});

			// Start the tour
			tour.start();
			tourInstanceRef.current = tour;
		},
		[
			navigate,
			location.pathname,
			endTour,
			markTourAsCompleted,
			toast,
			getTourPage,
		],
	);

	useEffect(() => {
		if (!activeTour) {
			// Clean up any existing tour
			if (tourInstanceRef.current) {
				tourInstanceRef.current.complete();
				tourInstanceRef.current = null;
			}
			return;
		}

		startTourWithNavigation(activeTour);

		// Cleanup on unmount or tour change
		return () => {
			if (tourInstanceRef.current) {
				tourInstanceRef.current.complete();
				tourInstanceRef.current = null;
			}
		};
	}, [activeTour, startTourWithNavigation]);

	return <>{children}</>;
};

// Hook to easily start tours from components
export const useTourHelpers = () => {
	const { startTour, hasCompletedTour } = useTour();

	const startDashboardTour = () => startTour("dashboard");
	const startReservationsTour = () => startTour("reservations");
	const startFinancialReportsTour = () => startTour("financial-reports");
	const startFirstTimeUserTour = () => startTour("first-time-user");
	const startCalendarTour = () => startTour("calendar");
	const startMasterFilesTour = () => startTour("master-files");
	const startSettingsTour = () => startTour("settings");
	const startBookingChannelsTour = () => startTour("booking-channels");

	return {
		startDashboardTour,
		startReservationsTour,
		startFinancialReportsTour,
		startFirstTimeUserTour,
		startCalendarTour,
		startMasterFilesTour,
		startSettingsTour,
		startBookingChannelsTour,
		hasCompletedTour,
	};
};
