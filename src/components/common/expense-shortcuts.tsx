import { format } from "date-fns";
import { Briefcase, DollarSign, Shirt, User, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/context/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";

type Booking = Tables<"bookings"> & {
	locations: Tables<"locations">;
};

type Account = Tables<"accounts">;

interface ExpenseShortcutsProps {
	locationId: string;
	accounts: Account[];
	onQuickFill: (data: {
		mainCategory: string;
		subCategory: string;
		amount: string;
		accountId: string;
		date: string;
		note: string;
	}) => void;
}

export function ExpenseShortcuts({
	locationId,
	accounts,
	onQuickFill,
}: ExpenseShortcutsProps) {
	const { tenant } = useAuth();
	const [todaysBookings, setTodaysBookings] = useState<Booking[]>([]);
	const [usedShortcuts, setUsedShortcuts] = useState<Set<string>>(new Set());
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		const fetchTodaysBookings = async () => {
			if (!tenant?.id) return;

			try {
				const today = format(new Date(), "yyyy-MM-dd");

				// Check for bookings where today is between check-in and check-out dates
				const { data: bookingsData } = await supabase
					.from("bookings")
					.select(`
            *,
            locations (*)
          `)
					.eq("tenant_id", tenant.id)
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
	}, [locationId, tenant?.id]);

	const getAccountForExpense = (locationName: string): Account | undefined => {
		// Look for accounts that contain location-specific identifiers
		if (locationName.toLowerCase().includes("rusty")) {
			return accounts.find(
				(acc) => acc.name.includes("RB-CASH") || acc.name.includes("Rusty"),
			);
		} else if (locationName.toLowerCase().includes("asaliya")) {
			return accounts.find((acc) => acc.name.includes("Asaliya"));
		}

		// Fallback: try to find account with location name or use first account
		const locationAccount = accounts.find((acc) =>
			acc.name.toLowerCase().includes(locationName.toLowerCase()),
		);
		return locationAccount || accounts[0];
	};

	const getExpenseShortcuts = () => {
		if (todaysBookings.length === 0) return [];

		const location = todaysBookings[0]?.locations;
		const shortcuts = [];

		// Staff - Caretaker shortcut
		const staffAccount = getAccountForExpense(location.name);
		if (staffAccount) {
			const amount = location.name.toLowerCase().includes("rusty")
				? "1500"
				: "2000";
			const staffName = location.name.toLowerCase().includes("rusty")
				? "Nilu"
				: "Tharanga";
			const shortcutId = `staff-${locationId}-${format(new Date(), "yyyy-MM-dd")}`;

			if (!usedShortcuts.has(shortcutId)) {
				shortcuts.push({
					id: shortcutId,
					type: "staff",
					icon: <Briefcase className="size-4" />,
					title: "Staff - Caretaker",
					amount,
					currency: "Rs.", // Always LKR for these shortcuts
					account: staffAccount,
					note: `${staffName} salary - ${format(new Date(), "MMM dd, yyyy")} + Rs.${amount}`,
					mainCategory: "Staff",
					subCategory: "Caretaker",
				});
			}
		}

		// Laundry shortcut (only for locations that include "rusty")
		if (location.name.toLowerCase().includes("rusty")) {
			const laundryAccount = getAccountForExpense(location.name);
			if (laundryAccount) {
				const shortcutId = `laundry-${locationId}-${format(new Date(), "yyyy-MM-dd")}`;

				if (!usedShortcuts.has(shortcutId)) {
					shortcuts.push({
						id: shortcutId,
						type: "laundry",
						icon: <Shirt className="size-4" />,
						title: "Laundry - External Service",
						amount: "2000",
						currency: "Rs.", // Always LKR
						account: laundryAccount,
						note: `Laundry service - ${format(new Date(), "MMM dd, yyyy")} + Rs.2000`,
						mainCategory: "Laundry",
						subCategory: "External Service",
					});
				}
			}
		}

		return shortcuts;
	};

	const handleQuickFill = (shortcut: any) => {
		console.log("ExpenseShortcuts - handleQuickFill called with:", shortcut);
		console.log("ExpenseShortcuts - exact data being sent:", {
			mainCategory: shortcut.mainCategory,
			subCategory: shortcut.subCategory,
			amount: shortcut.amount,
			accountId: shortcut.account.id,
			date: format(new Date(), "yyyy-MM-dd"),
			note: shortcut.note,
		});

		onQuickFill({
			mainCategory: shortcut.mainCategory,
			subCategory: shortcut.subCategory,
			amount: shortcut.amount,
			accountId: shortcut.account.id,
			date: format(new Date(), "yyyy-MM-dd"),
			note: shortcut.note,
		});

		// Hide this shortcut after using
		setUsedShortcuts((prev) => new Set([...prev, shortcut.id]));
	};

	if (loading) {
		return (
			<div className="animate-pulse">
				<div className="h-20 bg-gray-200 rounded-lg"></div>
			</div>
		);
	}

	const shortcuts = getExpenseShortcuts();

	if (shortcuts.length === 0) {
		return null;
	}

	return (
		<Card className="border-border">
			<CardHeader className="pb-3">
				<CardTitle className="text-orange-800 flex items-center gap-2 text-sm md:text-base lg:text-lg">
					<Zap className="size-4" />
					Today's Expense Shortcuts
				</CardTitle>
			</CardHeader>
			<CardContent className="p-4 sm:p-6 space-y-3">
				<div className="grid grid-cols-1 gap-3">
					{shortcuts.map((shortcut) => (
						<Button
							key={shortcut.id}
							variant="outline"
							className="w-full p-4 sm:p-6 h-auto flex flex-col items-start gap-2 hover:transition-all border-border bg-primary"
							onClick={() => handleQuickFill(shortcut)}
						>
							<div className="flex items-center justify-between w-full">
								<div className="flex items-center gap-2">
									{shortcut.icon}
									<Badge variant="secondary" className="text-xs">
										{shortcut.title}
									</Badge>
								</div>
								<div className="flex flex-col items-end text-sm">
									<div className="flex items-center gap-1 font-medium">
										<DollarSign className="h-3 w-3" />
										{shortcut.currency}
										{parseInt(shortcut.amount).toLocaleString()}
									</div>
								</div>
							</div>

							<div className="w-full text-left space-y-1">
								<div className="flex items-center gap-2 text-sm">
									<User className="h-3 w-3" />
									<span className="font-medium">
										{shortcut.account.name} ({shortcut.account.currency})
									</span>
								</div>

								<div className="text-xs text-muted-foreground">
									<span>{shortcut.note}</span>
								</div>
							</div>
						</Button>
					))}
				</div>

				<div className="text-xs text-orange-600 text-center mt-2 italic">
					Tap any expense to auto-fill the form
				</div>
			</CardContent>
		</Card>
	);
}
