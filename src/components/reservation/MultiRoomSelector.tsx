import { addDays, format } from "date-fns";
import { Calendar, Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { CurrencySelector } from "@/components/CurrencySelector";
import { ReservationDateSelector } from "@/components/reservation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useRoomAvailability } from "@/hooks/useRoomAvailability";
import { Tables } from "@/integrations/supabase/types";
import { convertCurrency } from "@/utils/currency";

type Room = Tables<"rooms">;

export interface RoomSelection {
	id: string; // Unique identifier for this room selection
	room_id: string;
	room_rate: number;
	check_in_date: string;
	check_out_date: string;
	adults: number;
	children: number;
	currency: string;
	arrival_time: string;
	nights: number;
	total_amount: number;
}

interface MultiRoomSelectorProps {
	rooms: Room[];
	roomSelections: RoomSelection[];
	onRoomSelectionsChange: (selections: RoomSelection[]) => void;
	defaultCurrency?: string;
}

export function MultiRoomSelector({
	rooms,
	roomSelections,
	onRoomSelectionsChange,
	defaultCurrency = "LKR",
}: MultiRoomSelectorProps) {
	const { toast } = useToast();

	// Room availability checking
	const { isRangeAvailable } = useRoomAvailability();

	const generateId = useCallback(
		() => `room_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
		[],
	);

	const addRoomSelection = useCallback(() => {
		const newSelection: RoomSelection = {
			id: generateId(),
			room_id: "",
			room_rate: 0,
			check_in_date: "", // Start with empty dates so user can select room first
			check_out_date: "", // Then pick available dates
			adults: 1,
			children: 0,
			currency: defaultCurrency,
			arrival_time: "",
			nights: 1,
			total_amount: 0,
		};
		onRoomSelectionsChange([...roomSelections, newSelection]);
	}, [generateId, roomSelections, onRoomSelectionsChange, defaultCurrency]);

	// Add first room if none exist
	useEffect(() => {
		if (roomSelections.length === 0) {
			addRoomSelection();
		}
	}, [roomSelections.length, addRoomSelection]);

	const removeRoomSelection = (id: string) => {
		if (roomSelections.length === 1) {
			toast({
				title: "Cannot Remove",
				description: "At least one room must be selected",
				variant: "destructive",
			});
			return;
		}
		onRoomSelectionsChange(
			roomSelections.filter((selection) => selection.id !== id),
		);
	};

	const updateRoomSelection = (id: string, updates: Partial<RoomSelection>) => {
		onRoomSelectionsChange(
			roomSelections.map((selection) =>
				selection.id === id ? { ...selection, ...updates } : selection,
			),
		);
	};

	const calculateNights = (checkIn: string, checkOut: string): number => {
		return Math.max(
			1,
			Math.ceil(
				checkIn && checkOut
					? (new Date(checkOut).getTime() - new Date(checkIn).getTime()) /
							(1000 * 60 * 60 * 24)
					: 1,
			),
		);
	};

	const handleRoomChange = async (selectionId: string, roomId: string) => {
		const selectedRoom = rooms.find((room) => room.id === roomId);
		const selection = roomSelections.find((s) => s.id === selectionId);

		if (!selectedRoom || !selection) return;

		const roomCurrency = selectedRoom.currency || "LKR";
		let roomRate = selectedRoom.base_price || 0;

		// Convert room price to selection currency if they differ
		if (roomCurrency !== selection.currency) {
			try {
				roomRate = await convertCurrency(
					selectedRoom.base_price || 0,
					roomCurrency,
					selection.currency,
				);
			} catch (error) {
				console.error("Currency conversion error:", error);
				toast({
					title: "Currency Conversion Error",
					description: "Using original room price",
					variant: "destructive",
				});
			}
		}

		const nights = calculateNights(
			selection.check_in_date,
			selection.check_out_date,
		);
		const total = Math.round(roomRate * nights * 100) / 100;

		updateRoomSelection(selectionId, {
			room_id: roomId,
			room_rate: Math.round(roomRate * 100) / 100,
			nights,
			total_amount: total,
		});
	};

	const handleCurrencyChange = async (
		selectionId: string,
		newCurrency: string,
	) => {
		const selection = roomSelections.find((s) => s.id === selectionId);
		const selectedRoom = rooms.find((room) => room.id === selection?.room_id);

		if (!selection || !selectedRoom) {
			updateRoomSelection(selectionId, { currency: newCurrency });
			return;
		}

		const roomCurrency = selectedRoom.currency || "LKR";
		let newRoomRate = selectedRoom.base_price || 0;

		// Convert room price to new currency if they differ
		if (roomCurrency !== newCurrency) {
			try {
				newRoomRate = await convertCurrency(
					selectedRoom.base_price || 0,
					roomCurrency,
					newCurrency,
				);
			} catch (error) {
				console.error("Currency conversion error:", error);
				toast({
					title: "Currency Conversion Error",
					description: "Using original room price",
					variant: "destructive",
				});
			}
		}

		const total = Math.round(newRoomRate * selection.nights * 100) / 100;

		updateRoomSelection(selectionId, {
			currency: newCurrency,
			room_rate: Math.round(newRoomRate * 100) / 100,
			total_amount: total,
		});
	};

	const handleDateChange = (
		selectionId: string,
		checkIn: string,
		checkOut: string,
	) => {
		const selection = roomSelections.find((s) => s.id === selectionId);
		if (!selection) return;

		const nights = calculateNights(checkIn, checkOut);
		const total = Math.round(selection.room_rate * nights * 100) / 100;

		// Check if the currently selected room is still available for the new dates
		if (
			selection.room_id &&
			!isRoomAvailableForSelection(selection.room_id, {
				...selection,
				check_in_date: checkIn,
				check_out_date: checkOut,
			})
		) {
			toast({
				title: "Room Unavailable",
				description:
					"The selected room is not available for these dates. Please select a different room.",
				variant: "destructive",
			});
		}

		updateRoomSelection(selectionId, {
			check_in_date: checkIn,
			check_out_date: checkOut,
			nights,
			total_amount: total,
		});
	};

	const handleFieldChange = (
		selectionId: string,
		field: keyof RoomSelection,
		value: any,
	) => {
		updateRoomSelection(selectionId, { [field]: value });
	};

	// Get currency symbol helper
	const getCurrencySymbol = (currency: string) => {
		switch (currency) {
			case "USD":
				return "$";
			case "EUR":
				return "€";
			case "GBP":
				return "£";
			case "LKR":
				return "Rs.";
			default:
				return "";
		}
	};

	// Check if a room is available for the given selection
	const isRoomAvailableForSelection = (
		roomId: string,
		selection: RoomSelection,
	): boolean => {
		if (!selection.check_in_date || !selection.check_out_date) return true; // No dates selected yet

		const checkIn = new Date(selection.check_in_date);
		const checkOut = new Date(selection.check_out_date);

		// Check if dates are valid
		if (isNaN(checkIn.getTime()) || isNaN(checkOut.getTime())) return true;

		return isRangeAvailable(checkIn, checkOut, roomId);
	};

	// Calculate total across all rooms
	const grandTotal = roomSelections.reduce(
		(sum, selection) => sum + selection.total_amount,
		0,
	);

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<h3 className="text-base md:text-lg lg:text-xl font-semibold">Room Selections</h3>
				<Button
					type="button"
					variant="outline"
					size="sm"
					onClick={addRoomSelection}
					className="flex items-center gap-2"
				>
					<Plus className="h-4 w-4" />
					Add Another Room
				</Button>
			</div>

			{roomSelections.map((selection, index) => (
				<Card key={selection.id} className="relative">
					<CardHeader className="pb-4">
						<CardTitle className="flex items-center justify-between text-base">
							<span className="flex items-center gap-2">
								<Calendar className="h-4 w-4" />
								Room {index + 1}
							</span>
							{roomSelections.length > 1 && (
								<Button
									type="button"
									variant="ghost"
									size="sm"
									onClick={() => removeRoomSelection(selection.id)}
									className="text-red-600 hover:text-red-700 h-8 w-8 p-0"
								>
									<Trash2 className="h-4 w-4" />
								</Button>
							)}
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							{/* Room Selection */}
							<div>
								<Label htmlFor={`room-${selection.id}`}>Room *</Label>
								<Select
									value={selection.room_id}
									onValueChange={(value) =>
										handleRoomChange(selection.id, value)
									}
								>
									<SelectTrigger
										id={`room-${selection.id}`}
										className={
											selection.room_id &&
											!isRoomAvailableForSelection(selection.room_id, selection)
												? "border-red-500"
												: ""
										}
									>
										<SelectValue placeholder="Select a room" />
									</SelectTrigger>
									<SelectContent>
										{rooms.map((room) => {
											const isAvailable = isRoomAvailableForSelection(
												room.id,
												selection,
											);
											return (
												<SelectItem
													key={room.id}
													value={room.id}
													disabled={!isAvailable}
													className={
														!isAvailable
															? "opacity-50 text-muted-foreground"
															: ""
													}
												>
													<div className="flex items-center justify-between w-full">
														<span>
															{room.room_number} - {room.room_type} (
															{getCurrencySymbol(room.currency || "LKR")}
															{room.base_price})
														</span>
														{!isAvailable && (
															<span className="text-xs text-red-500 ml-2">
																Unavailable
															</span>
														)}
													</div>
												</SelectItem>
											);
										})}
									</SelectContent>
								</Select>
								{selection.room_id &&
									!isRoomAvailableForSelection(
										selection.room_id,
										selection,
									) && (
										<p className="text-xs text-red-500 mt-1">
											⚠️ This room is not available for the selected dates
										</p>
									)}
							</div>

							{/* Currency Selection */}
							<div>
								<Label>Currency</Label>
								<CurrencySelector
									currency={selection.currency}
									onCurrencyChange={(value) =>
										handleCurrencyChange(selection.id, value)
									}
								/>
							</div>
						</div>

						{/* Date Selection */}
						<div>
							<ReservationDateSelector
								checkInDate={selection.check_in_date}
								checkOutDate={selection.check_out_date}
								onDatesChange={(checkIn, checkOut) =>
									handleDateChange(selection.id, checkIn, checkOut)
								}
								roomId={selection.room_id || undefined}
							/>
						</div>

						<div className="grid grid-cols-1 md:grid-cols-4 gap-4">
							{/* Occupancy */}
							<div>
								<Label htmlFor={`adults-${selection.id}`}>Adults</Label>
								<Input
									id={`adults-${selection.id}`}
									type="number"
									min="1"
									value={selection.adults}
									onChange={(e) =>
										handleFieldChange(
											selection.id,
											"adults",
											Number.parseInt(e.target.value) || 1,
										)
									}
								/>
							</div>

							<div>
								<Label htmlFor={`children-${selection.id}`}>Children</Label>
								<Input
									id={`children-${selection.id}`}
									type="number"
									min="0"
									value={selection.children}
									onChange={(e) =>
										handleFieldChange(
											selection.id,
											"children",
											Number.parseInt(e.target.value) || 0,
										)
									}
								/>
							</div>

							{/* Room Rate */}
							<div>
								<Label htmlFor={`rate-${selection.id}`}>Room Rate</Label>
								<Input
									id={`rate-${selection.id}`}
									type="number"
									step="0.01"
									value={selection.room_rate}
									onChange={(e) => {
										const rate = Number.parseFloat(e.target.value) || 0;
										const total =
											Math.round(rate * selection.nights * 100) / 100;
										updateRoomSelection(selection.id, {
											room_rate: rate,
											total_amount: total,
										});
									}}
								/>
							</div>

							{/* Arrival Time */}
							<div>
								<Label htmlFor={`arrival-${selection.id}`}>Arrival Time</Label>
								<Input
									id={`arrival-${selection.id}`}
									type="time"
									value={selection.arrival_time}
									onChange={(e) =>
										handleFieldChange(
											selection.id,
											"arrival_time",
											e.target.value,
										)
									}
								/>
							</div>
						</div>

						{/* Room Summary */}
						<div className="bg-gray-50 p-3 rounded-md">
							<div className="flex justify-between items-center text-sm">
								<span>Nights: {selection.nights}</span>
								<span className="font-semibold">
									Total: {getCurrencySymbol(selection.currency)}
									{selection.total_amount.toFixed(2)}
								</span>
							</div>
						</div>
					</CardContent>
				</Card>
			))}

			{/* Grand Total */}
			{roomSelections.length > 1 && (
				<Card className="bg-blue-50 border-blue-200">
					<CardContent className="p-4">
						<div className="flex justify-between items-center">
							<span className="text-lg font-semibold">
								Grand Total ({roomSelections.length} rooms):
							</span>
							<span className="text-xl font-bold text-blue-700">
								{getCurrencySymbol(defaultCurrency)}
								{grandTotal.toFixed(2)}
							</span>
						</div>
					</CardContent>
				</Card>
			)}
		</div>
	);
}
