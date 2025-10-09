import {
	Calendar,
	CreditCard,
	DollarSign,
	Edit,
	Eye,
	MapPin,
	Printer,
} from "lucide-react";
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ReservationsListSkeleton } from "@/components/skeleton/reservations-list-skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { useLocationContext } from "@/context/location-context";
import {
	type ReservationFinancial,
	useReservationFinancials,
} from "@/hooks/use-reservation-financials";
import { useTenant } from "@/hooks/use-tenant";
import type { Database } from "@/integrations/supabase/types";
import { convertCurrency, getCurrencySymbol } from "@/utils/currency";

type Currency = Database["public"]["Enums"]["currency_type"];

const formatCurrency = (amount: number, currency: Currency) => {
	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: currency,
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	}).format(amount);
};

const getStatusColor = (status: string) => {
	switch (status?.toLowerCase()) {
		case "confirmed":
			return "bg-green-100 text-green-800";
		case "checked_in":
			return "bg-blue-100 text-blue-800";
		case "checked_out":
			return "bg-gray-100 text-gray-800";
		case "cancelled":
			return "bg-red-100 text-red-800";
		case "tentative":
			return "bg-yellow-100 text-yellow-800";
		default:
			return "bg-gray-100 text-gray-800";
	}
};

const getStatusText = (status: string, t: any) => {
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

const formatDate = (dateString: string) => {
	return new Date(dateString).toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
	});
};

interface ReservationsDesktopTableProps {
	searchQuery: string;
	statusFilter: string;
	selectedCurrency: Currency;
	onViewReservation: (id: string) => void;
	onEditReservation: (reservation: any) => void;
	onPayment: (reservationId: string, amount: number, currency: string) => void;
	onAddIncome: (reservation: any) => void;
	onPrint: (reservation: any) => void;
}

