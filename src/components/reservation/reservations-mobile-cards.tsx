import { Calendar, DollarSign, MapPin } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ReservationsListSkeleton } from "@/components/skeleton/reservations-list-skeleton";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/context/auth-context";
import { useLocationContext } from "@/context/location-context";
import { useReservationPrint } from "@/hooks/use-reservation-print";
import { useReservationsData } from "@/hooks/use-reservations-data";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";
import { convertCurrency, getCurrencySymbol } from "@/utils/currency";
import { ReservationActions } from "./reservation-actions";
import { ReservationExpensesDisplay } from "./reservation-expenses-display";

type Currency = string;

interface ReservationsMobileCardsProps {
	searchQuery: string;
	statusFilter: string;
	selectedCurrency: Currency;
	onViewReservation: (id: string) => void;
	onEditReservation: (reservation: any) => void;
	onPayment: (reservationId: string, amount: number, currency: string) => void;
	onAddIncome: (reservation: any) => void;
}

export function ReservationsMobileCards({
	searchQuery,
	statusFilter,
	selectedCurrency,
	onViewReservation,
	onEditReservation,
	onPayment,
	onAddIncome,
}: ReservationsMobileCardsProps) {
	const { t } = useTranslation();
	const { toast } = useToast();
	const { reservations, loading } = useReservationsData();
	const { printReservation } = useReservationPrint();
	const { tenant } = useAuth();
	const { selectedLocation } = useLocationContext();

	// State for converted amounts
	const [convertedAmounts, setConvertedAmounts] = useState<
		Record<string, number>
	>({});

	// Effect to convert amounts when currency or reservations change
	useEffect(() => {
		if (!tenant?.id || !selectedLocation) {
			return;
		}

		const convertAmounts = async () => {
			if (!reservations.length) return;

			const newConvertedAmounts: Record<string, number> = {};

			for (const reservation of reservations) {
				const roomAmount = reservation.room_rate * reservation.nights;
				try {
					const convertedAmount = await convertCurrency(
						roomAmount,
						reservation.currency,
						selectedCurrency,
						tenant.id,
						selectedLocation,
					);
					newConvertedAmounts[reservation.id] = convertedAmount;
				} catch (error) {
					console.error(
						`Failed to convert currency for reservation ${reservation.id}:`,
						error,
					);
					newConvertedAmounts[reservation.id] = roomAmount; // Fallback to original amount
				}
			}

			setConvertedAmounts(newConvertedAmounts);
		};

		convertAmounts();
	}, [reservations, selectedCurrency, tenant?.id, selectedLocation]); // Utility functions
	const getStatusColor = (status: string): string => {
		const colors: Record<string, string> = {
			confirmed: "bg-emerald-50 text-emerald-700 border-emerald-200",
			pending: "bg-amber-50 text-amber-700 border-amber-200",
			cancelled: "bg-rose-50 text-rose-700 border-rose-200",
			checked_in: "bg-blue-50 text-blue-700 border-blue-200",
			checked_out: "bg-slate-50 text-slate-600 border-slate-200",
			tentative: "bg-amber-50 text-amber-700 border-amber-200",
		};
		return colors[status] || "bg-slate-50 text-slate-600 border-slate-200";
	};

	const getStatusText = (status: string) => {
		switch (status?.toLowerCase()) {
			case "confirmed":
				return t("reservations.status.confirmed");
			case "checked_in":
				return t("reservations.status.checked_in");
			case "checked_out":
				return t("reservations.status.checked_out");
			case "cancelled":
				return t("reservations.status.cancelled");
			case "tentative":
				return t("reservations.status.tentative");
			default:
				return status;
		}
	};

	const canShowPaymentButton = (reservation: any): boolean => {
		return (
			reservation.status !== "cancelled" && reservation.status !== "checked_out"
		);
	};

	const getTotalPayableAmount = (reservation: any): number => {
		// Use database-calculated total that includes room amount and pending services
		// The trigger already calculates: balance_amount = (total_amount + pending_income) - paid_amount
		// So total payable = total_amount + pending services = paid_amount + balance_amount
		return (reservation.paid_amount || 0) + (reservation.balance_amount || 0);
	};

	// Transform reservation data for printing
	const transformToPrintableData = (reservation: any) => {
		return {
			...reservation,
			// Enhanced hotel/tenant information from context
			tenant_name: tenant?.hotel_name || tenant?.name,
			hotel_name: tenant?.hotel_name || tenant?.name,
			hotel_address: tenant?.hotel_address,
			hotel_phone: tenant?.hotel_phone,
			hotel_email: tenant?.hotel_email,
			hotel_website: tenant?.hotel_website,
			logo_url: tenant?.logo_url,

			// Enhanced location information
			location_name: reservation.locations?.name || "Unknown Location",
			location_address: reservation.locations?.address || null,
			location_phone: reservation.locations?.phone || null,
			location_email: reservation.locations?.email || null,

			// Room details
			room_number: reservation.rooms?.room_number || "Unknown Room",
			room_type: reservation.rooms?.room_type || "Unknown Type",
			bed_type: reservation.rooms?.bed_type || null,
			room_description: reservation.rooms?.description || null,
			amenities: reservation.rooms?.amenities || [],
		};
	};

	const handlePrintReservation = (reservation: any) => {
		// Validate that we have the required data before printing
		if (!reservation) {
			console.error("[Print] No reservation data provided");
			toast({
				title: t("common.error"),
				description: "Cannot print: No reservation data available",
				variant: "destructive",
			});
			return;
		}

		if (!reservation.id || !reservation.reservation_number) {
			console.error("[Print] Missing required fields:", {
				id: reservation.id,
				reservation_number: reservation.reservation_number,
			});
			toast({
				title: t("common.error"),
				description: "Cannot print: Incomplete reservation data",
				variant: "destructive",
			});
			return;
		}

		const printableData = transformToPrintableData(reservation);
		printReservation(printableData);
	};

	// Filter and organize reservations
	const filteredReservations = reservations.filter((reservation) => {
		const matchesSearch =
			searchQuery === "" ||
			reservation.reservation_number
				?.toLowerCase()
				.includes(searchQuery.toLowerCase()) ||
			reservation.guest_name?.toLowerCase().includes(searchQuery.toLowerCase());

		const matchesStatus =
			statusFilter === "all" || reservation.status === statusFilter;

		return matchesSearch && matchesStatus;
	});

	// Separate active and checked-out reservations
	const activeReservations = filteredReservations
		.filter((r) => r.status !== "checked_out" && r.status !== "cancelled")
		.sort((a, b) => {
			// Sort by check-in date (upcoming first)
			return new Date(a.check_in_date).getTime() - new Date(b.check_in_date).getTime();
		});

	const completedReservations = filteredReservations
		.filter((r) => r.status === "checked_out" || r.status === "cancelled")
		.sort((a, b) => {
			// Sort by check-out date (most recent first)
			return new Date(b.check_out_date).getTime() - new Date(a.check_out_date).getTime();
		});

	if (loading) {
		return <ReservationsListSkeleton />;
	}

	return (
		<div className="lg:hidden space-y-6">
			{/* Active Reservations Section */}
			{activeReservations.length > 0 && (
				<div className="space-y-3">
					<div className="flex items-center gap-2 px-1">
						<span className="h-2 w-2 rounded-full bg-blue-500"></span>
						<h3 className="text-sm font-medium text-slate-700">
							{t("reservations.sections.active")} ({activeReservations.length})
						</h3>
					</div>
					<div className="grid gap-3">
						{activeReservations.map((reservation) => (
							<Card 
								key={reservation.id} 
								className="border-l-4 border-l-blue-500 shadow-sm hover:shadow-md transition-shadow"
							>
								<CardContent className="p-4">
									<div className="flex justify-between items-start mb-3">
										<div className="flex-1">
											<div className="flex items-center gap-2 mb-1">
												<h3 className="font-semibold text-sm text-slate-900">
													{reservation.rooms?.room_number} - {reservation.rooms?.room_type}
												</h3>
												<Badge
													variant="outline"
													className={`text-xs font-normal ${getStatusColor(reservation.status)}`}
												>
													{getStatusText(reservation.status)}
												</Badge>
											</div>
											<p className="text-slate-600 text-xs">
												{reservation.guest_name}
											</p>
										</div>
									</div>

									<div className="space-y-2 text-xs mb-3">
										<div className="flex items-center gap-2 text-slate-600">
											<Calendar className="h-3 w-3" />
											<span>
												{new Date(reservation.check_in_date).toLocaleDateString("en-US", {
													month: "short",
													day: "numeric",
													year: "numeric",
												})} - {new Date(reservation.check_out_date).toLocaleDateString("en-US", {
													month: "short",
													day: "numeric",
													year: "numeric",
												})}
											</span>
										</div>
										<div className="flex items-center gap-2 text-slate-600">
											<span className="text-slate-400">
												({reservation.nights} {reservation.nights === 1 ? "night" : "nights"})
											</span>
										</div>
									</div>

									<div className="flex justify-between items-center pt-3 border-t border-slate-100 mb-3">
										<div className="flex flex-col gap-1">
											<span className="text-xs text-slate-600">Total Amount</span>
											<span className="font-semibold text-sm text-slate-900">
												{getCurrencySymbol(selectedCurrency)}{" "}
												{(convertedAmounts[reservation.id] || 0).toLocaleString()}
											</span>
										</div>
										<div className="flex flex-col gap-1 items-end">
											<span className="text-xs text-slate-600">Balance</span>
											<span className={`font-semibold text-sm ${
												reservation.balance_amount > 0 ? "text-rose-600" : "text-emerald-600"
											}`}>
												{getCurrencySymbol(selectedCurrency)}{" "}
												{(reservation.balance_amount || 0).toLocaleString()}
											</span>
										</div>
									</div>

									<ReservationActions
										reservation={reservation}
										onView={() => onViewReservation(reservation.id)}
										onEdit={() => onEditReservation(reservation)}
										onPayment={() =>
											onPayment(
												reservation.id,
												getTotalPayableAmount(reservation),
												reservation.currency,
											)
										}
										onAddIncome={() => onAddIncome(reservation)}
										onPrint={() => handlePrintReservation(reservation)}
										canShowPayment={canShowPaymentButton(reservation)}
										isMobile={true}
										showPaymentAndIncome={true}
									/>
								</CardContent>
							</Card>
						))}
					</div>
				</div>
			)}

			{/* Completed Reservations Section */}
			{completedReservations.length > 0 && (
				<div className="space-y-3">
					<div className="flex items-center gap-2 px-1 pt-2">
						<span className="h-2 w-2 rounded-full bg-slate-400"></span>
						<h3 className="text-sm font-medium text-slate-500">
							{t("reservations.sections.completed")} ({completedReservations.length})
						</h3>
					</div>
					<div className="grid gap-3">
						{completedReservations.map((reservation) => (
							<Card 
								key={reservation.id} 
								className="border-slate-200 shadow-sm opacity-70"
							>
								<CardContent className="p-4">
									<div className="flex justify-between items-start mb-3">
										<div className="flex-1">
											<div className="flex items-center gap-2 mb-1">
												<h3 className="font-semibold text-sm text-slate-700">
													{reservation.rooms?.room_number} - {reservation.rooms?.room_type}
												</h3>
												<Badge
													variant="outline"
													className={`text-xs font-normal ${getStatusColor(reservation.status)}`}
												>
													{getStatusText(reservation.status)}
												</Badge>
											</div>
											<p className="text-slate-500 text-xs">
												{reservation.guest_name}
											</p>
										</div>
									</div>

									<div className="space-y-2 text-xs mb-3">
										<div className="flex items-center gap-2 text-slate-600">
											<Calendar className="h-3 w-3" />
											<span>
												{new Date(reservation.check_in_date).toLocaleDateString("en-US", {
													month: "short",
													day: "numeric",
													year: "numeric",
												})} - {new Date(reservation.check_out_date).toLocaleDateString("en-US", {
													month: "short",
													day: "numeric",
													year: "numeric",
												})}
											</span>
										</div>
										<div className="flex items-center gap-2 text-slate-600">
											<span className="text-slate-400">
												({reservation.nights} {reservation.nights === 1 ? "night" : "nights"})
											</span>
										</div>
									</div>

									<div className="flex justify-between items-center pt-3 border-t border-slate-100 mb-3">
										<div className="flex flex-col gap-1">
											<span className="text-xs text-slate-600">Total Amount</span>
											<span className="font-semibold text-sm text-slate-700">
												{getCurrencySymbol(selectedCurrency)}{" "}
												{(convertedAmounts[reservation.id] || 0).toLocaleString()}
											</span>
										</div>
										<div className="flex flex-col gap-1 items-end">
											<span className="text-xs text-slate-600">Balance</span>
											<span className="font-semibold text-sm text-slate-600">
												{getCurrencySymbol(selectedCurrency)}{" "}
												{(reservation.balance_amount || 0).toLocaleString()}
											</span>
										</div>
									</div>

									<ReservationActions
										reservation={reservation}
										onView={() => onViewReservation(reservation.id)}
										onEdit={() => onEditReservation(reservation)}
										onPayment={() =>
											onPayment(
												reservation.id,
												getTotalPayableAmount(reservation),
												reservation.currency,
											)
										}
										onAddIncome={() => onAddIncome(reservation)}
										onPrint={() => handlePrintReservation(reservation)}
										canShowPayment={canShowPaymentButton(reservation)}
										isMobile={true}
										showPaymentAndIncome={true}
									/>
								</CardContent>
							</Card>
						))}
					</div>
				</div>
			)}

			{/* Empty state */}
			{activeReservations.length === 0 && completedReservations.length === 0 && (
				<div className="text-center py-8 text-slate-500">
					{t("reservations.noReservationsFound")}
				</div>
			)}
		</div>
	);
}
