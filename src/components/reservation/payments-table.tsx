import {
	Building2,
	Calendar,
	CreditCard,
	Eye,
	MapPin,
	User,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
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
	const navigate = useNavigate();
	const { payments, loading, refetch } = usePaymentsData();

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
			navigate(`/reservations/${bookingId}`);
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
								{t("reservations.paymentsTable.title", "Payments & Income")}
							</h3>
						</div>
						<Badge variant="secondary" className="ml-2">
							{payments.length} {t("common.payments", "payments")}
						</Badge>
					</div>

					{payments.length === 0 ? (
						<div className="text-center py-12">
							<div className="mx-auto h-12 w-12 text-gray-400 mb-4">
								<CreditCard className="h-12 w-12" />
							</div>
							<h3 className="mt-2 text-sm font-medium text-gray-900">
								{t(
									"reservations.paymentsTable.noPayments",
									"No payments found",
								)}
							</h3>
							<p className="mt-1 text-sm text-gray-500">
								{t(
									"reservations.paymentsTable.noPaymentsDescription",
									"Payments will appear here when income is recorded for reservations.",
								)}
							</p>
						</div>
					) : (
						<div className="overflow-x-auto">
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead className="min-w-[100px]">
											{t("common.date", "Date")}
										</TableHead>
										<TableHead className="min-w-[120px]">
											{t("common.amount", "Amount")}
										</TableHead>
										<TableHead className="min-w-[100px]">
											{t("common.type", "Type")}
										</TableHead>
										<TableHead className="min-w-[100px]">
											{t("common.method", "Method")}
										</TableHead>
										<TableHead className="min-w-[120px]">
											{t("common.account", "Account")}
										</TableHead>
										<TableHead className="min-w-[140px]">
											{t("common.reservation", "Reservation")}
										</TableHead>
										<TableHead className="min-w-[150px]">
											{t("common.guest", "Guest")}
										</TableHead>
										<TableHead className="min-w-[100px]">
											{t("common.room", "Room")}
										</TableHead>
										<TableHead className="min-w-[120px]">
											{t("common.stay", "Stay Period")}
										</TableHead>
										<TableHead className="min-w-[150px]">
											{t("common.note", "Note")}
										</TableHead>
										<TableHead className="w-[80px]">
											{t("common.actions", "Actions")}
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
														Advance Payment
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
														? "Advance"
														: payment.type.replace("_", " ")}
												</Badge>
											</TableCell>
											<TableCell>
												<Badge
													variant="outline"
													className={`text-xs ${getPaymentMethodColor(
														payment.payment_method,
													)}`}
												>
													{payment.payment_method.replace("_", " ")}
												</Badge>
											</TableCell>
											<TableCell>
												<div className="flex items-center space-x-1">
													<Building2 className="h-3 w-3 text-gray-400" />
													<span className="text-sm">
														{payment.account_name || "-"}
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
																{payment.reservation_status}
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
																{payment.adults} adult(s)
																{payment.children
																	? `, ${payment.children} child(ren)`
																	: ""}
															</div>
														)}
													</div>
												) : (
													"-"
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
													"-"
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
																{payment.nights} night(s)
															</div>
														)}
													</div>
												) : (
													"-"
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
													"-"
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
														title={t(
															"common.viewReservation",
															"View reservation",
														)}
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
		</div>
	);
}
