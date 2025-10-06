import { format } from "date-fns";
import { Calendar, DollarSign, MapPin, User, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Database, Tables } from "@/integrations/supabase/types";
import { getCurrencySymbol } from "@/utils/currency";

type Booking = Tables<"bookings"> & {
	locations: Tables<"locations">;
	booking_payments: Array<{
		amount: number;
		is_advance: boolean;
		account_id: string;
	}>;
};

type Account = Tables<"accounts">;

interface BookingShortcutsProps {
	locationId: string;
	accounts: Account[];
	onQuickFill: (data: {
		type: Database["public"]["Enums"]["income_type"];
		amount: string;
		accountId: string;
		dateFrom: string;
		dateTo: string;
		bookingSource: Database["public"]["Enums"]["booking_source"];
		guestName: string;
	}) => void;
}

export function BookingShortcuts({
	locationId,
	accounts,
	onQuickFill,
}: BookingShortcutsProps) {
	const [todaysBookings, setTodaysBookings] = useState<Booking[]>([]);
	const [usedShortcuts, setUsedShortcuts] = useState<Set<string>>(new Set());
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		const fetchTodaysBookings = async () => {
			try {
				const today = format(new Date(), "yyyy-MM-dd");

				// Check for bookings where today is between check-in and check-out dates
				const { data: bookingsData } = await supabase
					.from("bookings")
					.select(`
            *,
            locations (*),
            booking_payments (
              amount,
              is_advance,
              account_id
            )
          `)
					.eq("location_id", locationId)
					.lte("check_in", today)
					.gt("check_out", today); // Check-out is after today (guests still here)

				setTodaysBookings(bookingsData || []);
			} catch (error) {
				console.error("Error fetching today's bookings:", error);
			} finally {
				setLoading(false);
			}
		};

		if (locationId) {
			fetchTodaysBookings();
		}
	}, [locationId]);

	const getAccountForBooking = (booking: Booking): Account | undefined => {
		const locationName = booking.locations.name;
		const source = booking.source;

		// Account mapping logic based on location and source
		// Look for accounts that contain location-specific identifiers
		if (locationName.toLowerCase().includes("rusty")) {
			if (source === "booking_com") {
				return accounts.find(
					(acc) => acc.name.includes("RB-CASH") || acc.name.includes("Rusty"),
				);
			} else if (source === "airbnb") {
				return accounts.find((acc) => acc.name === "Payoneer jayathu");
			} else {
				return accounts.find(
					(acc) => acc.name.includes("RB-CASH") || acc.name.includes("Rusty"),
				);
			}
		} else if (locationName.toLowerCase().includes("asaliya")) {
			if (source === "airbnb") {
				return accounts.find((acc) => acc.name === "Payoneer jayathu");
			} else {
				return accounts.find((acc) => acc.name.includes("Asaliya"));
			}
		}

		// Fallback: try to find account with location name or use first account
		const locationAccount = accounts.find((acc) =>
			acc.name.toLowerCase().includes(locationName.toLowerCase()),
		);
		return locationAccount || accounts[0];
	};

	const getSourceIcon = (source: string) => {
		const icons = {
			booking_com: "🏨",
			airbnb: "🏠",
			direct: "📞",
		};
		return icons[source as keyof typeof icons] || "📅";
	};

	const getSourceColor = (source: string) => {
		const colors = {
			booking_com: "border-yellow-300 bg-yellow-50",
			airbnb: "border-pink-300 bg-pink-50",
			direct: "border-border bg-orange-50",
		};
		return (
			colors[source as keyof typeof colors] || "border-gray-300 bg-gray-50"
		);
	};

	const getAdvancePaid = (booking: Booking): number => {
		return (
			booking.booking_payments
				?.filter((payment) => payment.is_advance)
				.reduce((total, payment) => total + payment.amount, 0) || 0
		);
	};

	const getRemainingAmount = (booking: Booking): number => {
		const totalAmount = booking.total_amount || 25000; // Default to 25000 if no total set
		const advancePaid = getAdvancePaid(booking);
		return Math.max(0, totalAmount - advancePaid);
	};

	const formatBookingDetails = (booking: Booking): string => {
		const totalAmount = booking.total_amount || 25000;
		const advancePaid = getAdvancePaid(booking);
		const remaining = getRemainingAmount(booking);
		const checkIn = format(new Date(booking.check_in), "MMM dd, yyyy");
		const checkOut = format(new Date(booking.check_out), "MMM dd, yyyy");

		let details = `Guest: ${booking.guest_name}\n`;
		details += `Check-in: ${checkIn} | Check-out: ${checkOut}\n`;
		details += `Total Booking: Rs.${totalAmount.toLocaleString()}\n`;

		if (advancePaid > 0) {
			details += `Advance Paid: Rs.${advancePaid.toLocaleString()}\n`;
			details += `Remaining Balance: Rs.${remaining.toLocaleString()}\n`;
		}

		details += `Source: ${
			booking.source === "booking_com"
				? "Booking.com"
				: booking.source === "airbnb"
					? "Airbnb"
					: "Direct"
		}`;

		return details;
	};

	const handleQuickFill = (booking: Booking) => {
		const account = getAccountForBooking(booking);
		if (!account) return;

		const checkInDate = format(new Date(booking.check_in), "yyyy-MM-dd");
		const checkOutDate = format(new Date(booking.check_out), "yyyy-MM-dd");
		const remainingAmount = getRemainingAmount(booking);

		onQuickFill({
			type: "booking",
			amount: remainingAmount.toString(),
			accountId: account.id,
			dateFrom: checkInDate,
			dateTo: checkOutDate,
			bookingSource: booking.source,
			guestName: formatBookingDetails(booking),
		});

		// Hide this shortcut after using
		setUsedShortcuts((prev) => new Set([...prev, booking.id]));
	};

	if (loading) {
		return (
			<div className="animate-pulse">
				<div className="h-20 bg-gray-200 rounded-lg"></div>
			</div>
		);
	}

	if (todaysBookings.length === 0) {
		return null;
	}

	return (
		<Card className="border-blue-200 bg-blue-50">
			<CardHeader className="pb-3">
				<CardTitle className="text-blue-800 flex items-center gap-2 text-sm md:text-base lg:text-lg">
					<Zap className="size-4" />
					Today's Booking Shortcuts
				</CardTitle>
			</CardHeader>
			<CardContent className="p-4 space-y-3">
				<div className="grid grid-cols-1 gap-3">
					{todaysBookings
						.filter((booking) => !usedShortcuts.has(booking.id))
						.map((booking) => {
							const account = getAccountForBooking(booking);
							const currencySymbol = account?.currency
								? getCurrencySymbol(account.currency)
								: "Rs.";
							const totalAmount = booking.total_amount || 25000;
							const advancePaid = getAdvancePaid(booking);
							const remainingAmount = getRemainingAmount(booking);

							return (
								<Button
									key={booking.id}
									variant="outline"
									className={`w-full p-4 h-auto flex flex-col items-start gap-2 hover:transition-all ${getSourceColor(booking.source)}`}
									onClick={() => handleQuickFill(booking)}
								>
									<div className="flex items-center justify-between w-full">
										<div className="flex items-center gap-2">
											<span className="text-lg">
												{getSourceIcon(booking.source)}
											</span>
											<Badge variant="secondary" className="text-xs">
												{booking.source === "booking_com"
													? "Booking.com"
													: booking.source === "airbnb"
														? "Airbnb"
														: "Direct"}
											</Badge>
										</div>
										<div className="flex flex-col items-end text-sm">
											<div className="flex items-center gap-1 font-medium">
												<DollarSign className="h-3 w-3" />
												{currencySymbol}
												{remainingAmount.toLocaleString()}
											</div>
											{advancePaid > 0 && (
												<div className="text-xs text-muted-foreground">
													Total: {currencySymbol}
													{totalAmount.toLocaleString()}
												</div>
											)}
										</div>
									</div>

									<div className="w-full text-left space-y-1">
										<div className="flex items-center gap-2 text-sm">
											<User className="h-3 w-3" />
											<span className="font-medium">{booking.guest_name}</span>
										</div>

										{advancePaid > 0 && (
											<div className="flex items-center gap-2 text-xs text-green-600 font-medium">
												<span>
													💰 Advance: {currencySymbol}
													{advancePaid.toLocaleString()}
												</span>
											</div>
										)}

										<div className="flex items-center gap-2 text-xs text-muted-foreground">
											<Calendar className="h-3 w-3" />
											<span>
												{format(new Date(booking.check_in), "MMM dd")} -{" "}
												{format(new Date(booking.check_out), "MMM dd")}
											</span>
										</div>

										<div className="flex items-center gap-2 text-xs text-muted-foreground">
											<MapPin className="h-3 w-3" />
											<span>
												{account?.name} ({account?.currency})
											</span>
										</div>
									</div>
								</Button>
							);
						})}
				</div>

				<div className="text-xs text-blue-600 text-center mt-2 italic">
					Tap any booking to auto-fill the form with suggested values
				</div>
			</CardContent>
		</Card>
	);
}
