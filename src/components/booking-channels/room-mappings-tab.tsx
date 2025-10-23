import { useState } from "react";
import {
	RefreshCw,
	Save,
	AlertCircle,
	CheckCircle,
	Link2,
	Download,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Table,
	TableBody,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useLocationContext } from "@/context/location-context";
import { useTenant } from "@/hooks/use-tenant";
import { RoomMappingRow } from "./room-mapping-row";

interface Beds24Room {
	id: number;
	name: string;
	propertyId: number;
	propertyName: string;
	maxOccupancy?: number;
	description?: string;
	mappingStatus: "mapped" | "unmapped";
	currentMapping?: {
		room_id: string;
		room_number: string;
		room_type: string;
	};
	suggestions?: Array<{
		room_id: string;
		room_number: string;
		room_type: string;
		similarity: number;
	}>;
}

interface Room {
	id: string;
	room_number: string;
	room_type: string;
}

interface RoomMappingsTabProps {
	locationId: string | null;
}

export function RoomMappingsTab({ locationId }: RoomMappingsTabProps) {
	const { tenant } = useTenant();
	const [beds24Rooms, setBeds24Rooms] = useState<Beds24Room[]>([]);
	const [availableRooms, setAvailableRooms] = useState<Room[]>([]);
	const [loading, setLoading] = useState(false);
	const [saving, setSaving] = useState(false);
	const [pendingMappings, setPendingMappings] = useState<
		Map<number, string | null>
	>(new Map());

	const fetchBeds24Rooms = async () => {
		if (!tenant?.id || !locationId) {
			toast.error("Please select a location first");
			return;
		}

		setLoading(true);
		try {
			// Call the Edge Function to fetch Beds24 rooms
			const { data, error } = await supabase.functions.invoke(
				"fetch-beds24-rooms",
				{
					body: { tenantId: tenant.id, locationId },
				},
			);

			if (error) throw error;

			if (!data?.rooms || data.rooms.length === 0) {
				toast.info("No Beds24 rooms found. Please configure Beds24 integration first.");
				return;
			}

			setBeds24Rooms(data.rooms);
			setAvailableRooms(data.availableRooms || []);

			const mappedCount = data.rooms.filter(
				(r: Beds24Room) => r.mappingStatus === "mapped",
			).length;
			const unmappedCount = data.rooms.length - mappedCount;

			toast.success(
				`Loaded ${data.rooms.length} Beds24 rooms (${mappedCount} mapped, ${unmappedCount} unmapped)`,
			);
		} catch (error) {
			console.error("Error fetching Beds24 rooms:", error);
			toast.error("Failed to fetch Beds24 rooms. Please check your integration.");
		} finally {
			setLoading(false);
		}
	};

	const handleMappingChange = (beds24RoomId: number, ccoRoomId: string | null) => {
		setPendingMappings((prev) => {
			const newMap = new Map(prev);
			newMap.set(beds24RoomId, ccoRoomId);
			return newMap;
		});
	};

	const saveMappings = async () => {
		if (pendingMappings.size === 0) {
			toast.info("No changes to save");
			return;
		}

		if (!tenant?.id || !locationId) {
			toast.error("Missing tenant or location information");
			return;
		}

		setSaving(true);
		try {
			const mappingsToUpsert = Array.from(pendingMappings.entries())
				.filter(([_, roomId]) => roomId !== null)
				.map(([beds24RoomId, roomId]) => ({
					tenant_id: tenant.id,
					location_id: locationId,
					channel: "beds24" as const,
					channel_room_id: beds24RoomId.toString(),
					room_id: roomId as string,
					is_active: true,
				}));

			const mappingsToDeactivate = Array.from(pendingMappings.entries())
				.filter(([_, roomId]) => roomId === null)
				.map(([beds24RoomId]) => beds24RoomId.toString());

			// Upsert active mappings
			if (mappingsToUpsert.length > 0) {
				const { error: upsertError } = await supabase
					.from("channel_room_mappings")
					.upsert(mappingsToUpsert, {
						onConflict: "tenant_id,channel,channel_room_id",
					});

				if (upsertError) throw upsertError;
			}

			// Deactivate removed mappings
			if (mappingsToDeactivate.length > 0) {
				const { error: deactivateError } = await supabase
					.from("channel_room_mappings")
					.update({ is_active: false })
					.eq("tenant_id", tenant.id)
					.eq("channel", "beds24")
					.in("channel_room_id", mappingsToDeactivate);

				if (deactivateError) throw deactivateError;
			}

			toast.success(
				`Successfully saved ${mappingsToUpsert.length} room mappings`,
			);
			setPendingMappings(new Map());

			// Refresh the room list to show updated mappings
			await fetchBeds24Rooms();
		} catch (error) {
			console.error("Error saving room mappings:", error);
			toast.error("Failed to save room mappings");
		} finally {
			setSaving(false);
		}
	};

	const stats = {
		total: beds24Rooms.length,
		mapped: beds24Rooms.filter((r) => r.mappingStatus === "mapped").length,
		unmapped: beds24Rooms.filter((r) => r.mappingStatus === "unmapped").length,
		highConfidenceSuggestions: beds24Rooms.filter(
			(r) =>
				r.suggestions &&
				r.suggestions.length > 0 &&
				r.suggestions[0].similarity >= 0.6,
		).length,
	};

	return (
		<div className="space-y-6">
			{/* Info Banner */}
			<Card className="bg-blue-50 border-blue-200">
				<CardContent className="pt-6">
					<div className="flex items-start gap-3">
						<Link2 className="size-5 text-blue-600 mt-0.5 flex-shrink-0" />
						<div className="space-y-2">
							<h4 className="text-sm font-medium text-blue-900">
								Automatic Room Mapping
							</h4>
							<p className="text-sm text-blue-700">
								Map your Beds24 rooms to CheckingCheckout rooms for automatic
								booking assignment. The system will suggest mappings based on
								room names. Once configured, all future bookings from Beds24
								will automatically assign to the correct rooms.
							</p>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Stats Cards */}
			{beds24Rooms.length > 0 && (
				<div className="grid grid-cols-1 md:grid-cols-4 gap-4">
					<Card>
						<CardContent className="pt-6">
							<div className="text-center">
								<div className="text-2xl font-bold">{stats.total}</div>
								<p className="text-xs text-muted-foreground">Total Rooms</p>
							</div>
						</CardContent>
					</Card>
					<Card>
						<CardContent className="pt-6">
							<div className="text-center">
								<div className="text-2xl font-bold text-green-600">
									{stats.mapped}
								</div>
								<p className="text-xs text-muted-foreground">Mapped</p>
							</div>
						</CardContent>
					</Card>
					<Card>
						<CardContent className="pt-6">
							<div className="text-center">
								<div className="text-2xl font-bold text-yellow-600">
									{stats.unmapped}
								</div>
								<p className="text-xs text-muted-foreground">Unmapped</p>
							</div>
						</CardContent>
					</Card>
					<Card>
						<CardContent className="pt-6">
							<div className="text-center">
								<div className="text-2xl font-bold text-blue-600">
									{stats.highConfidenceSuggestions}
								</div>
								<p className="text-xs text-muted-foreground">
									Smart Suggestions
								</p>
							</div>
						</CardContent>
					</Card>
				</div>
			)}

			{/* Room Mappings Table */}
			<Card>
				<CardHeader>
					<div className="flex items-center justify-between">
						<div>
							<CardTitle>Beds24 Room Mappings</CardTitle>
							<CardDescription>
								Map Beds24 rooms to your CheckingCheckout rooms
							</CardDescription>
						</div>
						<div className="flex gap-2">
							<Button
								variant="outline"
								size="sm"
								onClick={fetchBeds24Rooms}
								disabled={loading || !locationId}
							>
								{loading ? (
									<>
										<RefreshCw className="size-4 mr-2 animate-spin" />
										Loading...
									</>
								) : (
									<>
										<Download className="size-4 mr-2" />
										Fetch Rooms
									</>
								)}
							</Button>
							{beds24Rooms.length > 0 && (
								<Button
									size="sm"
									onClick={saveMappings}
									disabled={saving || pendingMappings.size === 0}
								>
									{saving ? (
										<>
											<RefreshCw className="size-4 mr-2 animate-spin" />
											Saving...
										</>
									) : (
										<>
											<Save className="size-4 mr-2" />
											Save Mappings ({pendingMappings.size})
										</>
									)}
								</Button>
							)}
						</div>
					</div>
				</CardHeader>
				<CardContent>
					{!locationId ? (
						<div className="text-center py-12 text-muted-foreground">
							<AlertCircle className="size-12 mx-auto mb-4 opacity-50" />
							<p>Please select a location from the sidebar to view room mappings</p>
						</div>
					) : beds24Rooms.length === 0 ? (
						<div className="text-center py-12 text-muted-foreground">
							<Link2 className="size-12 mx-auto mb-4 opacity-50" />
							<p className="mb-4">
								No Beds24 rooms loaded yet. Click "Fetch Rooms" to get started.
							</p>
							<Button
								variant="outline"
								onClick={fetchBeds24Rooms}
								disabled={loading}
							>
								{loading ? (
									<>
										<RefreshCw className="size-4 mr-2 animate-spin" />
										Loading...
									</>
								) : (
									<>
										<Download className="size-4 mr-2" />
										Fetch Beds24 Rooms
									</>
								)}
							</Button>
						</div>
					) : (
						<div className="overflow-x-auto">
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Beds24 Room</TableHead>
										<TableHead>Property</TableHead>
										<TableHead>Status</TableHead>
										<TableHead>Auto-Match Suggestion</TableHead>
										<TableHead>Map to CheckingCheckout Room</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{beds24Rooms.map((room) => (
										<RoomMappingRow
											key={room.id}
											beds24Room={room}
											availableRooms={availableRooms}
											onMappingChange={handleMappingChange}
										/>
									))}
								</TableBody>
							</Table>
						</div>
					)}
				</CardContent>
			</Card>

			{/* Success Tips */}
			{beds24Rooms.length > 0 && stats.highConfidenceSuggestions > 0 && (
				<Card className="bg-green-50 border-green-200">
					<CardContent className="pt-6">
						<div className="flex items-start gap-3">
							<CheckCircle className="size-5 text-green-600 mt-0.5 flex-shrink-0" />
							<div className="space-y-2">
								<h4 className="text-sm font-medium text-green-900">
									Smart Suggestions Available
								</h4>
								<p className="text-sm text-green-700">
									We found {stats.highConfidenceSuggestions} high-confidence
									room matches based on name similarity. These rows are
									highlighted in green. Review and save these mappings to
									enable automatic room assignment for future bookings.
								</p>
							</div>
						</div>
					</CardContent>
				</Card>
			)}
		</div>
	);
}
