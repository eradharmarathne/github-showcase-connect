import { addMonths, format, subMonths } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";

interface CalendarNavigationProps {
	currentDate: Date;
	onDateChange: (date: Date) => void;
}

export function CalendarNavigation({
	currentDate,
	onDateChange,
}: CalendarNavigationProps) {
	const { t } = useTranslation("common");

	const goToPrevMonth = () => {
		onDateChange(subMonths(currentDate, 1));
	};

	const goToNextMonth = () => {
		onDateChange(addMonths(currentDate, 1));
	};

	const goToToday = () => {
		onDateChange(new Date());
	};

	return (
		<div className="flex items-center justify-between mb-4">
			<div className="flex items-center gap-2">
				<Button
					variant="outline"
					size="sm"
					onClick={goToPrevMonth}
					title={t("calendar.navigation.previousMonth")}
				>
					<ChevronLeft className="size-4" />
				</Button>
				<h2 className="text-lg md:text-xl lg:text-2xl font-semibold min-w-[200px] text-center">
					{format(currentDate, "MMMM yyyy")}
				</h2>
				<Button
					variant="outline"
					size="sm"
					onClick={goToNextMonth}
					title={t("calendar.navigation.nextMonth")}
				>
					<ChevronRight className="size-4" />
				</Button>
			</div>
			<Button variant="outline" size="sm" onClick={goToToday}>
				{t("calendar.navigation.today")}
			</Button>
		</div>
	);
}
