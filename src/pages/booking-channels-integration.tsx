import { format } from "date-fns";
import { RefreshCw, Wifi } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
	BookingStatsCards,
	BookingsTable,
	RoomMappingsTab,
	SettingsTab,
} from "@/components/booking-channels";
import { BookingChannelsSkeleton } from "@/components/skeleton/booking-channels-skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLocationContext } from "@/context/location-context";
import { useTenant } from "@/hooks/use-tenant";
import { supabase } from "@/integrations/supabase/client";
import {
	calculateNights,
	calculateStats,
	formatDate,
	formatPrice,
	getEmail,
	getGuestName,
	getPaymentInfo,
	getSourceColor,
	getStatusColor,
} from "@/lib/booking-channels-utils";
import type {
	ExternalBooking,
	PropertyMapping,
	Room,
	SyncStats,
} from "@/types/booking-channels";

interface Location {
	id: string;
	name: string;
	is_active: boolean;
}

export default function BookingChannelsIntegration() {
	const { t } = useTranslation();
	const { selectedLocation } = useLocationContext();
	const { tenant } = useTenant();
	const [bookings, setBookings] = useState<ExternalBooking[]>([]);
	const [locations, setLocations] = useState<Location[]>([]);
	const [loading, setLoading] = useState(true);
	const [syncing, setSyncing] = useState(false);
	const [setupMode, setSetupMode] = useState(false);
	const [exchangingToken, setExchangingToken] = useState(false);
	const [selectedBooking, setSelectedBooking] =
		useState<ExternalBooking | null>(null);
	const [showBookingDialog, setShowBookingDialog] = useState(false);
	const [syncStats, setSyncStats] = useState<SyncStats>({
		totalBookings: 0,
		recentSync: null,
		sourceBreakdown: {},
		statusBreakdown: {},
	});
	const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
	const [propertyMappings, setPropertyMappings] = useState<PropertyMapping[]>(
		[],
	);
	const [propertyInputValues, setPropertyInputValues] = useState<
		Record<string, string>
	>({});
	const [syncUrls, setSyncUrls] = useState<any[]>([]);
	const [icalInputValues, setIcalInputValues] = useState<
		Record<string, { url: string; source: string; room_id: string | null }>
	>({});
	const [rooms, setRooms] = useState<Room[]>([]);

	const fetchData = async () => {
		if (!selectedLocation || !tenant?.id) {
			setLoading(false);
			return;
		}

		setLoading(true);
		try {
			// Fetch bookings with location data - filtered by selected location
			const { data: bookingsData, error: bookingsError } = await supabase
				.from("external_bookings")
				.select(`
          *,
          location:locations(name),
          room:rooms(id, room_number, room_type)
        `)
				.eq("tenant_id", tenant.id)
				.eq("location_id", selectedLocation)
				.order("check_in", { ascending: false });

			// Fetch locations for the current tenant (for property mappings display)
			const { data: locationsData, error: locationsError } = await supabase
				.from("locations")
				.select("*")
				.eq("tenant_id", tenant.id)
				.eq("is_active", true)
				.order("name");

			// Fetch rooms for the selected location
			const { data: roomsData, error: roomsError } = await supabase
				.from("rooms")
				.select("id, room_number, room_type")
				.eq("tenant_id", tenant.id)
				.eq("location_id", selectedLocation)
				.eq("is_active", true)
				.order("room_number");

			if (bookingsError) throw bookingsError;
			if (locationsError) throw locationsError;
			if (roomsError) throw roomsError;

			// Fetch property mappings from database - filtered by selected location
			const { data: mappingsData } = await supabase
				.from("beds24_property_mappings")
				.select(`
          *,
          locations (id, name)
        `)
				.eq("tenant_id", tenant.id)
				.eq("location_id", selectedLocation)
				.eq("is_active", true); // Fetch iCal sync URLs - filtered by selected location
			const { data: syncUrlsData } = await supabase
				.from("booking_sync_urls")
				.select(`
					*,
					locations (id, name),
					rooms (id, room_number)
				`)
				.eq("tenant_id", tenant.id)
				.eq("location_id", selectedLocation)
				.eq("is_active", true)
				.order("created_at", { ascending: false });

			// Transform mappings data into the format expected by the component
			const transformedMappings: PropertyMapping[] = [];
			if (mappingsData) {
				const groupedMappings = mappingsData.reduce(
					(acc, mapping) => {
						const locationId = mapping.location_id;
						if (!acc[locationId]) {
							acc[locationId] = {
								locationId,
								locationName: mapping.locations?.name || "",
								channelProperties: [],
							};
						}
						acc[locationId].channelProperties.push(
							mapping.beds24_property_name,
						);
						return acc;
					},
					{} as Record<string, PropertyMapping>,
				);
				transformedMappings.push(...Object.values(groupedMappings));
			}

			setBookings(bookingsData || []);
			setLocations(locationsData || []);
			setRooms(roomsData || []);
			setPropertyMappings(transformedMappings);
			setSyncUrls(syncUrlsData || []);

			// Calculate stats
			if (bookingsData) {
				const stats = calculateStats(bookingsData);
				setSyncStats(stats);
			}
		} catch (error) {
			console.error("Error fetching data:", error);
			toast.error(t("bookingChannels.messages.fetchError"));
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		const syncChannelData = async () => {
			if (!tenant?.id) {
				console.log("No tenant ID, skipping sync");
				return;
			}

			setSyncing(true);
			try {
				const response = await supabase.functions.invoke(
					"fetch-beds24-bookings",
					{
						body: { tenant_id: tenant.id },
					},
				);

				// Check for "NO_MAPPINGS" response (this is expected if not configured yet)
				const responseData = response.data as {
					success?: boolean;
					error?: string;
					code?: string;
				};

				if (responseData?.code === "NO_MAPPINGS") {
					console.info("ℹ️ No Beds24 property mappings configured yet");
					// Don't show error - this is expected on first load
				} else if (response.error) {
					console.error("Sync error:", response.error);
					toast.error("Failed to sync booking channel data");
				} else if (responseData?.success !== false) {
					// Successful sync - refresh the data
					fetchData();
				}
			} catch (error) {
				console.error("Error syncing booking channel data:", error);
				toast.error("Failed to sync booking channel data");
			} finally {
				setSyncing(false);
			}
		};

		fetchData();
		setLastSyncTime(new Date());

		// Auto-sync every hour
		const interval = setInterval(
			() => {
				syncChannelData();
			},
			60 * 60 * 1000,
		); // 1 hour in milliseconds

		return () => clearInterval(interval);
	}, [selectedLocation, tenant?.id]); // Re-fetch when location or tenant changes

	const syncChannelData = async () => {
		if (!tenant?.id) {
			toast.error("No tenant information available");
			return;
		}

		if (!selectedLocation) {
			toast.error("Please select a location first");
			return;
		}

		setSyncing(true);
		try {
			const response = await supabase.functions.invoke(
				"fetch-beds24-bookings",
				{
					body: {
						tenant_id: tenant.id,
						location_id: selectedLocation,
					},
				},
			);

			const responseData = response.data as {
				success?: boolean;
				error?: string;
				code?: string;
			};

			if (responseData?.code === "NO_CREDENTIALS") {
				toast.error(
					"Please connect your Beds24 account first in the Settings tab",
				);
			} else if (responseData?.code === "NO_MAPPINGS") {
				toast.error(
					"Please configure Beds24 property mappings in the Settings tab first",
				);
			} else if (response.error) {
				console.error("Sync error:", response.error);
				toast.error(t("bookingChannels.messages.syncError"));
			} else if (responseData?.success !== false) {
				toast.success(t("bookingChannels.messages.syncSuccess"));
				// Refresh the data after sync
				fetchData();
			}
		} catch (error) {
			console.error("Error syncing booking channel data:", error);
			toast.error(t("bookingChannels.messages.syncError"));
		} finally {
			setSyncing(false);
		}
	};

	const exchangeInviteCode = async (inviteCode: string) => {
		setExchangingToken(true);
		try {
			if (!selectedLocation) {
				throw new Error("Please select a location first");
			}

			if (!tenant?.id) {
				throw new Error("Tenant information not available");
			}

			const { data, error } = await supabase.functions.invoke(
				"beds24-token-exchange",
				{
					body: {
						inviteCode: inviteCode,
						locationId: selectedLocation,
						tenantId: tenant.id,
					},
				},
			);

			if (error) throw error;

			if (data && data.success) {
				toast.success(t("bookingChannels.messages.tokenExchangeSuccess"));
				toast.info(t("bookingChannels.messages.tokenExchangeInfo"));
				setSetupMode(false);
				// Refresh the data to show the new connection
				fetchData();
			} else {
				// Show detailed Beds24 error if available
				const errorMessage = data?.details
					? `Beds24 error: ${data.details}`
					: data?.error || "Token exchange failed";
				throw new Error(errorMessage);
			}
		} catch (error: any) {
			console.error("Token exchange error:", error);

			// Parse Beds24 API errors for better user feedback
			let userMessage = error.message || "Unknown error";
			if (userMessage.includes("Token not valid")) {
				userMessage =
					"Invalid or expired invite code. Please generate a new invite code in Beds24 and try again.";
			}

			toast.error(
				t("bookingChannels.messages.tokenExchangeError", {
					error: userMessage,
				}),
			);
		} finally {
			setExchangingToken(false);
		}
	};

	// Helper function to get location from booking based on property mappings
	const getLocationFromBooking = (
		booking: ExternalBooking,
	): Location | null => {
		// Special handling for "Room 609309" - force to first location that contains "rusty"
		if (booking.room_name && booking.room_name.includes("Room 609309")) {
			const rustyLocation = locations.find((loc) =>
				loc.name.toLowerCase().includes("rusty"),
			);
			if (rustyLocation) {
				return rustyLocation;
			}
		}

		// Check multiple possible property name fields from the raw_data
		const possiblePropertyNames = [
			booking.raw_data?.propertyName,
			booking.room_name,
			booking.raw_data?.roomName,
			booking.raw_data?.referer, // Check referer for Airbnb
		].filter(Boolean);

		for (const mapping of propertyMappings) {
			for (const propertyName of possiblePropertyNames) {
				if (
					propertyName &&
					mapping.channelProperties.some(
						(prop) =>
							propertyName.includes(prop) ||
							prop.includes(propertyName) ||
							prop === propertyName,
					)
				) {
					return locations.find((loc) => loc.id === mapping.locationId) || null;
				}
			}
		}
		// Fallback to existing location mapping
		if (booking.location) {
			return (
				locations.find((loc) => loc.name === booking.location?.name) || null
			);
		}

		return null;
	};

	// Helper functions for formatting
	const formatDate = (dateString: string) => {
		const date = new Date(dateString);
		return date.toLocaleDateString("en-US", {
			weekday: "short",
			day: "numeric",
			month: "short",
			year: "numeric",
		});
	};

	const calculateNights = (checkIn: string, checkOut: string) => {
		const nights = Math.ceil(
			(new Date(checkOut).getTime() - new Date(checkIn).getTime()) /
				(1000 * 60 * 60 * 24),
		);
		return nights;
	};

	const getGuestName = (booking: ExternalBooking) => {
		if (booking.raw_data?.firstName && booking.raw_data?.lastName) {
			return `${booking.raw_data.firstName} ${booking.raw_data.lastName}`;
		}
		return booking.guest_name || "Unknown Guest";
	};

	const getEmail = (booking: ExternalBooking) => {
		return booking.raw_data?.email || "";
	};

	const formatPrice = (booking: ExternalBooking) => {
		// Always use the currency from the database (fetched from property settings)
		// The raw_data.price field exists but doesn't include currency information
		const amount = booking.total_amount || booking.raw_data?.price || 0;
		const currency = booking.currency || "USD";
		return `${amount.toLocaleString()} ${currency}`;
	};

	const getPaymentInfo = (booking: ExternalBooking) => {
		if (!booking.raw_data) return null;

		const source = booking.raw_data.apiSource?.toLowerCase();

		if (source === "airbnb") {
			const price = booking.raw_data.price;
			const commission = booking.raw_data.commission;
			const expectedPayout = price - commission;

			return {
				type: "airbnb",
				basePrice: price,
				hostFee: commission,
				payout: expectedPayout,
			};
		}

		return null;
	};

	const getStatusColor = (status: string) => {
		switch (status.toLowerCase()) {
			case "confirmed":
				return "bg-green-50 text-green-700 border-green-200";
			case "new":
				return "bg-blue-50 text-blue-700 border-blue-200";
			case "pending":
				return "bg-yellow-50 text-yellow-700 border-yellow-200";
			case "cancelled":
				return "bg-red-50 text-red-700 border-red-200";
			case "checked_in":
				return "bg-purple-50 text-purple-700 border-purple-200";
			case "checked_out":
				return "bg-gray-50 text-gray-700 border-gray-200";
			default:
				return "bg-gray-50 text-gray-700 border-gray-200";
		}
	};

	const getSourceColor = (source: string) => {
		switch (source.toLowerCase()) {
			case "booking_com":
				return "bg-blue-100 text-blue-800 border-blue-200";
			case "airbnb":
				return "bg-pink-100 text-pink-800 border-pink-200";
			case "expedia":
				return "bg-yellow-100 text-yellow-800 border-yellow-200";
			default:
				return "bg-purple-100 text-purple-800 border-purple-200";
		}
	};

	const openBookingDetails = (booking: ExternalBooking) => {
		setSelectedBooking(booking);
		setShowBookingDialog(true);
	};

	const addPropertyMapping = async (locationId: string) => {
		const propertyName = propertyInputValues[locationId]?.trim();

		if (!propertyName) {
			toast.error("Please enter a property name");
			return;
		}

		if (!tenant?.id) {
			toast.error("Tenant not found");
			return;
		}

		try {
			const { error } = await supabase.from("beds24_property_mappings").insert({
				tenant_id: tenant.id,
				location_id: locationId,
				beds24_property_id: propertyName, // Using property name as ID for now
				beds24_property_name: propertyName,
				mapping_type: "villa", // Property-level mapping (villa or room)
				is_active: true,
			});

			if (error) throw error;
			toast.success("Property mapping added successfully");

			// Clear input
			setPropertyInputValues((prev) => ({
				...prev,
				[locationId]: "",
			}));

			// Refresh data
			fetchData();
		} catch (error: any) {
			console.error("Error adding property mapping:", error);
			toast.error(
				`Failed to add property mapping: ${error.message || "Unknown error"}`,
			);
		}
	};

	const addIcalSyncUrl = async (locationId: string) => {
		const icalData = icalInputValues[locationId];

		if (!icalData?.url?.trim()) {
			toast.error("Please enter an iCal URL");
			return;
		}

		if (!icalData?.room_id) {
			toast.error("Please select a room for this calendar URL");
			return;
		}

		if (!tenant?.id) {
			toast.error("Tenant not found");
			return;
		}

		// Validate URL format
		try {
			new URL(icalData.url);
		} catch {
			toast.error("Please enter a valid URL");
			return;
		}

		try {
			const { error } = await supabase.from("booking_sync_urls").insert({
				tenant_id: tenant.id,
				location_id: locationId,
				ical_url: icalData.url.trim(),
				source: icalData.source || "ical",
				room_id: icalData.room_id,
				is_active: true,
			});

			if (error) throw error;

			toast.success("iCal sync URL added successfully");

			// Clear input
			setIcalInputValues((prev) => ({
				...prev,
				[locationId]: { url: "", source: "ical", room_id: null },
			}));

			// Refresh data
			fetchData();
		} catch (error: any) {
			console.error("Error adding iCal sync URL:", error);
			toast.error(
				`Failed to add iCal sync URL: ${error.message || "Unknown error"}`,
			);
		}
	};

	const deleteSyncUrl = async (syncUrlId: string) => {
		if (!confirm("Are you sure you want to delete this sync URL?")) {
			return;
		}

		try {
			const { error } = await supabase
				.from("booking_sync_urls")
				.update({ is_active: false })
				.eq("id", syncUrlId);

			if (error) throw error;

			toast.success("Sync URL deleted successfully");
			fetchData();
		} catch (error: any) {
			console.error("Error deleting sync URL:", error);
			toast.error(
				`Failed to delete sync URL: ${error.message || "Unknown error"}`,
			);
		}
	};

	const manualSyncIcal = async (syncUrlId: string) => {
		setSyncing(true);
		try {
			const syncUrl = syncUrls.find((url) => url.id === syncUrlId);
			if (!syncUrl) {
				throw new Error("Sync URL not found");
			}

			const { data, error } = await supabase.functions.invoke("sync-ical", {
				body: {
					icalUrl: syncUrl.ical_url,
					locationId: syncUrl.location_id,
					source: syncUrl.source,
					tenantId: tenant?.id,
					propertyId: syncUrl.location_id,
					roomId: syncUrl.room_id,
				},
			});

			if (error) throw error;

			toast.success(
				`Successfully synced ${data.eventsCount || 0} bookings from ${syncUrl.source}`,
			);
			fetchData();
		} catch (error: any) {
			console.error("Error syncing iCal:", error);
			toast.error(`Failed to sync iCal: ${error.message || "Unknown error"}`);
		} finally {
			setSyncing(false);
		}
	};

	const updateBookingRoomMapping = async (
		bookingId: string,
		roomId: string | null,
	) => {
		try {
			const { error } = await supabase
				.from("external_bookings")
				.update({ room_id: roomId })
				.eq("id", bookingId);

			if (error) throw error;

			toast.success(t("bookingChannels.bookingsTable.roomMappedSuccess"));
			fetchData();
		} catch (error: any) {
			console.error("Error updating room mapping:", error);
			toast.error(t("bookingChannels.bookingsTable.roomMappingError"));
		}
	};

	console.log("Bookings:", bookings);
	console.log("Selected Location:", selectedLocation);

	// No need to filter bookings - they're already filtered by selectedLocation in the query
	const filteredBookings = bookings.map((booking) => {
		const mappedLocation = getLocationFromBooking(booking);
		console.log("Locations:", mappedLocation);
		return {
			...booking,
			mappedLocation: mappedLocation,
		};
	});

	if (loading) {
		return <BookingChannelsSkeleton />;
	}

	return (
		<div className="space-y-6 px-4 sm:px-6 md:px-8 pt-8 pb-20 sm:pb-0">
			{/* Header */}
			<div className="flex items-center gap-2">
				<Button
					onClick={syncChannelData}
					disabled={syncing}
					className="bg-primary hover:bg-primary/90"
				>
					{syncing ? (
						<>
							<RefreshCw className="size-4 mr-2 animate-spin" />
							{t("bookingChannels.header.syncing")}
						</>
					) : (
						<>
							<Wifi className="size-4 mr-2" />
							{t("bookingChannels.header.syncNow")}
						</>
					)}
				</Button>
				<div className="text-xs text-muted-foreground">
					{t("bookingChannels.header.autoSyncNote")}
					{lastSyncTime && (
						<div>
							{t("bookingChannels.header.lastSync", {
								date: format(lastSyncTime, "MMM dd, HH:mm"),
							})}
						</div>
					)}
				</div>
			</div>

			{/* Stats Cards */}
			<BookingStatsCards
				syncStats={syncStats}
				lastSyncTime={lastSyncTime}
			/>

			{/* Main Content */}
			<Tabs defaultValue="bookings" className="space-y-4">
				<TabsList>
					<TabsTrigger value="bookings">
						{t("bookingChannels.tabs.bookings")}
					</TabsTrigger>
					<TabsTrigger value="analytics">
						{t("bookingChannels.tabs.analytics")}
					</TabsTrigger>
					<TabsTrigger value="room-mappings">Room Mappings</TabsTrigger>
					<TabsTrigger value="settings">
						{t("bookingChannels.tabs.settings")}
					</TabsTrigger>
				</TabsList>

				<TabsContent value="bookings" className="space-y-4">
					{/* Bookings Table - filtered by selected location from AppSidebar */}
					<BookingsTable
						bookings={filteredBookings}
						rooms={rooms}
						syncing={syncing}
						onViewDetails={openBookingDetails}
						onUpdateRoomMapping={updateBookingRoomMapping}
						onSync={syncChannelData}
					/>
				</TabsContent>

				{/* Booking Details Dialog */}
				<Dialog open={showBookingDialog} onOpenChange={setShowBookingDialog}>
					<DialogContent className="max-w-2xl">
						<DialogHeader>
							<DialogTitle>Booking Details</DialogTitle>
						</DialogHeader>
						{selectedBooking && (
							<div className="space-y-4">
								<div className="grid grid-cols-2 gap-4">
									<div>
										<h4 className="text-sm md:text-base lg:text-lg font-medium text-muted-foreground">
											Guest Details
										</h4>
										<div className="mt-1">
											<p className="font-medium">
												{getGuestName(selectedBooking)}
											</p>
											{getEmail(selectedBooking) && (
												<p className="text-sm text-muted-foreground">
													{getEmail(selectedBooking)}
												</p>
											)}
										</div>
									</div>
									<div>
										<h4 className="text-sm md:text-base lg:text-lg font-medium text-muted-foreground">
											{t("bookingChannels.bookingDialog.propertyRoom")}
										</h4>
										<div className="mt-1">
											<p className="font-medium">
												{selectedBooking.room_id && selectedBooking.room
													? `${selectedBooking.room.room_number} - ${selectedBooking.room.room_type}`
													: selectedBooking.room_name ||
														t("bookingChannels.bookingDialog.unknownProperty")}
											</p>
											<p className="text-sm text-muted-foreground">
												{selectedBooking.mappedLocation?.name ||
													selectedBooking.location?.name ||
													t("bookingChannels.bookingDialog.unmappedLocation")}
											</p>
											{!selectedBooking.room_id && (
												<Badge variant="secondary" className="text-xs mt-1">
													{t("bookingChannels.bookingDialog.notMappedToRoom")}
												</Badge>
											)}
										</div>
									</div>
								</div>

								<div className="grid grid-cols-2 gap-4">
									<div>
										<h4 className="text-sm md:text-base lg:text-lg font-medium text-muted-foreground">
											Check-in / Check-out
										</h4>
										<div className="mt-1">
											<p className="font-medium">
												{formatDate(selectedBooking.check_in)} -{" "}
												{formatDate(selectedBooking.check_out)}
											</p>
											<p className="text-sm text-muted-foreground">
												{calculateNights(
													selectedBooking.check_in,
													selectedBooking.check_out,
												)}{" "}
												nights
											</p>
										</div>
									</div>
									<div>
										<h4 className="text-sm md:text-base lg:text-lg font-medium text-muted-foreground">
											Guests
										</h4>
										<div className="mt-1">
											<p className="font-medium">
												{selectedBooking.adults + selectedBooking.children}{" "}
												total
											</p>
											<p className="text-sm text-muted-foreground">
												{selectedBooking.adults} adults,{" "}
												{selectedBooking.children} children
											</p>
										</div>
									</div>
								</div>

								<div className="grid grid-cols-2 gap-4">
									<div>
										<h4 className="text-sm md:text-base lg:text-lg font-medium text-muted-foreground">
											Source & Status
										</h4>
										<div className="mt-1 flex gap-2">
											<Badge className={getSourceColor(selectedBooking.source)}>
												{selectedBooking.source.replace("_", ".")}
											</Badge>
											<Badge className={getStatusColor(selectedBooking.status)}>
												{selectedBooking.status.replace("_", " ")}
											</Badge>
										</div>
									</div>
									<div>
										<h4 className="text-sm md:text-base lg:text-lg font-medium text-muted-foreground">
											Amount
										</h4>
										<div className="mt-1">
											<p className="font-medium">
												{formatPrice(selectedBooking)}
											</p>
											{getPaymentInfo(selectedBooking) && (
												<p className="text-sm text-green-600">
													Expected Payout:{" "}
													{getPaymentInfo(selectedBooking)?.payout} LKR
												</p>
											)}
										</div>
									</div>
								</div>

								{getPaymentInfo(selectedBooking)?.type === "airbnb" && (
									<div>
										<h4 className="text-sm md:text-base lg:text-lg font-medium text-muted-foreground mb-2">
											Payment Breakdown
										</h4>
										<div className="bg-gray-50 p-3 rounded-lg space-y-1 text-sm">
											<div className="flex justify-between">
												<span>Base Price:</span>
												<span>
													{getPaymentInfo(selectedBooking)?.basePrice} LKR
												</span>
											</div>
											<div className="flex justify-between text-red-600">
												<span>Host Fee:</span>
												<span>
													-{getPaymentInfo(selectedBooking)?.hostFee} LKR
												</span>
											</div>
											<div className="border-t pt-1 flex justify-between font-medium text-green-600">
												<span>Expected Payout:</span>
												<span>
													{getPaymentInfo(selectedBooking)?.payout} LKR
												</span>
											</div>
										</div>
									</div>
								)}

								<div>
									<h4 className="text-sm md:text-base lg:text-lg font-medium text-muted-foreground mb-2">
										Booking Details
									</h4>
									<div className="bg-gray-50 p-3 rounded-lg space-y-1 text-sm">
										<div className="flex justify-between">
											<span>External ID:</span>
											<span className="font-mono">
												{selectedBooking.external_id}
											</span>
										</div>
										<div className="flex justify-between">
											<span>Property ID:</span>
											<span className="font-mono">
												{selectedBooking.property_id}
											</span>
										</div>
										{selectedBooking.last_synced_at && (
											<div className="flex justify-between">
												<span>Last Synced:</span>
												<span>
													{format(
														new Date(selectedBooking.last_synced_at),
														"MMM dd, yyyy HH:mm",
													)}
												</span>
											</div>
										)}
									</div>
								</div>
							</div>
						)}
					</DialogContent>
				</Dialog>

				<TabsContent value="analytics" className="space-y-4">
					<Card>
						<CardHeader>
							<CardTitle>Booking Analytics</CardTitle>
							<CardDescription>
								Insights and trends from your external bookings
							</CardDescription>
						</CardHeader>
						<CardContent>
							<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
								<div>
									<h4 className="text-sm md:text-base lg:text-lg font-medium text-muted-foreground mb-3">
										Source Breakdown
									</h4>
									<div className="space-y-2">
										{Object.entries(syncStats.sourceBreakdown).map(
											([source, count]) => (
												<div
													key={source}
													className="flex items-center justify-between"
												>
													<div className="flex items-center gap-2">
														<Badge className={getSourceColor(source)}>
															{source.replace("_", ".")}
														</Badge>
													</div>
													<span className="text-sm font-medium">
														{count} bookings
													</span>
												</div>
											),
										)}
									</div>
								</div>

								<div>
									<h4 className="text-sm md:text-base lg:text-lg font-medium text-muted-foreground mb-3">
										Status Breakdown
									</h4>
									<div className="space-y-2">
										{Object.entries(syncStats.statusBreakdown).map(
											([status, count]) => (
												<div
													key={status}
													className="flex items-center justify-between"
												>
													<div className="flex items-center gap-2">
														<Badge className={getStatusColor(status)}>
															{status.replace("_", " ")}
														</Badge>
													</div>
													<span className="text-sm font-medium">
														{count} bookings
													</span>
												</div>
											),
										)}
									</div>
								</div>
							</div>
						</CardContent>
					</Card>
				</TabsContent>

				<TabsContent value="room-mappings" className="space-y-6">
					<RoomMappingsTab locationId={selectedLocation || null} />
				</TabsContent>

			<TabsContent value="settings" className="space-y-6">
				<SettingsTab
					locations={locations}
					selectedLocation={selectedLocation}
					propertyMappings={propertyMappings}
					propertyInputValues={propertyInputValues}
					setPropertyInputValues={setPropertyInputValues}
					addPropertyMapping={addPropertyMapping}
					syncUrls={syncUrls}
					icalInputValues={icalInputValues}
					setIcalInputValues={setIcalInputValues}
					rooms={rooms}
					addIcalSyncUrl={addIcalSyncUrl}
					deleteSyncUrl={deleteSyncUrl}
					manualSyncIcal={manualSyncIcal}
					syncing={syncing}
					setupMode={setupMode}
					setSetupMode={setSetupMode}
					syncStats={syncStats}
					exchangingToken={exchangingToken}
					exchangeInviteCode={exchangeInviteCode}
					getSourceColor={getSourceColor}
				/>
			</TabsContent>
			</Tabs>
		</div>
	);
}
