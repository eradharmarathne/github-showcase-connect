import {
	MultiRoomSelector,
	type RoomSelection,
} from "@/components/reservation/multi-room-selector";
import { Tables } from "@/integrations/supabase/types";

type Room = Tables<"rooms">;

interface RoomSelectionStepProps {
	rooms: Room[];
	roomSelections: RoomSelection[];
	onRoomSelectionsChange: (selections: RoomSelection[]) => void;
	defaultCurrency: string;
}

export function RoomSelectionStep({
	rooms,
	roomSelections,
	onRoomSelectionsChange,
	defaultCurrency,
}: RoomSelectionStepProps) {
	return (
		<div className="space-y-4">
			<h3 className="text-base md:text-lg lg:text-xl font-semibold">
				Room Selection
			</h3>
			<MultiRoomSelector
				rooms={rooms}
				roomSelections={roomSelections}
				onRoomSelectionsChange={onRoomSelectionsChange}
				defaultCurrency={defaultCurrency}
			/>
		</div>
	);
}
