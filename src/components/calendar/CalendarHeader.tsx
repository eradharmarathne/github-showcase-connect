import { useQuery } from "@tanstack/react-query";
import { CalendarIcon, Grid3X3, LayoutGrid, Search, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { useLocationContext } from "@/context/LocationContext";
import { useTenant } from "@/hooks/useTenant";
import { supabase } from "@/integrations/supabase/client";

interface CalendarHeaderProps {
	viewMode: "timeline" | "grid";
	onViewModeChange: (mode: "timeline" | "grid") => void;
	searchTerm: string;
	onSearchTermChange: (term: string) => void;
	statusFilter: string;
	onStatusFilterChange: (status: string) => void;
	roomFilter: string;
	onRoomFilterChange: (room: string) => void;
}

export function CalendarHeader({
	viewMode,
	onViewModeChange,
	searchTerm,
	onSearchTermChange,
	statusFilter,
	onStatusFilterChange,
	roomFilter,
	onRoomFilterChange,
}: CalendarHeaderProps) {
	const { selectedLocation } = useLocationContext();
	const { tenant } = useTenant();

	// Fetch rooms for filter dropdown
	const { data: rooms = [] } = useQuery({
		queryKey: ["rooms", selectedLocation, tenant?.id],
		queryFn: async () => {
			if (!selectedLocation || !tenant?.id) return [];

			const { data, error } = await supabase
				.from("rooms")
				.select("*")
				.eq("tenant_id", tenant.id)
				.eq("location_id", selectedLocation)
				.eq("is_active", true)
				.order("room_number");

			if (error) throw error;
			return data || [];
		},
		enabled: !!selectedLocation && !!tenant?.id,
	});

	// Get active filter count
	const activeFilters = [
		searchTerm.trim(),
		statusFilter !== "all" ? statusFilter : "",
		roomFilter !== "all" ? roomFilter : "",
	].filter(Boolean).length;

	const clearAllFilters = () => {
		onSearchTermChange("");
		onStatusFilterChange("all");
		onRoomFilterChange("all");
	};

	return (
		<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 pt-8">
			<div className="flex items-center gap-3">
				<h1 className="text-xl md:text-2xl lg:text-3xl font-bold">
					Enhanced Calendar
				</h1>
				{activeFilters > 0 && (
					<Badge variant="secondary" className="flex items-center gap-1">
						{activeFilters} Filter{activeFilters > 1 ? "s" : ""}
						<Button
							variant="ghost"
							size="sm"
							onClick={clearAllFilters}
							className="h-auto p-0 hover:bg-transparent"
						>
							<X className="size-3" />
						</Button>
					</Badge>
				)}
			</div>

			<div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
				{/* Search */}
				<div className="relative">
					<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 size-4 text-gray-400" />
					<Input
						placeholder="Search reservations..."
						value={searchTerm}
						onChange={(e) => onSearchTermChange(e.target.value)}
						className="pl-10 w-full sm:w-64"
					/>
				</div>

				{/* Status Filter */}
				<Select value={statusFilter} onValueChange={onStatusFilterChange}>
					<SelectTrigger className="w-full sm:w-40">
						<SelectValue placeholder="All Statuses" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">All Statuses</SelectItem>
						<SelectItem value="confirmed">Confirmed</SelectItem>
						<SelectItem value="tentative">Tentative</SelectItem>
						<SelectItem value="pending">Pending</SelectItem>
						<SelectItem value="checked_in">Checked In</SelectItem>
						<SelectItem value="checked_out">Checked Out</SelectItem>
						<SelectItem value="cancelled">Cancelled</SelectItem>
					</SelectContent>
				</Select>

				{/* Room Filter */}
				<Select value={roomFilter} onValueChange={onRoomFilterChange}>
					<SelectTrigger className="w-full sm:w-40">
						<SelectValue placeholder="All Rooms" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">All Rooms</SelectItem>
						{rooms.map((room) => (
							<SelectItem key={room.id} value={room.id}>
								{room.room_number} - {room.room_type}
							</SelectItem>
						))}
					</SelectContent>
				</Select>

				{/* View Toggle */}
				<div className="flex border rounded-lg p-1">
					<Button
						variant={viewMode === "timeline" ? "default" : "ghost"}
						size="sm"
						onClick={() => onViewModeChange("timeline")}
						className="flex items-center gap-2 px-3"
					>
						<LayoutGrid className="size-4" />
						<span className="hidden sm:inline">Timeline</span>
					</Button>
					<Button
						variant={viewMode === "grid" ? "default" : "ghost"}
						size="sm"
						onClick={() => onViewModeChange("grid")}
						className="flex items-center gap-2 px-3"
					>
						<Grid3X3 className="size-4" />
						<span className="hidden sm:inline">Grid</span>
					</Button>
				</div>
			</div>
		</div>
	);
}
