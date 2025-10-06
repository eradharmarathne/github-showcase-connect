import { addDays, format, isAfter, isBefore, isToday } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface DateRangePickerProps {
	checkInDate?: string;
	checkOutDate?: string;
	onDateChange?: (checkIn: string, checkOut: string) => void;
	className?: string;
	minDate?: Date;
	maxDate?: Date;
}

export function DateRangePicker({
	checkInDate = "",
	checkOutDate = "",
	onDateChange,
	className,
	minDate = new Date(),
	maxDate,
}: DateRangePickerProps) {
	const [selectedCheckIn, setSelectedCheckIn] = useState<Date | undefined>(
		checkInDate ? new Date(checkInDate) : undefined,
	);
	const [selectedCheckOut, setSelectedCheckOut] = useState<Date | undefined>(
		checkOutDate ? new Date(checkOutDate) : undefined,
	);
	const [isSelectingCheckOut, setIsSelectingCheckOut] = useState(false);

	const handleDateSelect = (date: Date | undefined) => {
		if (!date) return;

		if (
			!selectedCheckIn ||
			(!isSelectingCheckOut && isBefore(date, selectedCheckIn))
		) {
			// Setting check-in date
			setSelectedCheckIn(date);
			setSelectedCheckOut(undefined);
			setIsSelectingCheckOut(true);
		} else if (isSelectingCheckOut || !selectedCheckOut) {
			// Setting check-out date
			if (
				isAfter(date, selectedCheckIn) ||
				format(date, "yyyy-MM-dd") === format(selectedCheckIn, "yyyy-MM-dd")
			) {
				const checkOut =
					isToday(selectedCheckIn) &&
					format(date, "yyyy-MM-dd") === format(selectedCheckIn, "yyyy-MM-dd")
						? addDays(date, 1)
						: addDays(date, 1);
				setSelectedCheckOut(checkOut);
				setIsSelectingCheckOut(false);

				// Call callback with formatted dates
				if (onDateChange) {
					onDateChange(
						format(selectedCheckIn, "yyyy-MM-dd"),
						format(checkOut, "yyyy-MM-dd"),
					);
				}
			}
		} else {
			// Reset and start over
			setSelectedCheckIn(date);
			setSelectedCheckOut(undefined);
			setIsSelectingCheckOut(true);
		}
	};

	const handleClearDates = () => {
		setSelectedCheckIn(undefined);
		setSelectedCheckOut(undefined);
		setIsSelectingCheckOut(false);
		if (onDateChange) {
			onDateChange("", "");
		}
	};

	const handleTodayTomorrow = () => {
		const today = new Date();
		const tomorrow = addDays(today, 1);
		setSelectedCheckIn(today);
		setSelectedCheckOut(tomorrow);
		setIsSelectingCheckOut(false);
		if (onDateChange) {
			onDateChange(format(today, "yyyy-MM-dd"), format(tomorrow, "yyyy-MM-dd"));
		}
	};

	const calculateNights = () => {
		if (selectedCheckIn && selectedCheckOut) {
			const diffTime = selectedCheckOut.getTime() - selectedCheckIn.getTime();
			return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
		}
		return 0;
	};

	const isDateDisabled = (date: Date) => {
		// Disable past dates (before minDate)
		if (minDate && isBefore(date, minDate)) return true;

		// Disable dates after maxDate if provided
		if (maxDate && isAfter(date, maxDate)) return true;

		// If selecting check-out, disable dates before or equal to check-in
		if (isSelectingCheckOut && selectedCheckIn) {
			return (
				isBefore(date, selectedCheckIn) ||
				format(date, "yyyy-MM-dd") === format(selectedCheckIn, "yyyy-MM-dd")
			);
		}

		return false;
	};

	const getDateModifiers = () => {
		const modifiers: any = {};

		if (selectedCheckIn) {
			modifiers.selected_start = selectedCheckIn;
		}

		if (selectedCheckOut) {
			modifiers.selected_end = addDays(selectedCheckOut, -1); // Adjust for display
		}

		if (selectedCheckIn && selectedCheckOut) {
			const range = [];
			let currentDate = new Date(selectedCheckIn);
			const endDate = addDays(selectedCheckOut, -1);

			while (
				isBefore(currentDate, endDate) ||
				format(currentDate, "yyyy-MM-dd") === format(endDate, "yyyy-MM-dd")
			) {
				range.push(new Date(currentDate));
				currentDate = addDays(currentDate, 1);
			}
			modifiers.selected_range = range;
		}

		return modifiers;
	};

	return (
		<Card className={cn("w-full max-w-md", className)}>
			<CardHeader className="pb-4">
				<CardTitle className="text-base md:text-lg lg:text-xl flex items-center gap-2">
					<CalendarIcon className="h-5 w-5" />
					Select Dates
				</CardTitle>
				<div className="flex gap-2">
					<Button
						variant="outline"
						size="sm"
						onClick={handleTodayTomorrow}
						className="text-xs"
					>
						Today - Tomorrow
					</Button>
					<Button
						variant="outline"
						size="sm"
						onClick={handleClearDates}
						className="text-xs"
					>
						Clear Dates
					</Button>
				</div>
			</CardHeader>
			<CardContent className="space-y-4">
				{/* Date Display */}
				<div className="grid grid-cols-2 gap-4">
					<div className="space-y-2">
						<Label className="text-sm font-medium">Check-in</Label>
						<div
							className={cn(
								"p-3 border rounded-md text-center",
								selectedCheckIn ? "bg-primary/10 border-primary" : "bg-muted",
							)}
						>
							{selectedCheckIn ? (
								<>
									<div className="font-semibold text-sm">
										{format(selectedCheckIn, "MMM dd")}
									</div>
									<div className="text-xs text-muted-foreground">
										{format(selectedCheckIn, "yyyy")}
									</div>
								</>
							) : (
								<div className="text-sm text-muted-foreground">Select date</div>
							)}
						</div>
					</div>

					<div className="space-y-2">
						<Label className="text-sm font-medium">Check-out</Label>
						<div
							className={cn(
								"p-3 border rounded-md text-center",
								selectedCheckOut ? "bg-primary/10 border-primary" : "bg-muted",
							)}
						>
							{selectedCheckOut ? (
								<>
									<div className="font-semibold text-sm">
										{format(selectedCheckOut, "MMM dd")}
									</div>
									<div className="text-xs text-muted-foreground">
										{format(selectedCheckOut, "yyyy")}
									</div>
								</>
							) : (
								<div className="text-sm text-muted-foreground">Select date</div>
							)}
						</div>
					</div>
				</div>

				{/* Nights Display */}
				{selectedCheckIn && selectedCheckOut && (
					<div className="text-center p-2 bg-secondary rounded-md">
						<span className="text-sm font-medium">
							{calculateNights()} {calculateNights() === 1 ? "night" : "nights"}
						</span>
					</div>
				)}

				{/* Instructions */}
				<div className="text-xs text-muted-foreground text-center">
					{!selectedCheckIn
						? "Select your check-in date"
						: isSelectingCheckOut
							? "Now select your check-out date"
							: "Click dates to change selection"}
				</div>

				{/* Calendar */}
				<Calendar
					mode="single"
					selected={isSelectingCheckOut ? selectedCheckOut : selectedCheckIn}
					onSelect={handleDateSelect}
					disabled={isDateDisabled}
					modifiers={getDateModifiers()}
					modifiersStyles={{
						selected_start: {
							backgroundColor: "hsl(var(--primary))",
							color: "hsl(var(--primary-foreground))",
							borderRadius: "6px 0 0 6px",
						},
						selected_end: {
							backgroundColor: "hsl(var(--primary))",
							color: "hsl(var(--primary-foreground))",
							borderRadius: "0 6px 6px 0",
						},
						selected_range: {
							backgroundColor: "hsl(var(--primary) / 0.2)",
							color: "hsl(var(--foreground))",
						},
					}}
					className="w-full"
				/>
			</CardContent>
		</Card>
	);
}
