import { format } from "date-fns";
import {
	AlertCircle,
	Bed,
	Calendar,
	CheckCircle,
	Clock,
	DollarSign,
	Eye,
	Key,
	MapPin,
	RefreshCw,
	Settings as SettingsIcon,
	Users,
	Wifi,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLocationContext } from "@/context/location-context";
import { useTenant } from "@/hooks/use-tenant";
import { supabase } from "@/integrations/supabase/client";

// Helper functions
const getGuestName = (booking: ExternalBooking): string => {
	return booking.guest_name || booking.raw_data?.guest?.name || "Unknown Guest";
};

const getEmail = (booking: ExternalBooking): string | null => {
	return booking.raw_data?.guest?.email || null;
};

const formatDate = (dateString: string): string => {
	return format(new Date(dateString), "MMM dd");
};

const calculateNights = (checkIn: string, checkOut: string): number => {
	const start = new Date(checkIn);
	const end = new Date(checkOut);
	const diffTime = Math.abs(end.getTime() - start.getTime());
	return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

const formatPrice = (booking: ExternalBooking): string => {
	return `${booking.total_amount?.toLocaleString() || 0} ${booking.currency || "USD"}`;
};

const getPaymentInfo = (booking: ExternalBooking): any => {
	if (booking.source === "airbnb" && booking.raw_data?.pricing) {
		const pricing = booking.raw_data.pricing;
		return {
			type: "airbnb",
			basePrice: pricing.basePrice || 0,
			hostFee: pricing.hostFee || 0,
			payout: pricing.hostPayout || 0,
		};
	}
	return null;
};

interface ExternalBooking {
	id: string;
	external_id: string;
	property_id: string;
	source: string;
	guest_name: string;
	check_in: string;
	check_out: string;
	status: string;
	total_amount: number;
	currency: string;
	adults: number;
	children: number;
	room_name?: string;
	location_id?: string;
	location?: {
		name: string;
	};
	last_synced_at: string;
	raw_data?: any;
	mappedLocation?: Location | null;
}

interface Location {
	id: string;
	name: string;
	is_active: boolean;
}

interface PropertyMapping {
	locationId: string;
	locationName: string;
	channelProperties: string[];
}

interface SyncStats {
	totalBookings: number;
	recentSync: string | null;
	sourceBreakdown: Record<string, number>;
	statusBreakdown: Record<string, number>;
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
		Record<string, { url: string; source: string }>
	>({});

	const calculateStats = (bookings: ExternalBooking[]): SyncStats => {
		const sourceBreakdown: Record<string, number> = {};
		const statusBreakdown: Record<string, number> = {};
		let recentSync: string | null = null;

		bookings.forEach((booking) => {
			// Source breakdown
			sourceBreakdown[booking.source] =
				(sourceBreakdown[booking.source] || 0) + 1;

			// Status breakdown
			statusBreakdown[booking.status] =
				(statusBreakdown[booking.status] || 0) + 1;

			// Find most recent sync
			if (!recentSync || booking.last_synced_at > recentSync) {
				recentSync = booking.last_synced_at;
			}
		});

		return {
			totalBookings: bookings.length,
			recentSync,
			sourceBreakdown,
			statusBreakdown,
		};
	};

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
          location:locations(name)
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

			if (bookingsError) throw bookingsError;
			if (locationsError) throw locationsError;

			// Fetch property mappings from database - filtered by selected location
			const { data: mappingsData } = await supabase
				.from("channel_property_mappings")
				.select(`
          *,
          locations (id, name)
        `)
				.eq("tenant_id", tenant.id)
				.eq("location_id", selectedLocation)
				.eq("is_active", true);

			// Fetch iCal sync URLs - filtered by selected location
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
							mapping.channel_property_name,
						);
						return acc;
					},
					{} as Record<string, PropertyMapping>,
				);

				transformedMappings.push(...Object.values(groupedMappings));
			}

			setBookings(bookingsData || []);
			setLocations(locationsData || []);
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

		setSyncing(true);
		try {
			const response = await supabase.functions.invoke("fetch-beds24-bookings", {
				body: { tenant_id: tenant.id },
			});

			const responseData = response.data as {
				success?: boolean;
				error?: string;
				code?: string;
			};

			if (responseData?.code === "NO_MAPPINGS") {
				toast.error("Please configure Beds24 property mappings in the Settings tab first");
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
			const { data, error } = await supabase.functions.invoke(
				"channel-token-exchange",
				{
					body: { inviteCode },
				},
			);

			if (error) throw error;

			if (data && data.success) {
				toast.success(t("bookingChannels.messages.tokenExchangeSuccess"));
				toast.info(t("bookingChannels.messages.tokenExchangeInfo"));
				setSetupMode(false);
			} else {
				throw new Error(data.error || "Token exchange failed");
			}
		} catch (error: any) {
			console.error("Token exchange error:", error);
			toast.error(
				t("bookingChannels.messages.tokenExchangeError", {
					error: error.message || "Unknown error",
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
		if (booking.raw_data?.price) {
			return `${booking.raw_data.price.toLocaleString()} LKR`;
		}
		return `${booking.total_amount?.toLocaleString() || "0"} ${booking.currency}`;
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
			const { error } = await supabase
				.from("channel_property_mappings")
				.insert({
					tenant_id: tenant.id,
					location_id: locationId,
					channel_property_name: propertyName,
					channel: "beds24",
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
				is_active: true,
			});

			if (error) throw error;

			toast.success("iCal sync URL added successfully");

			// Clear input
			setIcalInputValues((prev) => ({
				...prev,
				[locationId]: { url: "", source: "ical" },
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

	// No need to filter bookings - they're already filtered by selectedLocation in the query
	const filteredBookings = bookings.map((booking) => {
		const mappedLocation = getLocationFromBooking(booking);
		return {
			...booking,
			mappedLocation: mappedLocation,
		};
	});

	if (loading) {
		return <BookingChannelsSkeleton />;
	}

	return (
		<div className="space-y-6 px-4 sm:px-6 md:px-8 pt-8">
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
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm md:text-base lg:text-lg font-medium">
							{t("bookingChannels.stats.totalBookings")}
						</CardTitle>
						<Calendar className="size-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-lg sm:text-2xl font-bold">
							{syncStats.totalBookings}
						</div>
						<p className="text-xs text-muted-foreground">
							{t("bookingChannels.stats.externalBookingsSynced")}
						</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm md:text-base lg:text-lg font-medium">
							{t("bookingChannels.stats.lastSync")}
						</CardTitle>
						<Clock className="size-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-lg sm:text-2xl font-bold">
							{syncStats.recentSync
								? format(new Date(syncStats.recentSync), "MMM dd")
								: t("bookingChannels.stats.never")}
						</div>
						<p className="text-xs text-muted-foreground">
							{syncStats.recentSync
								? format(new Date(syncStats.recentSync), "HH:mm")
								: t("bookingChannels.stats.noSyncYet")}
						</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm md:text-base lg:text-lg font-medium">
							{t("bookingChannels.stats.revenue")}
						</CardTitle>
						<DollarSign className="size-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-lg sm:text-2xl font-bold">
							$
							{bookings
								.reduce((sum, booking) => sum + (booking.total_amount || 0), 0)
								.toLocaleString()}
						</div>
						<p className="text-xs text-muted-foreground">
							{t("bookingChannels.stats.totalBookingValue")}
						</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm md:text-base lg:text-lg font-medium">
							{t("bookingChannels.stats.activeSources")}
						</CardTitle>
						<Wifi className="size-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-lg sm:text-2xl font-bold">
							{Object.keys(syncStats.sourceBreakdown).length}
						</div>
						<p className="text-xs text-muted-foreground">
							{t("bookingChannels.stats.bookingChannels")}
						</p>
					</CardContent>
				</Card>
			</div>

			{/* Main Content */}
			<Tabs defaultValue="bookings" className="space-y-4">
				<TabsList>
					<TabsTrigger value="bookings">
						{t("bookingChannels.tabs.bookings")}
					</TabsTrigger>
					<TabsTrigger value="analytics">
						{t("bookingChannels.tabs.analytics")}
					</TabsTrigger>
					<TabsTrigger value="settings">
						{t("bookingChannels.tabs.settings")}
					</TabsTrigger>
				</TabsList>

				<TabsContent value="bookings" className="space-y-4">
					{/* Bookings Table - filtered by selected location from AppSidebar */}
					<Card>
						<CardHeader>
							<CardTitle>{t("bookingChannels.bookingsTable.title")}</CardTitle>
							<CardDescription>
								{t("bookingChannels.bookingsTable.description")}
							</CardDescription>
						</CardHeader>
						<CardContent>
							<div className="overflow-x-auto">
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead>
												{t("bookingChannels.bookingsTable.headers.property")}
											</TableHead>
											<TableHead>
												{t("bookingChannels.bookingsTable.headers.location")}
											</TableHead>
											<TableHead>
												{t("bookingChannels.bookingsTable.headers.guest")}
											</TableHead>
											<TableHead>
												{t("bookingChannels.bookingsTable.headers.dates")}
											</TableHead>
											<TableHead>
												{t("bookingChannels.bookingsTable.headers.guests")}
											</TableHead>
											<TableHead>
												{t("bookingChannels.bookingsTable.headers.amount")}
											</TableHead>
											<TableHead>
												{t("bookingChannels.bookingsTable.headers.source")}
											</TableHead>
											<TableHead>
												{t("bookingChannels.bookingsTable.headers.status")}
											</TableHead>
											<TableHead>
												{t("bookingChannels.bookingsTable.headers.actions")}
											</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{filteredBookings.map((booking) => (
											<TableRow key={booking.id} className="hover:bg-muted/50">
												<TableCell className="font-medium">
													<div className="space-y-1">
														<div className="text-sm font-medium">
															{booking.room_name ||
																t(
																	"bookingChannels.bookingsTable.unknownProperty",
																)}
														</div>
														<div className="text-xs text-muted-foreground">
															ID: {booking.external_id}
														</div>
													</div>
												</TableCell>
												<TableCell>
													<div className="flex items-center gap-2">
														<MapPin className="size-4 text-muted-foreground" />
														<span className="text-sm">
															{booking.mappedLocation?.name || "Unmapped"}
														</span>
														{!booking.mappedLocation && (
															<Badge variant="secondary" className="text-xs">
																Needs Mapping
															</Badge>
														)}
													</div>
												</TableCell>
												<TableCell>
													<div className="space-y-1">
														<div className="font-medium text-sm">
															{getGuestName(booking)}
														</div>
														{getEmail(booking) && (
															<div className="text-xs text-muted-foreground">
																{getEmail(booking)}
															</div>
														)}
													</div>
												</TableCell>
												<TableCell>
													<div className="space-y-1">
														<div className="text-sm">
															{formatDate(booking.check_in)} -{" "}
															{formatDate(booking.check_out)}
														</div>
														<div className="text-xs text-muted-foreground">
															{calculateNights(
																booking.check_in,
																booking.check_out,
															)}{" "}
															nights
														</div>
													</div>
												</TableCell>
												<TableCell>
													<div className="flex items-center gap-1">
														<Users className="size-4 text-muted-foreground" />
														<span className="text-sm">
															{booking.adults + booking.children}
															<span className="text-xs text-muted-foreground ml-1">
																({booking.adults}A + {booking.children}C)
															</span>
														</span>
													</div>
												</TableCell>
												<TableCell>
													<div className="space-y-1">
														<div className="font-medium text-sm">
															{formatPrice(booking)}
														</div>
														{getPaymentInfo(booking) && (
															<div className="text-xs text-green-600">
																Payout: {getPaymentInfo(booking)?.payout} LKR
															</div>
														)}
													</div>
												</TableCell>
												<TableCell>
													<Badge className={getSourceColor(booking.source)}>
														{booking.source.replace("_", ".")}
													</Badge>
												</TableCell>
												<TableCell>
													<Badge className={getStatusColor(booking.status)}>
														{booking.status.replace("_", " ")}
													</Badge>
												</TableCell>
												<TableCell>
													<Button
														variant="ghost"
														size="sm"
														onClick={() => openBookingDetails(booking)}
													>
														<Eye className="size-4" />
													</Button>
												</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>

								{filteredBookings.length === 0 && (
									<div className="text-center py-8">
										<p className="text-muted-foreground">
											{t("bookingChannels.bookingsTable.noBookings")}
										</p>
										<Button
											onClick={syncChannelData}
											variant="outline"
											className="mt-4"
											disabled={syncing}
										>
											{syncing ? (
												<>
													<RefreshCw className="size-4 mr-2 animate-spin" />
													{t("bookingChannels.header.syncing")}
												</>
											) : (
												<>
													<RefreshCw className="size-4 mr-2" />
													{t("bookingChannels.header.syncNow")}
												</>
											)}
										</Button>
									</div>
								)}
							</div>
						</CardContent>
					</Card>
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
											Property
										</h4>
										<div className="mt-1">
											<p className="font-medium">
												{selectedBooking.room_name || "Unknown"}
											</p>
											<p className="text-sm text-muted-foreground">
												{selectedBooking.mappedLocation?.name ||
													"Unmapped Location"}
											</p>
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

				<TabsContent value="settings" className="space-y-6">
					{/* Property Mapping Section */}
					<div className="space-y-3">
						<div>
							<h3 className="text-lg font-semibold flex items-center gap-2">
								<SettingsIcon className="size-5" />
								 Property Mapping
							</h3>
							<p className="text-sm text-muted-foreground mt-1">
								Map your property name to this location
							</p>
						</div>

						{locations
							.filter((location) => location.id === selectedLocation)
							.map((location) => {
								const mapping = propertyMappings.find(
									(m) => m.locationName === location.name,
								);
								return (
									<div key={location.id} className="space-y-3">
										{mapping && mapping.channelProperties.length > 0 && (
											<div className="space-y-2">
												<Label className="text-sm font-medium">
													Mapped Properties:
												</Label>
												<div className="flex flex-wrap gap-2">
													{mapping.channelProperties.map((property, index) => (
														<Badge key={index} variant="outline" className="text-xs">
															{property}
														</Badge>
													))}
												</div>
											</div>
										)}
										<div className="flex flex-col sm:flex-row gap-2">
											<div className="flex-1">
												<Input
													id={`property-${location.id}`}
													placeholder="Enter property name"
													value={propertyInputValues[location.id] || ""}
													onChange={(e) =>
														setPropertyInputValues((prev) => ({
															...prev,
															[location.id]: e.target.value,
														}))
													}
												/>
											</div>
											<Button
												size="default"
												className="sm:w-auto"
												onClick={() => addPropertyMapping(location.id)}
											>
												Add Mapping
											</Button>
										</div>
									</div>
								);
							})}
					</div>

					{/* iCal Sync Section */}
					<div className="space-y-3">
						<div>
							<h3 className="text-lg font-semibold flex items-center gap-2">
								<Calendar className="size-5" />
								iCal Calendar Sync
							</h3>
							<p className="text-sm text-muted-foreground mt-1">
								Add external calendar URLs from booking platforms
							</p>
						</div>

						{locations
							.filter((location) => location.id === selectedLocation)
							.map((location) => {
								const locationSyncUrls = syncUrls.filter(
									(url) => url.location_id === location.id,
								);
								return (
									<div key={location.id} className="space-y-3">
										{/* Add New Sync URL Form */}
										<div className="flex flex-col sm:flex-row gap-2">
											<div className="flex-1">
												<Input
													id={`ical-url-${location.id}`}
													placeholder="https://ical.booking.com/..."
													value={icalInputValues[location.id]?.url || ""}
													onChange={(e) =>
														setIcalInputValues((prev) => ({
															...prev,
															[location.id]: {
																...prev[location.id],
																url: e.target.value,
															},
														}))
													}
												/>
											</div>
											<select
												id={`source-${location.id}`}
												className="h-10 px-3 rounded-md border border-input bg-background sm:w-32"
												value={icalInputValues[location.id]?.source || "ical"}
												onChange={(e) =>
													setIcalInputValues((prev) => ({
														...prev,
														[location.id]: {
															...prev[location.id],
															source: e.target.value,
														},
													}))
												}
											>
												<option value="ical">iCal</option>
												<option value="booking_com">Booking.com</option>
												<option value="airbnb">Airbnb</option>
												<option value="expedia">Expedia</option>
											</select>
											<Button
												size="default"
												className="sm:w-auto"
												onClick={() => addIcalSyncUrl(location.id)}
											>
												Add URL
											</Button>
										</div>

										{/* Display Existing Sync URLs */}
										{locationSyncUrls.length > 0 && (
											<div className="space-y-2">
												<Label className="text-sm font-medium">
													Active Sync URLs:
												</Label>
												<div className="space-y-2">
													{locationSyncUrls.map((syncUrl) => (
														<div
															key={syncUrl.id}
															className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-muted rounded-md"
														>
															<div className="flex-1 min-w-0">
																<div className="flex flex-wrap items-center gap-2 mb-1">
																	<Badge
																		className={getSourceColor(syncUrl.source)}
																	>
																		{syncUrl.source.replace("_", ".")}
																	</Badge>
																	{syncUrl.room_number && (
																		<Badge variant="outline" className="text-xs">
																			Room: {syncUrl.rooms?.room_number}
																		</Badge>
																	)}
																</div>
																<div className="text-xs text-muted-foreground truncate">
																	{syncUrl.ical_url}
																</div>
																{syncUrl.last_synced_at && (
																	<div className="text-xs text-muted-foreground mt-1">
																		Last synced:{" "}
																		{format(
																			new Date(syncUrl.last_synced_at),
																			"MMM dd, HH:mm",
																		)}
																	</div>
																)}
															</div>
															<div className="flex gap-2">
																<Button
																	size="sm"
																	variant="outline"
																	onClick={() => manualSyncIcal(syncUrl.id)}
																	disabled={syncing}
																>
																	<RefreshCw
																		className={`size-4 ${syncing ? "animate-spin" : ""}`}
																	/>
																</Button>
																<Button
																	size="sm"
																	variant="destructive"
																	onClick={() => deleteSyncUrl(syncUrl.id)}
																>
																	<AlertCircle className="size-4" />
																</Button>
															</div>
														</div>
													))}
												</div>
											</div>
										)}
									</div>
								);
							})}
					</div>

					{/* API Setup Section */}
					<div className="space-y-3 pt-4 border-t">
						<div>
							<h3 className="text-lg font-semibold flex items-center gap-2">
								<Key className="size-5" />
								API Configuration
							</h3>
							<p className="text-sm text-muted-foreground mt-1">
								Configure your booking channel API connection
							</p>
						</div>

						{!setupMode ? (
							<div className="text-center py-8">
								<div className="space-y-4">
									<div className="text-muted-foreground">
										API connection is already configured.
										{syncStats.recentSync ? (
											<span className="block mt-2">
												Last successful sync:{" "}
												{format(
													new Date(syncStats.recentSync),
													"MMM dd, yyyy HH:mm",
												)}
											</span>
										) : (
											<span className="block mt-2 text-yellow-600">
												No successful sync yet
											</span>
										)}
									</div>
									<Button
										variant="outline"
										onClick={() => setSetupMode(true)}
									>
										Reconfigure API
									</Button>
								</div>
							</div>
						) : (
							<div className="space-y-4">
								<div className="bg-amber-50 p-4 sm:p-6 rounded-lg border border-amber-200">
									<div className="flex items-start gap-3">
										<AlertCircle className="size-5 text-amber-600 mt-0.5" />
										<div className="space-y-2">
											<h4 className="text-sm md:text-base lg:text-lg font-medium text-amber-800">
												Setup Instructions
											</h4>
											<ol className="text-sm text-amber-700 space-y-1 ml-4 list-decimal">
												<li>Log into your booking channel account</li>
												<li>Go to Settings → Channel Manager → API</li>
												<li>Generate an invite code for this application</li>
												<li>
													Enter the invite code below to complete setup
												</li>
											</ol>
										</div>
									</div>
								</div>

								<div className="space-y-2">
									<Label htmlFor="inviteCode">Channel Invite Code</Label>
									<div className="flex flex-col sm:flex-row gap-2">
										<Input
											id="inviteCode"
											placeholder="Enter your booking channel invite code"
											disabled={exchangingToken}
											className="flex-1"
										/>
										<Button
											onClick={() => {
												const input = document.getElementById(
													"inviteCode",
												) as HTMLInputElement;
												if (input?.value) {
													exchangeInviteCode(input.value);
												}
											}}
											disabled={exchangingToken}
											className="sm:w-auto min-w-[100px]"
										>
											{exchangingToken ? (
												<>
													<RefreshCw className="size-4 mr-2 animate-spin" />
													Setup...
												</>
											) : (
												"Setup"
											)}
										</Button>
									</div>
								</div>

								<Button
									variant="ghost"
									onClick={() => setSetupMode(false)}
									className="w-full"
								>
									Cancel Setup
								</Button>
							</div>
						)}
					</div>
				</TabsContent>
			</Tabs>
		</div>
	);
}
