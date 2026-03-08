import {
	Building2,
	Calendar,
	CreditCard,
	Eye,
	MapPin,
	User,
} from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ViewReservationDialog } from "@/components/modals/view-reservation-dialog";
import { ReservationsListSkeleton } from "@/components/skeleton/reservations-list-skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { usePaymentsData } from "@/hooks/use-payments-data";

export function PaymentsTable() {
	const { t } = useTranslation();
	const { payments, loading, refetch } = usePaymentsData();
	const [viewingReservationId, setViewingReservationId] = useState<
		string | null
	>(null);
	const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);

	// Utility functions
	const getCurrencySymbol = (currency: string): string => {
		const symbols: Record<string, string> = {
			LKR: "Rs.",
			USD: "$",
			EUR: "€",
			GBP: "£",
		};
		return symbols[currency] || currency;
	};

	const formatCurrency = (amount: number, currency: string) => {
		return `${getCurrencySymbol(currency)} ${amount.toLocaleString()}`;
	};

	const formatDate = (dateString: string) => {
		return new Date(dateString).toLocaleDateString("en-US", {
			year: "numeric",
			month: "short",
			day: "numeric",
		});
	};

	const formatDateRange = (checkIn: string | null, checkOut: string | null) => {
		if (!checkIn || !checkOut) return "-";
		const checkInDate = new Date(checkIn).toLocaleDateString("en-US", {
			month: "short",
			day: "numeric",
		});
		const checkOutDate = new Date(checkOut).toLocaleDateString("en-US", {
			month: "short",
			day: "numeric",
		});
		return `${checkInDate} - ${checkOutDate}`;
	};

	const getPaymentMethodColor = (method: string) => {
		const colors: Record<string, string> = {
			cash: "bg-green-100 text-green-800 border-green-200",
			card: "bg-blue-100 text-blue-800 border-blue-200",
			bank_transfer: "bg-purple-100 text-purple-800 border-purple-200",
			online: "bg-orange-100 text-orange-800 border-orange-200",
			cheque: "bg-gray-100 text-gray-800 border-gray-200",
		};
		return colors[method] || "bg-gray-100 text-gray-800 border-gray-200";
	};

	const getPaymentTypeColor = (type: string, isAdvance: boolean) => {
		if (isAdvance) {
			return "bg-yellow-100 text-yellow-800 border-yellow-200";
		}
		const colors: Record<string, string> = {
			room_charge: "bg-blue-100 text-blue-800 border-blue-200",
			additional_service: "bg-purple-100 text-purple-800 border-purple-200",
			commission: "bg-green-100 text-green-800 border-green-200",
			other: "bg-gray-100 text-gray-800 border-gray-200",
		};
		return colors[type] || "bg-gray-100 text-gray-800 border-gray-200";
	};

	const handleViewReservation = (bookingId: string | null) => {
		if (bookingId) {
			setViewingReservationId(bookingId);
			setIsViewDialogOpen(true);
		}
	};

	if (loading) {
		return <ReservationsListSkeleton />;
	}

	return (
		<div className="space-y-4">
			<div className="bg-white shadow rounded-lg">
				<div className="px-4 py-5 sm:p-6">
					<div className="flex items-center justify-between mb-6">
						<div className="flex items-center space-x-3">
							<CreditCard className="h-6 w-6 text-primary" />
							<h3 className="text-lg font-semibold text-gray-900">
								{t("reservations.paymentsTable.title")}
							</h3>
						</div>
						<Badge variant="secondary" className="ml-2">
							{payments.length}{" "}
							{t("reservations.paymentsTable.payments", {
								count: payments.length,
							})}
						</Badge>
					</div>

					{payments.length === 0 ? (
						<div className="text-center py-12">
							<div className="mx-auto h-12 w-12 text-gray-400 mb-4">
								<CreditCard className="h-12 w-12" />
							</div>
							<h3 className="mt-2 text-sm font-medium text-gray-900">
								{t("reservations.paymentsTable.noPayments")}
							</h3>
							<p className="mt-1 text-sm text-gray-500">
								{t("reservations.paymentsTable.noPaymentsDescription")}
							</p>
						</div>
					) : (
						<div className="overflow-x-auto">
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead className="min-w-[100px]">
											{t("reservations.paymentsTable.headers.date")}
										</TableHead>
										<TableHead className="min-w-[120px]">
											{t("reservations.paymentsTable.headers.amount")}
										</TableHead>
										<TableHead className="min-w-[100px]">
											{t("reservations.paymentsTable.headers.type")}
										</TableHead>
										<TableHead className="min-w-[100px]">
											{t("reservations.paymentsTable.headers.method")}
										</TableHead>
										<TableHead className="min-w-[120px]">
											{t("reservations.paymentsTable.headers.account")}
										</TableHead>
										<TableHead className="min-w-[140px]">
											{t(
												"reservations.paymentsTable.headers.reservationNumber",
											)}
										</TableHead>
										<TableHead className="min-w-[150px]">
											{t("reservations.paymentsTable.headers.guest")}
										</TableHead>
										<TableHead className="min-w-[100px]">
											{t("reservations.paymentsTable.headers.room")}
										</TableHead>
										<TableHead className="min-w-[120px]">
											{t("reservations.paymentsTable.headers.stay")}
										</TableHead>
										<TableHead className="min-w-[150px]">
											{t("reservations.paymentsTable.headers.note")}
										</TableHead>
										<TableHead className="w-20">
											{t("reservations.table.headers.actions")}
										</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{payments.map((payment) => (
										<TableRow key={payment.id} className="hover:bg-gray-50">
											<TableCell className="font-medium">
												<div className="flex items-center space-x-1">
													<Calendar className="h-3 w-3 text-gray-400" />
													<span className="text-sm">
														{formatDate(payment.date)}
													</span>
												</div>
											</TableCell>
											<TableCell>
												<div className="font-semibold text-green-600">
													{formatCurrency(payment.amount, payment.currency)}
												</div>
												{payment.is_advance && (
													<div className="text-xs text-yellow-600 mt-1">
														{t("reservations.paymentsTable.advancePayment")}
													</div>
												)}
											</TableCell>
											<TableCell>
												<Badge
													variant="outline"
													className={`text-xs ${getPaymentTypeColor(
														payment.type,
														payment.is_advance,
													)}`}
												>
													{payment.is_advance
														? t("reservations.paymentsTable.advance")
														: t(
																`reservations.paymentsTable.paymentTypes.${payment.type}`,
															)}
												</Badge>
											</TableCell>
											<TableCell>
												<Badge
													variant="outline"
													className={`text-xs ${getPaymentMethodColor(
														payment.payment_method,
													)}`}
												>
													{t(
														`reservations.paymentsTable.paymentMethods.${payment.payment_method}`,
													)}
												</Badge>
											</TableCell>
											<TableCell>
												<div className="flex items-center space-x-1">
													<Building2 className="h-3 w-3 text-gray-400" />
													<span className="text-sm">
														{payment.account_name ||
															t("reservations.table.noData")}
													</span>
												</div>
											</TableCell>
											<TableCell>
												{payment.reservation_number ? (
													<div className="space-y-1">
														<div className="font-mono text-sm font-medium">
															{payment.reservation_number}
														</div>
														{payment.reservation_status && (
															<Badge variant="outline" className="text-xs">
																{t(
																	`reservations.status.${payment.reservation_status.toLowerCase()}`,
																)}
															</Badge>
														)}
													</div>
												) : (
													<Badge variant="outline" className="text-xs">
														{t("common.directIncome", "Direct Income")}
													</Badge>
												)}
											</TableCell>
											<TableCell>
												{payment.guest_name ? (
													<div className="space-y-1">
														<div className="flex items-center space-x-1">
															<User className="h-3 w-3 text-gray-400" />
															<span className="text-sm font-medium">
																{payment.guest_name}
															</span>
														</div>
														{payment.guest_email && (
															<div className="text-xs text-gray-500">
																{payment.guest_email}
															</div>
														)}
														{payment.adults !== null && (
															<div className="text-xs text-gray-500">
																{t("reservations.table.adults", {
																	count: payment.adults,
																})}
																{payment.children
																	? `, ${t("reservations.table.children", { count: payment.children })}`
																	: ""}
															</div>
														)}
													</div>
												) : (
													t("reservations.table.noData")
												)}
											</TableCell>
											<TableCell>
												{payment.room_number ? (
													<div className="space-y-1">
														<div className="flex items-center space-x-1">
															<MapPin className="h-3 w-3 text-gray-400" />
															<span className="font-mono text-sm font-medium">
																{payment.room_number}
															</span>
														</div>
														{payment.room_type && (
															<div className="text-xs text-gray-500">
																{payment.room_type}
															</div>
														)}
													</div>
												) : (
													t("reservations.table.noData")
												)}
											</TableCell>
											<TableCell>
												{payment.check_in_date && payment.check_out_date ? (
													<div className="space-y-1">
														<div className="text-xs text-gray-600">
															{formatDateRange(
																payment.check_in_date,
																payment.check_out_date,
															)}
														</div>
														{payment.nights && (
															<div className="text-xs text-gray-500">
																{t("reservations.table.nights", {
																	count: payment.nights,
																})}
															</div>
														)}
													</div>
												) : (
													t("reservations.table.noData")
												)}
											</TableCell>
											<TableCell>
												{payment.note ? (
													<div
														className="text-sm text-gray-600 truncate max-w-[150px]"
														title={payment.note}
													>
														{payment.note}
													</div>
												) : (
													t("reservations.table.noData")
												)}
											</TableCell>
											<TableCell>
												{payment.booking_id && (
													<Button
														variant="ghost"
														size="sm"
														onClick={() =>
															handleViewReservation(payment.booking_id)
														}
														className="h-8 w-8 p-0"
														title={t("reservations.table.actions.view")}
													>
														<Eye className="h-4 w-4" />
													</Button>
												)}
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</div>
					)}
				</div>
			</div>

			<ViewReservationDialog
				isOpen={isViewDialogOpen}
				onClose={() => {
					setIsViewDialogOpen(false);
					setViewingReservationId(null);
				}}
				reservationId={viewingReservationId || ""}
			/>
		</div>
	);
}
