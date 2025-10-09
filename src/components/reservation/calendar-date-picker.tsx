import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface CalendarDatePickerProps {
	date?: Date;
	onDateChange?: (date: Date | undefined) => void;
	placeholder?: string;
	disabled?: boolean;
	className?: string;
	minDate?: Date;
	maxDate?: Date;
}

export function CalendarDatePicker({
	date,
	onDateChange,
	placeholder = "Pick a date",
	disabled = false,
	className,
	minDate,
	maxDate,
}: CalendarDatePickerProps) {
	const [isOpen, setIsOpen] = useState(false);

	const handleSelect = (selectedDate: Date | undefined) => {
		onDateChange?.(selectedDate);
		setIsOpen(false);
	};

	const isDateDisabled = (date: Date) => {
		if (minDate && date < minDate) return true;
		if (maxDate && date > maxDate) return true;
		return false;
	};

	return (
		<Popover open={isOpen} onOpenChange={setIsOpen}>
			<PopoverTrigger asChild>
				<Button
					variant="outline"
					className={cn(
						"w-full justify-start text-left font-normal",
						!date && "text-muted-foreground",
						className,
					)}
					disabled={disabled}
				>
					<CalendarIcon className="mr-2 h-4 w-4" />
					{date ? format(date, "PPP") : placeholder}
				</Button>
			</PopoverTrigger>
			<PopoverContent className="w-auto p-0" align="start">
				<Calendar
					mode="single"
					selected={date}
					onSelect={handleSelect}
					disabled={isDateDisabled}
					initialFocus
				/>
			</PopoverContent>
		</Popover>
	);
}
