import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { TimelineView } from "@/components/calendar/TimelineView";
import { PermissionRoute } from "@/components/PermissionRoute";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";
import { addMonths, subMonths, format, startOfMonth } from "date-fns";
import { getCurrencySymbol } from "@/utils/currency";
import type { Database } from "@/integrations/supabase/types";

type Room = Database["public"]["Tables"]["rooms"]["Row"];

export default function EnhancedCalendar() {
	const { t } = useTranslation("common");
	const navigate = useNavigate();
	const [currentDate, setCurrentDate] = useState(new Date());

	// Status color helpers
	const getStatusColor = (status: string) => {
		switch (status) {
			case "confirmed":
				return "bg-emerald-500";
			case "tentative":
				return "bg-amber-500";
			case "pending":
				return "bg-sky-500";
			case "checked_in":
				return "bg-violet-500";
			case "checked_out":
				return "bg-slate-400";
			case "cancelled":
				return "bg-rose-500";
			default:
				return "bg-slate-400";
		}
	};

	// Event handlers - Don't navigate, could show modal in future
	const handleBookingClick = (booking: any) => {
		// TODO: Show booking details in modal instead of navigating
		console.log("Booking clicked:", booking);
	};

	const handleQuickBook = () => {
		navigate("/reservations/compact");
	};

	const handlePreviousMonth = () => {
		setCurrentDate(subMonths(currentDate, 1));
	};

	const handleNextMonth = () => {
		setCurrentDate(addMonths(currentDate, 1));
	};

	const handleToday = () => {
		setCurrentDate(new Date());
	};

	return (
		<PermissionRoute permission={["access_calendar"]}>
			<div className="space-y-4 pb-20 sm:pb-8 px-4 sm:px-6 md:px-8 pt-4">
				{/* Navigation Header */}
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-2">
						<Button variant="outline" size="sm" onClick={handleToday}>
							<CalendarIcon className="size-4 mr-2" />
							Today
						</Button>
						<div className="flex items-center gap-1">
							<Button
								variant="ghost"
								size="icon"
								onClick={handlePreviousMonth}
							>
								<ChevronLeft className="size-4" />
							</Button>
							<Button variant="ghost" size="icon" onClick={handleNextMonth}>
								<ChevronRight className="size-4" />
							</Button>
						</div>
						<h2 className="text-lg font-semibold">
							{format(startOfMonth(currentDate), "MMMM yyyy")}
						</h2>
					</div>
					<Button onClick={() => navigate("/reservations/compact")}>
						New Reservation
					</Button>
				</div>

				{/* Channel Manager Timeline View */}
				<TimelineView
					currentDate={currentDate}
					searchTerm=""
					statusFilter="all"
					roomFilter="all"
					onBookingClick={handleBookingClick}
					onQuickBook={handleQuickBook}
					getStatusColor={getStatusColor}
					getCurrencySymbol={getCurrencySymbol}
				/>
			</div>
		</PermissionRoute>
	);
}
