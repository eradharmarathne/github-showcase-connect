import { addDays, format, isAfter, isBefore, isToday } from "date-fns";
import { ArrowRight, Calendar as CalendarIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { useRoomAvailability } from "@/hooks/useRoomAvailability";
import { cn } from "@/lib/utils";

interface ReservationDateSelectorProps {
	checkInDate?: string;
	checkOutDate?: string;
	onDatesChange?: (checkIn: string, checkOut: string) => void;
	className?: string;
	disabled?: boolean;
	minDate?: Date;
	maxDate?: Date;
	showNights?: boolean;
	roomId?: string; // Room ID to check availability for
	excludeReservationId?: string; // Exclude this reservation when checking (for editing)
}

export function ReservationDateSelector({
	checkInDate = "",
	checkOutDate = "",
	onDatesChange,
	className,
	disabled = false,
	minDate = new Date(),
	maxDate,
	showNights = true,
	roomId,
	excludeReservationId,
}: ReservationDateSelectorProps) {
	// Check room availability
	const { isDateAvailable, isLoading: availabilityLoading } =
		useRoomAvailability({
			roomId,
			excludeReservationId,
		});
	const [checkIn, setCheckIn] = useState<Date | undefined>(
		checkInDate ? new Date(checkInDate) : undefined,
	);
	const [checkOut, setCheckOut] = useState<Date | undefined>(
		checkOutDate ? new Date(checkOutDate) : undefined,
	);
	const [isCheckInOpen, setIsCheckInOpen] = useState(false);
	const [isCheckOutOpen, setIsCheckOutOpen] = useState(false);

	// Update state when props change
	useEffect(() => {
		if (checkInDate) {
			setCheckIn(new Date(checkInDate));
		} else {
			setCheckIn(undefined);
		}
	}, [checkInDate]);

	useEffect(() => {
		if (checkOutDate) {
			setCheckOut(new Date(checkOutDate));
		} else {
			setCheckOut(undefined);
		}
	}, [checkOutDate]);

	const handleCheckInSelect = (date: Date | undefined) => {
		setCheckIn(date);
		setIsCheckInOpen(false);

		// Auto-adjust check-out if it's before or same as new check-in
		if (
			date &&
			checkOut &&
			(isBefore(checkOut, date) ||
				format(checkOut, "yyyy-MM-dd") === format(date, "yyyy-MM-dd"))
		) {
			const newCheckOut = addDays(date, 1);
			setCheckOut(newCheckOut);
			onDatesChange?.(
				format(date, "yyyy-MM-dd"),
				format(newCheckOut, "yyyy-MM-dd"),
			);
		} else if (date && checkOut) {
			onDatesChange?.(
				format(date, "yyyy-MM-dd"),
				format(checkOut, "yyyy-MM-dd"),
			);
		} else if (date) {
			onDatesChange?.(format(date, "yyyy-MM-dd"), "");
		}
	};

	const handleCheckOutSelect = (date: Date | undefined) => {
		setCheckOut(date);
		setIsCheckOutOpen(false);

		if (checkIn && date) {
			onDatesChange?.(
				format(checkIn, "yyyy-MM-dd"),
				format(date, "yyyy-MM-dd"),
			);
		}
	};

	const calculateNights = () => {
		if (checkIn && checkOut) {
			const diffTime = checkOut.getTime() - checkIn.getTime();
			return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
		}
		return 0;
	};

	const isCheckInDisabled = (date: Date) => {
		if (minDate && isBefore(date, minDate)) return true;
		if (maxDate && isAfter(date, maxDate)) return true;

		// Check room availability if roomId is provided
		if (roomId && !availabilityLoading) {
			return !isDateAvailable(date, roomId);
		}

		return false;
	};

	const isCheckOutDisabled = (date: Date) => {
		if (minDate && isBefore(date, minDate)) return true;
		if (maxDate && isAfter(date, maxDate)) return true;
		if (
			checkIn &&
			(isBefore(date, checkIn) ||
				format(date, "yyyy-MM-dd") === format(checkIn, "yyyy-MM-dd"))
		)
			return true;

		// Check room availability if roomId is provided
		if (roomId && !availabilityLoading && checkIn) {
			// For check-out, we need to check all dates from check-in to check-out (exclusive of check-out)
			const currentDate = new Date(checkIn);
			currentDate.setDate(currentDate.getDate() + 1); // Start from day after check-in

			while (isBefore(currentDate, date)) {
				if (!isDateAvailable(currentDate, roomId)) {
					return true; // Disable if any date in range is unavailable
				}
				currentDate.setDate(currentDate.getDate() + 1);
			}
		}

		return false;
	};

	const getMinCheckOutDate = () => {
		if (checkIn) {
			return addDays(checkIn, 1);
		}
		return minDate;
	};

	return (
		<Card className={cn("w-full", className)}>
			<CardContent className="space-y-4 py-4">
				{/* Availability Legend - Only show when room is selected */}
				{roomId && !availabilityLoading && (
					<div className="flex items-center justify-center gap-4 p-2 bg-muted/50 rounded-md text-xs">
						<div className="flex items-center gap-1.5">
							<div className="w-3 h-3 rounded-full bg-green-500" />
							<span className="text-muted-foreground">Available</span>
						</div>
						<div className="flex items-center gap-1.5">
							<div className="w-3 h-3 rounded-full bg-red-500" />
							<span className="text-muted-foreground">Reserved</span>
						</div>
					</div>
				)}

				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					{/* Check-in Date */}
					<div className="space-y-2">
						<Label>Check-in Date *</Label>
						<Popover open={isCheckInOpen} onOpenChange={setIsCheckInOpen}>
							<PopoverTrigger asChild>
								<Button
									type="button"
									variant="outline"
									className={cn(
										"w-full justify-start text-left font-normal",
										!checkIn && "text-muted-foreground",
									)}
									disabled={disabled}
								>
									<CalendarIcon className="mr-2 h-4 w-4" />
									{checkIn ? format(checkIn, "PPP") : "Select check-in date"}
								</Button>
							</PopoverTrigger>
							<PopoverContent className="w-auto p-0" align="start">
								<Calendar
									mode="single"
									selected={checkIn}
									onSelect={handleCheckInSelect}
									disabled={isCheckInDisabled}
									modifiers={{
										available: (date) => {
											if (!roomId || availabilityLoading) return false;
											if (minDate && isBefore(date, minDate)) return false;
											if (maxDate && isAfter(date, maxDate)) return false;
											return isDateAvailable(date, roomId);
										},
										unavailable: (date) => {
											if (!roomId || availabilityLoading) return false;
											if (minDate && isBefore(date, minDate)) return false;
											if (maxDate && isAfter(date, maxDate)) return false;
											return !isDateAvailable(date, roomId);
										},
									}}
									modifiersClassNames={{
										available:
											"bg-green-100 text-green-900 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-100 dark:hover:bg-green-900/50",
										unavailable:
											"bg-red-100 text-red-900 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-100 dark:hover:bg-red-900/50 line-through",
									}}
									initialFocus
								/>
							</PopoverContent>
						</Popover>
					</div>

					{/* Check-out Date */}
					<div className="space-y-2">
						<Label>Check-out Date *</Label>
						<Popover open={isCheckOutOpen} onOpenChange={setIsCheckOutOpen}>
							<PopoverTrigger asChild>
								<Button
									type="button"
									variant="outline"
									className={cn(
										"w-full justify-start text-left font-normal",
										!checkOut && "text-muted-foreground",
									)}
									disabled={disabled || !checkIn}
								>
									<CalendarIcon className="mr-2 h-4 w-4" />
									{checkOut ? format(checkOut, "PPP") : "Select check-out date"}
								</Button>
							</PopoverTrigger>
							<PopoverContent className="w-auto p-0" align="start">
								<Calendar
									mode="single"
									selected={checkOut}
									onSelect={handleCheckOutSelect}
									disabled={isCheckOutDisabled}
									modifiers={{
										available: (date) => {
											if (!roomId || availabilityLoading || !checkIn)
												return false;
											if (minDate && isBefore(date, minDate)) return false;
											if (maxDate && isAfter(date, maxDate)) return false;
											if (
												isBefore(date, checkIn) ||
												format(date, "yyyy-MM-dd") ===
													format(checkIn, "yyyy-MM-dd")
											)
												return false;

											// Check if all dates in the range are available
											const currentDate = new Date(checkIn);
											currentDate.setDate(currentDate.getDate() + 1);

											while (isBefore(currentDate, date)) {
												if (!isDateAvailable(currentDate, roomId)) {
													return false;
												}
												currentDate.setDate(currentDate.getDate() + 1);
											}
											return true;
										},
										unavailable: (date) => {
											if (!roomId || availabilityLoading || !checkIn)
												return false;
											if (minDate && isBefore(date, minDate)) return false;
											if (maxDate && isAfter(date, maxDate)) return false;
											if (
												isBefore(date, checkIn) ||
												format(date, "yyyy-MM-dd") ===
													format(checkIn, "yyyy-MM-dd")
											)
												return false;

											// Check if any date in the range is unavailable
											const currentDate = new Date(checkIn);
											currentDate.setDate(currentDate.getDate() + 1);

											while (isBefore(currentDate, date)) {
												if (!isDateAvailable(currentDate, roomId)) {
													return true;
												}
												currentDate.setDate(currentDate.getDate() + 1);
											}
											return false;
										},
									}}
									modifiersClassNames={{
										available:
											"bg-green-100 text-green-900 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-100 dark:hover:bg-green-900/50",
										unavailable:
											"bg-red-100 text-red-900 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-100 dark:hover:bg-red-900/50 line-through",
									}}
									initialFocus
								/>
							</PopoverContent>
						</Popover>
					</div>
				</div>

				{/* Date Range Summary */}
				{checkIn && checkOut && (
					<div className="flex items-center justify-center gap-2 p-4 bg-secondary rounded-lg">
						<div className="text-center">
							<div className="text-sm font-medium">
								{format(checkIn, "MMM dd")}
							</div>
							<div className="text-xs text-muted-foreground">Check-in</div>
						</div>
						<ArrowRight className="h-4 w-4 text-muted-foreground" />
						<div className="text-center">
							<div className="text-sm font-medium">
								{format(checkOut, "MMM dd")}
							</div>
							<div className="text-xs text-muted-foreground">Check-out</div>
						</div>
						{showNights && (
							<>
								<div className="h-4 w-px bg-border mx-2" />
								<div className="text-center">
									<div className="text-sm font-medium">{calculateNights()}</div>
									<div className="text-xs text-muted-foreground">
										{calculateNights() === 1 ? "night" : "nights"}
									</div>
								</div>
							</>
						)}
					</div>
				)}
			</CardContent>
		</Card>
	);
}
