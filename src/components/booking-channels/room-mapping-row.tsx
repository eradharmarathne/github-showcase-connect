import { useState } from "react";
import { CheckCircle, AlertCircle, Link2 } from "lucide-react";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { TableCell, TableRow } from "@/components/ui/table";

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

interface RoomMappingRowProps {
	beds24Room: Beds24Room;
	availableRooms: Room[];
	onMappingChange: (beds24RoomId: number, ccoRoomId: string | null) => void;
}

export function RoomMappingRow({
	beds24Room,
	availableRooms,
	onMappingChange,
}: RoomMappingRowProps) {
	const [selectedRoomId, setSelectedRoomId] = useState<string | null>(
		beds24Room.currentMapping?.room_id || null,
	);

	const handleMappingChange = (value: string) => {
		const roomId = value === "unmapped" ? null : value;
		setSelectedRoomId(roomId);
		onMappingChange(beds24Room.id, roomId);
	};

	// Get top suggestion if available
	const topSuggestion =
		beds24Room.suggestions && beds24Room.suggestions.length > 0
			? beds24Room.suggestions[0]
			: null;

	// Check if top suggestion has high confidence (>60%)
	const hasHighConfidenceSuggestion =
		topSuggestion && topSuggestion.similarity >= 0.6;

	return (
		<TableRow
			className={
				hasHighConfidenceSuggestion && !selectedRoomId
					? "bg-green-50 hover:bg-green-100"
					: ""
			}
		>
			{/* Beds24 Room Info */}
			<TableCell>
				<div className="space-y-1">
					<div className="font-medium">{beds24Room.name}</div>
					<div className="text-xs text-muted-foreground">
						ID: {beds24Room.id}
					</div>
					{beds24Room.maxOccupancy && (
						<div className="text-xs text-muted-foreground">
							Max Occupancy: {beds24Room.maxOccupancy}
						</div>
					)}
				</div>
			</TableCell>

			{/* Property */}
			<TableCell className="text-sm text-muted-foreground">
				{beds24Room.propertyName}
			</TableCell>

			{/* Mapping Status */}
			<TableCell>
				{beds24Room.mappingStatus === "mapped" ? (
					<Badge variant="outline" className="bg-green-50 text-green-700">
						<CheckCircle className="size-3 mr-1" />
						Mapped
					</Badge>
				) : (
					<Badge variant="outline" className="bg-yellow-50 text-yellow-700">
						<AlertCircle className="size-3 mr-1" />
						Unmapped
					</Badge>
				)}
			</TableCell>

			{/* Auto-Match Suggestion */}
			<TableCell>
				{topSuggestion ? (
					<div className="space-y-1">
						<div className="text-sm">
							{topSuggestion.room_number} - {topSuggestion.room_type}
						</div>
						<Badge
							variant="outline"
							className={
								topSuggestion.similarity >= 0.6
									? "bg-green-50 text-green-700"
									: "bg-amber-50 text-amber-700"
							}
						>
							{Math.round(topSuggestion.similarity * 100)}% match
						</Badge>
					</div>
				) : (
					<span className="text-sm text-muted-foreground">No suggestion</span>
				)}
			</TableCell>

			{/* Room Selector */}
			<TableCell>
				<Select
					value={selectedRoomId || "unmapped"}
					onValueChange={handleMappingChange}
				>
					<SelectTrigger className="w-full">
						<SelectValue placeholder="Select room..." />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="unmapped">
							<span className="text-muted-foreground">No mapping</span>
						</SelectItem>
						{availableRooms.map((room) => (
							<SelectItem key={room.id} value={room.id}>
								<div className="flex items-center gap-2">
									{room.room_number} - {room.room_type}
									{topSuggestion?.room_id === room.id && (
										<Badge
											variant="outline"
											className="ml-2 bg-green-50 text-green-700"
										>
											<Link2 className="size-3 mr-1" />
											Suggested
										</Badge>
									)}
								</div>
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</TableCell>
		</TableRow>
	);
}
