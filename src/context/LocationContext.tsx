import React, { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";

type Location = Tables<"locations">;

interface LocationContextType {
	selectedLocation: string;
	setSelectedLocation: (locationId: string) => void;
	locations: Location[];
	loading: boolean;
	getSelectedLocationData: () => Location | null;
	refetchLocations: () => Promise<void>;
}

const LocationContext = createContext<LocationContextType | undefined>(
	undefined,
);

export function LocationProvider({ children }: { children: React.ReactNode }) {
	const [selectedLocation, setSelectedLocation] = useState("");
	const [locations, setLocations] = useState<Location[]>([]);
	const [loading, setLoading] = useState(true);
	const { tenant } = useAuth();

	const fetchLocations = React.useCallback(async () => {
		if (!tenant?.id) {
			setLocations([]);
			setLoading(false);
			return;
		}

		try {
			const { data, error } = await supabase
				.from("locations")
				.select("*")
				.eq("tenant_id", tenant.id)
				.eq("is_active", true)
				.order("name");

			if (error) throw error;
			setLocations(data || []);
		} catch (error) {
			console.error("Error fetching locations:", error);
		} finally {
			setLoading(false);
		}
	}, [tenant?.id]);

	useEffect(() => {
		fetchLocations();
	}, [fetchLocations]);

	// Auto-select first location when locations are loaded
	useEffect(() => {
		if (locations.length > 0 && !selectedLocation) {
			setSelectedLocation(locations[0].id);
		}
	}, [locations, selectedLocation]);

	const getSelectedLocationData = () => {
		if (!selectedLocation) return null;
		return locations.find((loc) => loc.id === selectedLocation) || null;
	};

	return (
		<LocationContext.Provider
			value={{
				selectedLocation,
				setSelectedLocation,
				locations,
				loading,
				getSelectedLocationData,
				refetchLocations: fetchLocations,
			}}
		>
			{children}
		</LocationContext.Provider>
	);
}

export function useLocationContext() {
	const context = useContext(LocationContext);
	if (context === undefined) {
		throw new Error(
			"useLocationContext must be used within a LocationProvider",
		);
	}
	return context;
}
