import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import type { Database } from "@/integrations/supabase/types";

type Room = Database["public"]["Tables"]["rooms"]["Row"];

interface QuickBookDialogProps {
	isOpen: boolean;
	onClose: () => void;
	onBook?: () => void;
	selectedRoom: Room | null;
	selectedDate: Date | null;
}

export function QuickBookDialog({
	isOpen,
	onClose,
	onBook,
	selectedRoom,
	selectedDate,
}: QuickBookDialogProps) {
	if (!isOpen || !selectedRoom || !selectedDate) return null;

	const handleBookRoom = () => {
		if (onBook) {
			onBook();
		}
		onClose();
	};

	return (
		<div className="fixed inset-0 bg-background bg-opacity-50 flex items-center justify-center z-50">
			<div className="rounded-lg p-6 max-w-md w-full mx-4">
				<h3 className="text-base md:text-lg lg:text-xl font-semibold mb-4">Quick Book Room</h3>
				<div className="space-y-3">
					<div>
						<span className="font-medium">Room:</span>{" "}
						{selectedRoom.room_number} ({selectedRoom.room_type})
					</div>
					<div>
						<span className="font-medium">Date:</span>{" "}
						{format(selectedDate, "MMM dd, yyyy")}
					</div>
				</div>
				<div className="flex gap-2 mt-6">
					<Button variant="outline" onClick={onClose} className="flex-1">
						Cancel
					</Button>
					<Button onClick={handleBookRoom} className="flex-1">
						Book Room
					</Button>
				</div>
			</div>
		</div>
	);
}
