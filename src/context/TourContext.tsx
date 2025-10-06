import React, {
	createContext,
	ReactNode,
	useCallback,
	useContext,
	useState,
} from "react";
import { usePermissions } from "@/hooks/usePermissions";
import { useAuth } from "./AuthContext";

// Tour types for different sections of the app
export type TourType =
	| "dashboard"
	| "reservations"
	| "calendar"
	| "financial-reports"
	| "master-files"
	| "settings"
	| "booking-channels"
	| "first-time-user";

interface TourContextType {
	activeTour: TourType | null;
	startTour: (tourType: TourType) => void;
	endTour: () => void;
	isTourActive: boolean;
	hasCompletedTour: (tourType: TourType) => boolean;
	markTourAsCompleted: (tourType: TourType) => void;
}

const TourContext = createContext<TourContextType | undefined>(undefined);

interface TourProviderProps {
	children: ReactNode;
}

export const TourProvider: React.FC<TourProviderProps> = ({ children }) => {
	const [activeTour, setActiveTour] = useState<TourType | null>(null);
	const { user } = useAuth();
	const { hasPermission } = usePermissions();

	// Get completed tours from localStorage
	const getCompletedTours = useCallback((): Set<TourType> => {
		if (!user?.id) return new Set();
		const stored = localStorage.getItem(`shepherd-tours-completed-${user.id}`);
		return stored ? new Set(JSON.parse(stored)) : new Set();
	}, [user?.id]);

	const [completedTours, setCompletedTours] =
		useState<Set<TourType>>(getCompletedTours);

	const startTour = useCallback(
		(tourType: TourType) => {
			// Check permissions before starting certain tours
			const hasRequiredPermission = (tourType: TourType): boolean => {
				switch (tourType) {
					case "financial-reports":
						return hasPermission("access_reports");
					case "master-files":
						return hasPermission("access_master_files");
					case "booking-channels":
						return hasPermission("access_booking_channels");
					case "settings":
						return hasPermission("access_settings");
					default:
						return true; // No special permissions needed for other tours
				}
			};

			if (!hasRequiredPermission(tourType)) {
				console.warn(`User lacks permissions for tour: ${tourType}`);
				return;
			}

			setActiveTour(tourType);
		},
		[hasPermission],
	);

	const endTour = useCallback(() => {
		setActiveTour(null);
	}, []);

	const hasCompletedTour = useCallback(
		(tourType: TourType): boolean => {
			return completedTours.has(tourType);
		},
		[completedTours],
	);

	const markTourAsCompleted = useCallback(
		(tourType: TourType) => {
			if (!user?.id) return;

			const newCompletedTours = new Set(completedTours);
			newCompletedTours.add(tourType);
			setCompletedTours(newCompletedTours);

			// Persist to localStorage
			localStorage.setItem(
				`shepherd-tours-completed-${user.id}`,
				JSON.stringify(Array.from(newCompletedTours)),
			);
		},
		[completedTours, user?.id],
	);

	const value: TourContextType = {
		activeTour,
		startTour,
		endTour,
		isTourActive: activeTour !== null,
		hasCompletedTour,
		markTourAsCompleted,
	};

	return <TourContext.Provider value={value}>{children}</TourContext.Provider>;
};

export const useTour = (): TourContextType => {
	const context = useContext(TourContext);
	if (!context) {
		throw new Error("useTour must be used within a TourProvider");
	}
	return context;
};