export function ReservationsDesktopTable({
	searchQuery,
	statusFilter,
	selectedCurrency,
	onViewReservation,
	onEditReservation,
	onPayment,
	onAddIncome,
	onPrint,
}: ReservationsDesktopTableProps) {
	const { t } = useTranslation();
	const { data: reservations, isLoading, error } = useReservationFinancials();
	const { tenant } = useTenant();
	const { selectedLocation } = useLocationContext();

	// State for converted amounts
	const [convertedAmounts, setConvertedAmounts] = useState<
		Record<
			string,
			{
				roomAmount: number;
				expensesAmount: number;
				paidAmount: number;
				balanceAmount: number;
			}
		>
	>({});

	// Convert currency amounts when selectedCurrency changes
	useEffect(() => {
		const convertAmounts = async () => {
			if (!reservations) return;

			const newConvertedAmounts: typeof convertedAmounts = {};

			for (const reservation of reservations) {
				try {
					const [roomAmount, expensesAmount, paidAmount, balanceAmount] =
						await Promise.all([
							convertCurrency(
								reservation.room_amount_usd,
								"USD",
								selectedCurrency,
								tenant?.id!,
								selectedLocation!,
							),
							convertCurrency(
								reservation.expenses_usd,
								"USD",
								selectedCurrency,
								tenant?.id!,
								selectedLocation!,
							),
							convertCurrency(
								reservation.user_paid_amount_usd,
								"USD",
								selectedCurrency,
								tenant?.id!,
								selectedLocation!,
							),
							convertCurrency(
								reservation.needs_to_pay_usd,
								"USD",
								selectedCurrency,
								tenant?.id!,
								selectedLocation!,
							),
						]);

					newConvertedAmounts[reservation.id] = {
						roomAmount,
						expensesAmount,
						paidAmount,
						balanceAmount,
					};
				} catch (error) {
					console.error(
						`Failed to convert currency for reservation ${reservation.id}:`,
						error,
					);
					// Fallback to USD amounts
					newConvertedAmounts[reservation.id] = {
						roomAmount: reservation.room_amount_usd,
						expensesAmount: reservation.expenses_usd,
						paidAmount: reservation.user_paid_amount_usd,
						balanceAmount: reservation.needs_to_pay_usd,
					};
				}
			}

			setConvertedAmounts(newConvertedAmounts);
		};

		convertAmounts();
	}, [reservations, selectedCurrency, tenant?.id, selectedLocation]);

	// Filter reservations
	const filteredReservations =
		reservations?.filter((reservation) => {
			const matchesSearch =
				searchQuery === "" ||
				reservation.reservation_number
					?.toLowerCase()
					.includes(searchQuery.toLowerCase()) ||
				reservation.guest_name
					?.toLowerCase()
					.includes(searchQuery.toLowerCase());

			const matchesStatus =
				statusFilter === "all" || reservation.status === statusFilter;

			return matchesSearch && matchesStatus;
		}) || [];

	const canShowPaymentButton = (reservation: ReservationFinancial): boolean => {
		return (
			reservation.status !== "cancelled" && reservation.status !== "checked_out"
		);
	};

	if (isLoading) {
		return <ReservationsListSkeleton />;
	}

	if (error) {
		return (
			<div className="text-red-500 p-4">
				Error loading reservations: {String(error)}
			</div>
		);
	}

	if (!reservations || reservations.length === 0) {
		return (
			<div className="text-center py-8 text-gray-500">
				No reservations found. Create your first reservation to get started.
			</div>
		);
	}

	return (
		<div className="hidden lg:block">
			<Card>
				<CardContent>
					<Table data-testid="reservations-table">
						<TableHeader>
							<TableRow>
								<TableHead>
									{t("reservations.table.headers.reservation")}
								</TableHead>
								<TableHead>{t("reservations.table.headers.amount")}</TableHead>
								<TableHead>{t("reservations.expenses.title")}</TableHead>
								<TableHead>{t("reservations.table.headers.paid")}</TableHead>
								<TableHead>{t("reservations.table.headers.balance")}</TableHead>
								<TableHead>
									{t("reservations.reservationActions.quickActions")}
								</TableHead>
								<TableHead className="text-right">
									{t("reservations.reservationActions.moreActions")}
								</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{filteredReservations.map((reservation) => (
								<TableRow key={reservation.id} className="hover:bg-gray-50">
									<TableCell>
										<div className="space-y-1">
											<div className="flex items-center gap-2">
												<span className="font-medium text-blue-600">
													{reservation.reservation_number}
												</span>
												<Badge
													className={`text-xs ${getStatusColor(reservation.status)}`}
												>
													{getStatusText(reservation.status, t)}
												</Badge>
											</div>
											<div className="text-sm text-gray-600">
												{reservation.guest_name}
											</div>
											<div className="flex flex-col items-start pt-4 gap-1 text-xs text-gray-500">
												<div className="flex items-center gap-1">
													<MapPin className="h-3 w-3" />
													{reservation.rooms?.room_number || "N/A"} -{" "}
													{reservation.rooms?.room_type || "N/A"}
												</div>
												<div className="flex items-center gap-1">
													<Calendar className="h-3 w-3" />
													{formatDate(reservation.check_in_date)} -{" "}
													{formatDate(reservation.check_out_date)}
												</div>
												<div className="text-xs">
													({reservation.nights}{" "}
													{reservation.nights === 1 ? "night" : "nights"})
												</div>
											</div>
										</div>
									</TableCell>
									<TableCell>
										<div className="font-medium text-green-600">
											{formatCurrency(
												convertedAmounts[reservation.id]?.roomAmount || 0,
												selectedCurrency,
											)}
										</div>
										<div className="text-xs text-gray-500">
											{reservation.nights} nights
										</div>
									</TableCell>
									<TableCell>
										<div className="font-medium text-orange-600">
											{formatCurrency(
												convertedAmounts[reservation.id]?.expensesAmount || 0,
												selectedCurrency,
											)}
										</div>
									</TableCell>
									<TableCell>
										<div className="font-medium text-blue-600">
											{formatCurrency(
												convertedAmounts[reservation.id]?.paidAmount || 0,
												selectedCurrency,
											)}
										</div>
									</TableCell>
									<TableCell>
										<div
											className={`font-medium ${
												reservation.needs_to_pay_usd > 0
													? "text-red-600"
													: "text-green-600"
											}`}
										>
											{formatCurrency(
												convertedAmounts[reservation.id]?.balanceAmount || 0,
												selectedCurrency,
											)}
										</div>
									</TableCell>
									<TableCell>
										<div className="flex gap-1">
											<Button
												variant="outline"
												size="sm"
												onClick={() => onAddIncome(reservation)}
												className="text-blue-600 hover:text-blue-700 cursor-pointer"
												disabled={reservation.status === "checked_out"}
												title={
													reservation.status === "checked_out"
														? t(
																"reservations.table.actions.reservationCompleted",
															)
														: ""
												}
											>
												<DollarSign className="size-4 mr-1" />
												{t("reservations.table.actions.addIncome")}
											</Button>
											{canShowPaymentButton(reservation) &&
												reservation.status !== "checked_out" && (
													<Button
														variant="outline"
														size="sm"
														onClick={() =>
															onPayment(
																reservation.id,
																reservation.needs_to_pay_usd,
																"USD", // Always USD for simplified calculations
															)
														}
														className="text-green-600 hover:text-green-700 cursor-pointer"
													>
														<CreditCard className="size-4 mr-1" />
														{t("reservations.table.actions.payNow")}
													</Button>
												)}
										</div>
									</TableCell>
									<TableCell className="text-right">
										<div className="flex gap-1 justify-end">
											<Button
												variant="ghost"
												size="sm"
												onClick={() => onViewReservation(reservation.id)}
												className="h-8 w-8 p-0"
											>
												<Eye className="h-4 w-4" />
											</Button>
											<Button
												variant="ghost"
												size="sm"
												onClick={() => onEditReservation(reservation)}
												className="h-8 w-8 p-0"
											>
												<Edit className="h-4 w-4" />
											</Button>
											<Button
												variant="ghost"
												size="sm"
												onClick={() =>
													onPrint({
														...reservation,
														convertedAmounts: convertedAmounts[reservation.id],
														selectedCurrency: selectedCurrency,
													})
												}
												className="h-8 w-8 p-0"
											>
												<Printer className="h-4 w-4" />
											</Button>
										</div>
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</CardContent>
			</Card>
		</div>
	);
}
