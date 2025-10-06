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
	const tourEventListenersRef = useRef<{
		handleClick: (e: Event) => void;
		handleKeyDown: (e: KeyboardEvent) => void;
	} | null>(null);

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

				// Wait for navigation and page rendering
				await new Promise((resolve) => setTimeout(resolve, 800));
			}

			// Wait for components to render and stabilize
			await new Promise((resolve) => setTimeout(resolve, 500));

			// Get steps for the current tour
			const steps = getTourSteps(tourType);
			if (steps.length === 0) {
				console.warn(`No steps found for tour: ${tourType}`);
				endTour();
				return;
			}

			// Wait for critical elements to be available
			const waitForElements = async () => {
				const elementsToWait = steps
					.filter(step => step.attachTo?.element)
					.map(step => step.attachTo!.element);
				
				const maxWaitTime = 3000; // 3 seconds max wait
				const checkInterval = 100; // Check every 100ms
				let waited = 0;
				
				while (waited < maxWaitTime) {
					const missingElements = elementsToWait.filter(selector => 
						!document.querySelector(selector)
					);
					
					if (missingElements.length === 0) {
						console.log('All tour elements are ready');
						break;
					}
					
					console.log(`Waiting for elements: ${missingElements.join(', ')}`);
					await new Promise(resolve => setTimeout(resolve, checkInterval));
					waited += checkInterval;
				}
			};

			await waitForElements();

			// Close any open modals, dialogs, or popups before starting tour
			const closeOpenModals = () => {
				// Close any open dialogs or modals
				const modals = document.querySelectorAll('[role="dialog"], .modal, .popover-content');
				modals.forEach(modal => {
					if (modal instanceof HTMLElement) {
						// Try to find and click close button
						const closeBtn = modal.querySelector('[aria-label="Close"], .close, [data-dismiss]');
						if (closeBtn instanceof HTMLElement) {
							closeBtn.click();
						} else {
							// Force hide if no close button found
							modal.style.display = 'none';
						}
					}
				});

				// Close any open dropdowns
				const dropdowns = document.querySelectorAll('.dropdown-menu[data-state="open"]');
				dropdowns.forEach(dropdown => {
					if (dropdown instanceof HTMLElement) {
						dropdown.style.display = 'none';
					}
				});

				// Press escape to close any remaining modals
				document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
			};

			closeOpenModals();
			// Wait a bit for modals to close
			await new Promise(resolve => setTimeout(resolve, 200));

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
				// Remove tour event listeners
				removeTourEventListeners();
				toast({
					title: "🎉 Tour Completed!",
					description:
						"Great job! You've completed the tour. You can restart it anytime from the help menu.",
				});
			});

			// Handle tour cancellation
			tour.on("cancel", () => {
				endTour();
				// Remove tour event listeners
				removeTourEventListeners();
				toast({
					title: "Tour Cancelled",
					description: "You can restart the tour anytime from the help menu.",
					variant: "default",
				});
			});

			// Add global event listeners to prevent interference during tours
			const addTourEventListeners = () => {
				// Prevent certain interactions that might interfere with tours
				const handleClick = (e: Event) => {
					const target = e.target as HTMLElement;
					// If clicking on a filter/modal trigger during tour, prevent it
					if (target.closest('[data-testid="report-filters"] button') && 
						document.querySelector('.shepherd-element')) {
						console.log('Preventing filter interaction during tour');
						e.preventDefault();
						e.stopPropagation();
					}
				};

				const handleKeyDown = (e: KeyboardEvent) => {
					// Close any popups if they appear during tour
					if (e.key === 'Escape' && document.querySelector('.shepherd-element')) {
						const modals = document.querySelectorAll('[role="dialog"]:not(.shepherd-element)');
						modals.forEach(modal => {
							if (modal instanceof HTMLElement) {
								modal.style.display = 'none';
							}
						});
					}
				};

				document.addEventListener('click', handleClick, { capture: true });
				document.addEventListener('keydown', handleKeyDown, { capture: true });

				// Store references for cleanup
				tourEventListenersRef.current = { handleClick, handleKeyDown };
			};

			const removeTourEventListeners = () => {
				if (tourEventListenersRef.current) {
					document.removeEventListener('click', tourEventListenersRef.current.handleClick, { capture: true });
					document.removeEventListener('keydown', tourEventListenersRef.current.handleKeyDown, { capture: true });
					tourEventListenersRef.current = null;
				}
			};

			addTourEventListeners();

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
			// Clean up event listeners
			if (tourEventListenersRef.current) {
				document.removeEventListener('click', tourEventListenersRef.current.handleClick, { capture: true });
				document.removeEventListener('keydown', tourEventListenersRef.current.handleKeyDown, { capture: true });
				tourEventListenersRef.current = null;
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
