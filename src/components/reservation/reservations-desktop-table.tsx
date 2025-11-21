import {
	Calendar,
	ChevronDown,
	ChevronRight,
	CreditCard,
	DollarSign,
	Edit,
	Eye,
	MapPin,
	Printer,
} from "lucide-react";
import React, { memo, useEffect, useState } from "react";
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

type Currency = string;

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
			return "bg-emerald-50 text-emerald-700 border-emerald-200";
		case "checked_in":
			return "bg-blue-50 text-blue-700 border-blue-200";
		case "checked_out":
			return "bg-slate-50 text-slate-600 border-slate-200";
		case "cancelled":
			return "bg-rose-50 text-rose-700 border-rose-200";
		case "tentative":
			return "bg-amber-50 text-amber-700 border-amber-200";
		default:
			return "bg-slate-50 text-slate-600 border-slate-200";
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

function ReservationsDesktopTableComponent({
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

	// State for expanded rows
	const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

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

	// Filter and organize reservations
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

	// Separate active and completed reservations
	const activeReservations = filteredReservations
		.filter((r) => r.status !== "checked_out" && r.status !== "cancelled")
		.sort((a, b) => {
			// Sort by check-in date (upcoming first)
			return (
				new Date(a.check_in_date).getTime() -
				new Date(b.check_in_date).getTime()
			);
		});

	const completedReservations = filteredReservations
		.filter((r) => r.status === "checked_out" || r.status === "cancelled")
		.sort((a, b) => {
			// Sort by check-out date (most recent first)
			return (
				new Date(b.check_out_date).getTime() -
				new Date(a.check_out_date).getTime()
			);
		});

	const canShowPaymentButton = (reservation: ReservationFinancial): boolean => {
		return (
			reservation.status !== "cancelled" && reservation.status !== "checked_out"
		);
	};

	const toggleRowExpansion = (reservationId: string) => {
		setExpandedRows((prev) => {
			const newSet = new Set(prev);
			if (newSet.has(reservationId)) {
				newSet.delete(reservationId);
			} else {
				newSet.add(reservationId);
			}
			return newSet;
		});
	};

	const formatDateRange = (checkIn: string, checkOut: string) => {
		const start = new Date(checkIn);
		const end = new Date(checkOut);
		const nights = Math.ceil(
			(end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24),
		);

		return {
			startDate: start.toLocaleDateString("en-US", {
				month: "short",
				day: "numeric",
				year: "numeric",
			}),
			endDate: end.toLocaleDateString("en-US", {
				month: "short",
				day: "numeric",
				year: "numeric",
			}),
			nights,
		};
	};

	if (isLoading) {
		return <ReservationsListSkeleton />;
	}

	if (error) {
		return (
			<div className="text-red-500 p-4">
				{t("reservations.messages.loadError", { error: String(error) })}
			</div>
		);
	}

	if (!reservations || reservations.length === 0) {
		return (
			<div className="text-center py-8 text-gray-500">
				{t("reservations.messages.noReservationsGetStarted")}
			</div>
		);
	}

	return (
		<div className="hidden lg:block space-y-6">
			{/* Active Reservations Section */}
			{activeReservations.length > 0 && (
				<Card className="border-none shadow-sm">
					<CardHeader className="pb-3 bg-slate-50/50">
						<CardTitle className="text-base font-medium flex items-center gap-2 text-slate-700">
							<span className="h-2 w-2 rounded-full bg-blue-500"></span>
							{t("reservations.sections.active")} ({activeReservations.length})
						</CardTitle>
					</CardHeader>
					<CardContent className="p-0">
						<Table data-testid="reservations-table-active">
							<TableHeader>
								<TableRow className="bg-slate-50/50 border-b hover:bg-slate-50/50">
									<TableHead className="w-8"></TableHead>
									<TableHead className="font-medium text-slate-700">
										{t("reservations.table.headers.reservation")}
									</TableHead>
									<TableHead className="font-medium text-slate-700 text-right">
										{t("reservations.table.headers.amount")}
									</TableHead>
									<TableHead className="font-medium text-slate-700 text-right">
										{t("reservations.table.headers.paid")}
									</TableHead>
									<TableHead className="font-medium text-slate-700 text-right">
										{t("reservations.table.headers.balance")}
									</TableHead>
									<TableHead className="font-medium text-slate-700 text-right">
										{t("reservations.reservationActions.moreActions")}
									</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{activeReservations.map((reservation) => {
									const dateRange = formatDateRange(
										reservation.check_in_date,
										reservation.check_out_date,
									);
									const isExpanded = expandedRows.has(reservation.id);

									return (
										<React.Fragment key={reservation.id}>
											<TableRow className="hover:bg-slate-50/50 cursor-pointer border-b">
												<TableCell className="w-8 p-2">
													<Button
														variant="ghost"
														size="sm"
														onClick={() => toggleRowExpansion(reservation.id)}
														className="h-6 w-6 p-0"
													>
														{isExpanded ? (
															<ChevronDown className="h-4 w-4 text-slate-600" />
														) : (
															<ChevronRight className="h-4 w-4 text-slate-600" />
														)}
													</Button>
												</TableCell>
												<TableCell
													className="py-3"
													onClick={() => toggleRowExpansion(reservation.id)}
												>
													<div className="flex items-center gap-3">
														<div className="flex-1">
															<div className="flex items-center gap-2 mb-1">
																<span className="font-medium text-slate-900 text-sm">
																	{reservation.guest_name} -{" "}
																	{reservation.rooms?.room_number || t("reservations.table.noData")} -{" "}
																	{reservation.rooms?.room_type || t("reservations.table.noData")}
																</span>
																<Badge
																	variant="outline"
																	className={`text-xs font-normal ${getStatusColor(reservation.status)}`}
																>
																	{getStatusText(reservation.status, t)}
																</Badge>
															</div>
															<div className="text-xs text-slate-600">
																{dateRange.startDate} - {dateRange.endDate}
																<span className="text-slate-400 ml-1">
																	({t("reservations.table.nights", { count: dateRange.nights })})
																</span>
															</div>
														</div>
													</div>
												</TableCell>
												<TableCell className="text-right py-3">
													<div className="font-medium text-slate-900 text-sm">
														{getCurrencySymbol(selectedCurrency)}
														{(
															(convertedAmounts[reservation.id]?.roomAmount ||
																0) +
															(convertedAmounts[reservation.id]
																?.expensesAmount || 0)
														).toLocaleString()}
													</div>
												</TableCell>
												<TableCell className="text-right py-3">
													<div className="font-medium text-slate-900 text-sm">
														{getCurrencySymbol(selectedCurrency)}
														{(
															convertedAmounts[reservation.id]?.paidAmount || 0
														).toLocaleString()}
													</div>
												</TableCell>
												<TableCell className="text-right py-3">
													<div
														className={`font-medium text-sm ${
															(
																convertedAmounts[reservation.id]
																	?.balanceAmount || 0
															) > 0
																? "text-rose-600"
																: "text-emerald-600"
														}`}
													>
														{getCurrencySymbol(selectedCurrency)}
														{(
															convertedAmounts[reservation.id]?.balanceAmount ||
															0
														).toLocaleString()}
													</div>
												</TableCell>
												<TableCell className="text-right py-3">
													<div className="flex gap-1 justify-end">
														<Button
															variant="ghost"
															size="sm"
															onClick={(e) => {
																e.stopPropagation();
																onViewReservation(reservation.id);
															}}
															className="h-7 w-7 p-0 hover:bg-slate-100"
														>
															<Eye className="h-3.5 w-3.5 text-slate-600" />
														</Button>
														<Button
															variant="ghost"
															size="sm"
															onClick={(e) => {
																e.stopPropagation();
																onEditReservation(reservation);
															}}
															className="h-7 w-7 p-0 hover:bg-slate-100"
														>
															<Edit className="h-3.5 w-3.5 text-slate-600" />
														</Button>
														{canShowPaymentButton(reservation) && (
															<Button
																variant="ghost"
																size="sm"
																onClick={(e) => {
																	e.stopPropagation();
																	onPayment(
																		reservation.id,
																		reservation.needs_to_pay_usd,
																		"USD",
																	);
																}}
																className="h-7 w-7 p-0 hover:bg-emerald-50"
															>
																<CreditCard className="h-3.5 w-3.5 text-emerald-600" />
															</Button>
														)}
														<Button
															variant="ghost"
															size="sm"
															onClick={(e) => {
																e.stopPropagation();
																onPrint({
																	...reservation,
																	convertedAmounts:
																		convertedAmounts[reservation.id],
																	selectedCurrency: selectedCurrency,
																});
															}}
															className="h-7 w-7 p-0 hover:bg-slate-100"
														>
															<Printer className="h-3.5 w-3.5 text-slate-600" />
														</Button>
													</div>
												</TableCell>
											</TableRow>

											{/* Expanded Row Details */}
											{isExpanded && (
												<TableRow className="bg-slate-50/30 border-b">
													<TableCell colSpan={6} className="py-4">
														<div className="grid grid-cols-3 gap-6 pl-8">
															<div className="space-y-3">
																<h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
																	{t("reservations.viewDialog.guestInformation")}
																</h4>
																<div className="space-y-2">
																	<div className="flex justify-between text-sm">
																		<span className="text-slate-600">
																			{t("reservations.form.guestName")}:
																		</span>
																		<span className="font-medium text-slate-900">
																			{reservation.guest_name}
																		</span>
																	</div>
																	<div className="flex justify-between text-sm">
																		<span className="text-slate-600">
																			{t("reservations.viewDialog.reservationNumber")}:
																		</span>
																		<span className="font-medium text-slate-900">
																			{reservation.reservation_number}
																		</span>
																	</div>
																</div>
															</div>

															<div className="space-y-3">
																<h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
																	{t("reservations.viewDialog.financialDetails")}
																</h4>
																<div className="space-y-2">
																	<div className="flex justify-between text-sm">
																		<span className="text-slate-600">
																			{t("reservations.viewDialog.roomCharges")}:
																		</span>
																		<span className="font-medium text-slate-900">
																			{getCurrencySymbol(selectedCurrency)}
																			{(
																				convertedAmounts[reservation.id]
																					?.roomAmount || 0
																			).toLocaleString()}
																		</span>
																	</div>
																	<div className="flex justify-between text-sm">
																		<span className="text-slate-600">
																			{t("reservations.viewDialog.expenses")}:
																		</span>
																		<span className="font-medium text-slate-900">
																			{getCurrencySymbol(selectedCurrency)}
																			{(
																				convertedAmounts[reservation.id]
																					?.expensesAmount || 0
																			).toLocaleString()}
																		</span>
																	</div>
																	<div className="flex justify-between text-sm pt-2 border-t border-slate-200">
																		<span className="text-slate-700 font-medium">
																			{t("reservations.table.headers.total")}:
																		</span>
																		<span className="font-semibold text-slate-900">
																			{getCurrencySymbol(selectedCurrency)}
																			{(
																				(convertedAmounts[reservation.id]
																					?.roomAmount || 0) +
																				(convertedAmounts[reservation.id]
																					?.expensesAmount || 0)
																			).toLocaleString()}
																		</span>
																	</div>
																</div>
															</div>

															<div className="space-y-3">
																<h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
																	{t("reservations.reservationActions.quickActions")}
																</h4>
																<div className="flex flex-row gap-2">
																	<Button
																		variant="outline"
																		size="sm"
																		onClick={() => onAddIncome(reservation)}
																		disabled={
																			reservation.status === "checked_out"
																		}
																		className="justify-start cursor-pointer text-blue-600 hover:text-blue-700 border-blue-200 hover:bg-blue-50"
																	>
																		<DollarSign className="size-4 mr-2" />
																		{t("reservations.table.actions.addIncome")}
																	</Button>
																	{canShowPaymentButton(reservation) && (
																		<Button
																			variant="outline"
																			size="sm"
																			onClick={() =>
																				onPayment(
																					reservation.id,
																					reservation.needs_to_pay_usd,
																					"USD",
																				)
																			}
																			className="justify-start cursor-pointer text-emerald-600 hover:text-emerald-700 border-emerald-200 hover:bg-emerald-50"
																		>
																			<CreditCard className="size-4 mr-2" />
																			{t("reservations.table.actions.payNow")}
																		</Button>
																	)}
																</div>
															</div>
														</div>
													</TableCell>
												</TableRow>
											)}
										</React.Fragment>
									);
								})}
							</TableBody>
						</Table>
					</CardContent>
				</Card>
			)}

			{/* Completed Reservations Section */}
			{completedReservations.length > 0 && (
				<Card className="border-none shadow-sm">
					<CardHeader className="pb-3 bg-slate-50/50">
						<CardTitle className="text-base font-medium flex items-center gap-2 text-slate-500">
							<span className="h-2 w-2 rounded-full bg-slate-400"></span>
							{t("reservations.sections.completed")} (
							{completedReservations.length})
						</CardTitle>
					</CardHeader>
					<CardContent className="p-0">
						<Table data-testid="reservations-table-completed">
							<TableHeader>
								<TableRow className="bg-slate-50/50 border-b hover:bg-slate-50/50">
									<TableHead className="w-8"></TableHead>
									<TableHead className="font-medium text-slate-700">
										{t("reservations.table.headers.reservation")}
									</TableHead>
									<TableHead className="font-medium text-slate-700 text-right">
										{t("reservations.table.headers.amount")}
									</TableHead>
									<TableHead className="font-medium text-slate-700 text-right">
										{t("reservations.table.headers.paid")}
									</TableHead>
									<TableHead className="font-medium text-slate-700 text-right">
										{t("reservations.table.headers.balance")}
									</TableHead>
									<TableHead className="font-medium text-slate-700 text-right">
										{t("reservations.reservationActions.moreActions")}
									</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{completedReservations.map((reservation) => {
									const dateRange = formatDateRange(
										reservation.check_in_date,
										reservation.check_out_date,
									);
									const isExpanded = expandedRows.has(reservation.id);

									return (
										<React.Fragment key={reservation.id}>
											<TableRow className="hover:bg-slate-50/50 cursor-pointer border-b opacity-70">
												<TableCell className="w-8 p-2">
													<Button
														variant="ghost"
														size="sm"
														onClick={() => toggleRowExpansion(reservation.id)}
														className="h-6 w-6 p-0"
													>
														{isExpanded ? (
															<ChevronDown className="h-4 w-4 text-slate-600" />
														) : (
															<ChevronRight className="h-4 w-4 text-slate-600" />
														)}
													</Button>
												</TableCell>
												<TableCell
													className="py-3"
													onClick={() => toggleRowExpansion(reservation.id)}
												>
													<div className="flex items-center gap-3">
														<div className="flex-1">
															<div className="flex items-center gap-2 mb-1">
																<span className="font-medium text-slate-700 text-sm">
																	{reservation.guest_name} -{" "}
																	{reservation.rooms?.room_number || t("reservations.table.noData")} -{" "}
																	{reservation.rooms?.room_type || t("reservations.table.noData")}
																</span>
																<Badge
																	variant="outline"
																	className={`text-xs font-normal ${getStatusColor(reservation.status)}`}
																>
																	{getStatusText(reservation.status, t)}
																</Badge>
															</div>
															<div className="text-xs text-slate-500">
																{dateRange.startDate} - {dateRange.endDate}
																<span className="text-slate-400 ml-1">
																	({t("reservations.table.nights", { count: dateRange.nights })})
																</span>
															</div>
														</div>
													</div>
												</TableCell>
												<TableCell className="text-right py-3">
													<div className="font-medium text-slate-700 text-sm">
														{getCurrencySymbol(selectedCurrency)}
														{(
															(convertedAmounts[reservation.id]?.roomAmount ||
																0) +
															(convertedAmounts[reservation.id]
																?.expensesAmount || 0)
														).toLocaleString()}
													</div>
												</TableCell>
												<TableCell className="text-right py-3">
													<div className="font-medium text-slate-700 text-sm">
														{getCurrencySymbol(selectedCurrency)}
														{(
															convertedAmounts[reservation.id]?.paidAmount || 0
														).toLocaleString()}
													</div>
												</TableCell>
												<TableCell className="text-right py-3">
													<div
														className={`font-medium text-sm ${
															(
																convertedAmounts[reservation.id]
																	?.balanceAmount || 0
															) > 0
																? "text-rose-600"
																: "text-slate-600"
														}`}
													>
														{getCurrencySymbol(selectedCurrency)}
														{(
															convertedAmounts[reservation.id]?.balanceAmount ||
															0
														).toLocaleString()}
													</div>
												</TableCell>
												<TableCell className="text-right py-3">
													<div className="flex gap-1 justify-end">
														<Button
															variant="ghost"
															size="sm"
															onClick={(e) => {
																e.stopPropagation();
																onViewReservation(reservation.id);
															}}
															className="h-7 w-7 p-0 hover:bg-slate-100"
														>
															<Eye className="h-3.5 w-3.5 text-slate-600" />
														</Button>
														<Button
															variant="ghost"
															size="sm"
															onClick={(e) => {
																e.stopPropagation();
																onPrint({
																	...reservation,
																	convertedAmounts:
																		convertedAmounts[reservation.id],
																	selectedCurrency: selectedCurrency,
																});
															}}
															className="h-7 w-7 p-0 hover:bg-slate-100"
														>
															<Printer className="h-3.5 w-3.5 text-slate-600" />
														</Button>
													</div>
												</TableCell>
											</TableRow>

											{/* Expanded Row Details */}
											{isExpanded && (
												<TableRow className="bg-slate-50/30 border-b opacity-70">
													<TableCell colSpan={6} className="py-4">
														<div className="grid grid-cols-3 gap-6 pl-8">
															<div className="space-y-3">
																<h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
																	{t("reservations.viewDialog.guestInformation")}
																</h4>
																<div className="space-y-2">
																	<div className="flex justify-between text-sm">
																		<span className="text-slate-600">
																			{t("reservations.form.guestName")}:
																		</span>
																		<span className="font-medium text-slate-900">
																			{reservation.guest_name}
																		</span>
																	</div>
																	<div className="flex justify-between text-sm">
																		<span className="text-slate-600">
																			{t("reservations.viewDialog.reservationNumber")}:
																		</span>
																		<span className="font-medium text-slate-900">
																			{reservation.reservation_number}
																		</span>
																	</div>
																</div>
															</div>

															<div className="space-y-3">
																<h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
																	{t("reservations.viewDialog.financialDetails")}
																</h4>
																<div className="space-y-2">
																	<div className="flex justify-between text-sm">
																		<span className="text-slate-600">
																			{t("reservations.viewDialog.roomCharges")}:
																		</span>
																		<span className="font-medium text-slate-900">
																			{getCurrencySymbol(selectedCurrency)}
																			{(
																				convertedAmounts[reservation.id]
																					?.roomAmount || 0
																			).toLocaleString()}
																		</span>
																	</div>
																	<div className="flex justify-between text-sm">
																		<span className="text-slate-600">
																			{t("reservations.viewDialog.expenses")}:
																		</span>
																		<span className="font-medium text-slate-900">
																			{getCurrencySymbol(selectedCurrency)}
																			{(
																				convertedAmounts[reservation.id]
																					?.expensesAmount || 0
																			).toLocaleString()}
																		</span>
																	</div>
																	<div className="flex justify-between text-sm pt-2 border-t border-slate-200">
																		<span className="text-slate-700 font-medium">
																			{t("reservations.table.headers.total")}:
																		</span>
																		<span className="font-semibold text-slate-900">
																			{getCurrencySymbol(selectedCurrency)}
																			{(
																				(convertedAmounts[reservation.id]
																					?.roomAmount || 0) +
																				(convertedAmounts[reservation.id]
																					?.expensesAmount || 0)
																			).toLocaleString()}
																		</span>
																	</div>
																</div>
															</div>

															<div className="space-y-3">
																<h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
																	{t("reservations.table.headers.status")}
																</h4>
																<div className="text-sm text-slate-600">
																	{t("reservations.messages.reservationCompleted")}
																</div>
															</div>
														</div>
													</TableCell>
												</TableRow>
											)}
										</React.Fragment>
									);
								})}
							</TableBody>
						</Table>
					</CardContent>
				</Card>
			)}

			{/* Empty State */}
			{activeReservations.length === 0 &&
				completedReservations.length === 0 && (
					<Card>
						<CardContent className="text-center py-8 text-gray-500">
							{t("reservations.noReservationsFound")}
						</CardContent>
					</Card>
				)}
		</div>
	);
}

export const ReservationsDesktopTable = memo(ReservationsDesktopTableComponent);
