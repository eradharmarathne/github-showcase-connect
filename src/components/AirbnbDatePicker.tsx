import { addDays, differenceInDays, format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Card, CardContent } from "@/components/ui/card";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface AirbnbDatePickerProps {
	checkInDate: string;
	checkOutDate: string;
	onCheckInChange: (date: string) => void;
	onCheckOutChange: (date: string) => void;
	onNightsChange: (nights: number) => void;
}

export const AirbnbDatePicker = ({
	checkInDate,
	checkOutDate,
	onCheckInChange,
	onCheckOutChange,
	onNightsChange,
}: AirbnbDatePickerProps) => {
	const [isOpen, setIsOpen] = useState(false);
	const [selectingCheckIn, setSelectingCheckIn] = useState(true);

	const checkIn = checkInDate ? new Date(checkInDate) : undefined;
	const checkOut = checkOutDate ? new Date(checkOutDate) : undefined;

	const nights = checkIn && checkOut ? differenceInDays(checkOut, checkIn) : 0;

	const handleDateSelect = (date: Date | undefined) => {
		if (!date) return;

		if (selectingCheckIn) {
			const newCheckIn = format(date, "yyyy-MM-dd");
			onCheckInChange(newCheckIn);

			// If check-out is before or same as new check-in, clear check-out
			if (!checkOut || date >= checkOut) {
				onCheckOutChange("");
				onNightsChange(0);
			} else {
				onNightsChange(differenceInDays(checkOut, date));
			}

			setSelectingCheckIn(false);
		} else {
			// Selecting check-out
			if (checkIn && date > checkIn) {
				const newCheckOut = format(date, "yyyy-MM-dd");
				onCheckOutChange(newCheckOut);
				onNightsChange(differenceInDays(date, checkIn));
				setIsOpen(false);
				setSelectingCheckIn(true);
			}
		}
	};

	const handleTriggerClick = () => {
		setIsOpen(true);
		if (!checkInDate) {
			setSelectingCheckIn(true);
		} else if (!checkOutDate) {
			setSelectingCheckIn(false);
		} else {
			setSelectingCheckIn(true);
		}
	};

	const getDisplayText = () => {
		if (checkIn && checkOut) {
			return `${format(checkIn, "MMM dd")} - ${format(checkOut, "MMM dd, yyyy")}`;
		} else if (checkIn) {
			return `${format(checkIn, "MMM dd, yyyy")} - Add checkout`;
		} else {
			return "Add dates";
		}
	};

	const isDateDisabled = (date: Date) => {
		const today = new Date();
		today.setHours(0, 0, 0, 0);

		if (date < today) return true;

		if (!selectingCheckIn && checkIn) {
			return date <= checkIn;
		}

		return false;
	};

	return (
		<div className="space-y-2">
			<Popover open={isOpen} onOpenChange={setIsOpen}>
				<PopoverTrigger asChild>
					<Button
						variant="outline"
						onClick={handleTriggerClick}
						className={cn(
							"w-full justify-start text-left font-normal h-14 px-4",
							!checkInDate && "text-muted-foreground",
						)}
					>
						<CalendarIcon className="mr-3 size-5" />
						<div className="flex flex-col items-start">
							<span className="text-xs text-muted-foreground mb-1">
								{selectingCheckIn ? "Check-in" : "Check-out"}
							</span>
							<span className="text-sm font-medium">{getDisplayText()}</span>
						</div>
					</Button>
				</PopoverTrigger>
				<PopoverContent className="w-auto p-0" align="start">
					<Card className="border-0">
						<CardContent className="p-4 sm:p-6">
							<div className="text-center mb-4">
								<h3 className="text-base md:text-lg lg:text-xl font-semibold">
									{selectingCheckIn
										? "Select check-in date"
										: "Select check-out date"}
								</h3>
								<p className="text-sm text-muted-foreground">
									{selectingCheckIn
										? "Add your check-in date"
										: checkIn
											? `Minimum stay: 1 night from ${format(checkIn, "MMM dd")}`
											: "Select check-in first"}
								</p>
							</div>
							<CalendarComponent
								mode="single"
								selected={selectingCheckIn ? checkIn : checkOut}
								onSelect={handleDateSelect}
								disabled={isDateDisabled}
								initialFocus
								className="pointer-events-auto"
							/>
							{checkIn && !selectingCheckIn && (
								<div className="mt-4 pt-4 border-t">
									<Button
										variant="outline"
										size="sm"
										onClick={() => {
											setSelectingCheckIn(true);
										}}
										className="w-full"
									>
										Change check-in date
									</Button>
								</div>
							)}
						</CardContent>
					</Card>
				</PopoverContent>
			</Popover>

			{/* Nights Display */}
			{nights > 0 && (
				<div className="flex items-center justify-center py-2 px-4 bg-muted/50 rounded-lg">
					<CalendarIcon className="size-4 mr-2 text-muted-foreground" />
					<span className="text-sm font-medium">
						{nights} {nights === 1 ? "night" : "nights"}
					</span>
				</div>
			)}
		</div>
	);
};
