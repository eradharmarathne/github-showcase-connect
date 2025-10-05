import { Plus, Search } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import {
	BookingDetailsDialog,
	CalendarNavigation,
	FullCalendarMonthView,
	QuickBookDialog,
} from "@/components/calendar";
import { NewReservationDialog } from "@/components/NewReservationDialog";
import { PermissionRoute } from "@/components/PermissionRoute";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import type { Database } from "@/integrations/supabase/types";
import { getCurrencySymbol } from "@/utils/currency";

type Room = Database["public"]["Tables"]["rooms"]["Row"];
type Reservation = Database["public"]["Tables"]["reservations"]["Row"] & {
	rooms: { room_number: string; room_type: string } | null;
	locations: { name: string } | null;
};

export default function EnhancedCalendar() {
	const { t } = useTranslation("common");
	const [currentDate, setCurrentDate] = useState(new Date());
	const [searchTerm, setSearchTerm] = useState("");
	const [statusFilter, setStatusFilter] = useState("all");
	const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
	const [selectedDate, setSelectedDate] = useState<Date | null>(null);
	const [selectedBooking, setSelectedBooking] = useState<Reservation | null>(
		null,
	);
	const [isQuickBookDialogOpen, setIsQuickBookDialogOpen] = useState(false);
	const [isBookingDetailsOpen, setIsBookingDetailsOpen] = useState(false);
	const [isNewReservationDialogOpen, setIsNewReservationDialogOpen] =
		useState(false);

	// Status color helpers
	const getStatusColor = (status: string) => {
		switch (status) {
			case "confirmed":
				return "text-green-500 hover:text-green-600";
			case "tentative":
				return "text-yellow-500 hover:text-yellow-600";
			case "pending":
				return "text-blue-500 hover:text-blue-600";
			case "checked_in":
				return "text-purple-500 hover:text-purple-600";
			case "checked_out":
				return "text-gray-500 hover:text-gray-600";
			case "cancelled":
				return "text-red-500 hover:text-red-600";
			default:
				return "text-gray-500 hover:text-gray-600";
		}
	};

	const getStatusBorderColor = (status: string) => {
		switch (status) {
			case "confirmed":
				return "#10b981";
			case "tentative":
				return "#f59e0b";
			case "pending":
				return "#3b82f6";
			case "checked_in":
				return "#8b5cf6";
			case "checked_out":
				return "#6b7280";
			case "cancelled":
				return "#ef4444";
			default:
				return "#6b7280";
		}
	};

	// Event handlers
	const handleBookingClick = (booking: Reservation) => {
		setSelectedBooking(booking);
		setIsBookingDetailsOpen(true);
	};

	const closeBookingDetailsDialog = () => {
		setIsBookingDetailsOpen(false);
		setSelectedBooking(null);
	};

	const handleQuickBook = (room: Room, date: Date) => {
		setSelectedRoom(room);
		setSelectedDate(date);
		setIsQuickBookDialogOpen(true);
	};

	const closeQuickBookDialog = () => {
		setIsQuickBookDialogOpen(false);
		setSelectedRoom(null);
		setSelectedDate(null);
	};

	return (
		<PermissionRoute permission={["access_calendar"]}>
			<div className="space-y-6 pb-20 sm:pb-6 px-4">
				{/* Filters */}
				<div className="flex pt-3 flex-col sm:flex-row gap-4 items-start sm:items-center">
					<div className="relative flex-1 max-w-sm">
						<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground size-4" />
						<Input
							placeholder={t("calendar.search.placeholder")}
							value={searchTerm}
							onChange={(e) => setSearchTerm(e.target.value)}
							className="pl-10"
						/>
					</div>
					<Select value={statusFilter} onValueChange={setStatusFilter}>
						<SelectTrigger className="w-full sm:w-48">
							<SelectValue placeholder={t("calendar.search.filterByStatus")} />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">
								{t("calendar.search.allStatuses")}
							</SelectItem>
							<SelectItem value="confirmed">
								{t("calendar.status.confirmed")}
							</SelectItem>
							<SelectItem value="tentative">
								{t("calendar.status.tentative")}
							</SelectItem>
							<SelectItem value="pending">
								{t("calendar.status.pending")}
							</SelectItem>
							<SelectItem value="checked_in">
								{t("calendar.status.checked_in")}
							</SelectItem>
							<SelectItem value="checked_out">
								{t("calendar.status.checked_out")}
							</SelectItem>
							<SelectItem value="cancelled">
								{t("calendar.status.cancelled")}
							</SelectItem>
						</SelectContent>
					</Select>
				</div>

				<CalendarNavigation
					currentDate={currentDate}
					onDateChange={setCurrentDate}
				/>

				<FullCalendarMonthView
					currentDate={currentDate}
					searchTerm={searchTerm}
					statusFilter={statusFilter}
					roomFilter="all"
					onBookingClick={handleBookingClick}
					onQuickBook={handleQuickBook}
					getStatusColor={getStatusColor}
					getStatusBorderColor={getStatusBorderColor}
					getCurrencySymbol={getCurrencySymbol}
				/>

				<QuickBookDialog
					isOpen={isQuickBookDialogOpen}
					onClose={closeQuickBookDialog}
					onBook={() => setIsNewReservationDialogOpen(true)}
					selectedRoom={selectedRoom}
					selectedDate={selectedDate}
				/>

				<BookingDetailsDialog
					reservation={selectedBooking}
					isOpen={isBookingDetailsOpen}
					onClose={closeBookingDetailsDialog}
					getStatusColor={getStatusColor}
					getStatusBorderColor={getStatusBorderColor}
					getCurrencySymbol={getCurrencySymbol}
				/>

				<NewReservationDialog
					isOpen={isNewReservationDialogOpen}
					onClose={() => setIsNewReservationDialogOpen(false)}
					onReservationCreated={() => {
						setIsNewReservationDialogOpen(false);
						// Refresh handled by React Query
					}}
				/>
			</div>
		</PermissionRoute>
	);
}
