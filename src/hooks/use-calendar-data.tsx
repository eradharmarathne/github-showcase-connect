import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useLocationContext } from "@/context/LocationContext";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";

type Location = Tables<"locations">;
type Room = Tables<"rooms">;
type Reservation = Tables<"reservations">;
type ExternalBooking = Tables<"external_bookings">;

interface PropertyMapping {
	locationId: string;
	locationName: string;
	channelProperties: string[];
}

interface UseCalendarDataReturn {
	locations: Location[];
	rooms: Room[];
	reservations: Reservation[];
	externalBookings: ExternalBooking[];
	propertyMappings: PropertyMapping[];
	loading: boolean;
	refetch: () => Promise<void>;
}

export const useCalendarData = (): UseCalendarDataReturn => {
	const [locations, setLocations] = useState<Location[]>([]);
	const [rooms, setRooms] = useState<Room[]>([]);
	const [reservations, setReservations] = useState<Reservation[]>([]);
	const [externalBookings, setExternalBookings] = useState<ExternalBooking[]>(
		[],
	);
	const [propertyMappings, setPropertyMappings] = useState<PropertyMapping[]>(
		[],
	);
	const [loading, setLoading] = useState(true);

	const { tenant } = useAuth();
	const { selectedLocation } = useLocationContext();

	const fetchData = useCallback(async () => {
		if (!tenant?.id) return;

		try {
			setLoading(true);

			// Fetch locations
			const locationsQuery = supabase
				.from("locations")
				.select("*")
				.eq("tenant_id", tenant.id)
				.eq("is_active", true);

			// Fetch rooms with location filtering
			const roomsQuery = !selectedLocation
				? supabase
						.from("rooms")
						.select("*")
						.eq("tenant_id", tenant.id)
						.eq("is_active", true)
				: supabase
						.from("rooms")
						.select("*")
						.eq("tenant_id", tenant.id)
						.eq("location_id", selectedLocation)
						.eq("is_active", true);

			// Fetch reservations with location filtering
			const reservationsQuery = !selectedLocation
				? supabase
						.from("reservations")
						.select("*")
						.eq("tenant_id", tenant.id)
						.order("check_in_date", { ascending: true })
				: supabase
						.from("reservations")
						.select("*")
						.eq("tenant_id", tenant.id)
						.eq("location_id", selectedLocation)
						.order("check_in_date", { ascending: true });

			// Fetch external bookings with location filtering
			// Note: external_bookings table doesn't have tenant_id column
			const externalBookingsQuery = !selectedLocation
				? supabase
						.from("external_bookings")
						.select("*")
						.order("check_in", { ascending: true })
				: supabase
						.from("external_bookings")
						.select("*")
						.eq("location_id", selectedLocation)
						.order("check_in", { ascending: true });

			const [roomsData, reservationsData, externalBookingsData, locationsData] =
				await Promise.all([
					roomsQuery,
					reservationsQuery,
					externalBookingsQuery,
					locationsQuery,
				]);

			// Check for errors in the responses
			if (roomsData.error) throw roomsData.error;
			if (reservationsData.error) throw reservationsData.error;
			if (externalBookingsData.error) throw externalBookingsData.error;
			if (locationsData.error) throw locationsData.error;

			// Fetch property mappings from database - simplified query
			const { data: mappingsData, error: mappingsError } = await supabase
				.from("channel_property_mappings")
				.select("*")
				.eq("is_active", true);

			if (mappingsError) throw mappingsError;

			// Transform mappings data into the format expected by the component
			const transformedMappings: PropertyMapping[] = [];
			if (mappingsData && locationsData.data) {
				const locationMap = locationsData.data.reduce(
					(acc, loc) => {
						acc[loc.id] = loc.name;
						return acc;
					},
					{} as Record<string, string>,
				);

				const groupedMappings = mappingsData.reduce(
					(acc, mapping: any) => {
						const locationId = mapping.location_id;
						if (!acc[locationId]) {
							acc[locationId] = {
								locationId,
								locationName: locationMap[locationId] || "Unknown Location",
								channelProperties: [],
							};
						}
						acc[locationId].channelProperties.push(
							mapping.channel_property_name,
						);
						return acc;
					},
					{} as Record<string, PropertyMapping>,
				);

				// Fill location names
				Object.values(groupedMappings).forEach((mapping) => {
					const location = locationsData.data?.find(
						(loc) => loc.id === mapping.locationId,
					);
					if (location) {
						mapping.locationName = location.name;
					}
				});

				transformedMappings.push(...Object.values(groupedMappings));
			}

			setLocations(locationsData.data || []);
			setRooms(roomsData.data || []);
			setReservations(reservationsData.data || []);
			setExternalBookings(externalBookingsData.data || []);
			setPropertyMappings(transformedMappings);
		} catch (error) {
			console.error("Error fetching calendar data:", error);
		} finally {
			setLoading(false);
		}
	}, [tenant?.id, selectedLocation]);

	useEffect(() => {
		fetchData();
	}, [fetchData]);

	return {
		locations,
		rooms,
		reservations,
		externalBookings,
		propertyMappings,
		loading,
		refetch: fetchData,
	};
};
