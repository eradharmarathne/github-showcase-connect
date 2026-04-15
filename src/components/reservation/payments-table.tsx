import { CreditCard, Eye } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ViewReservationDialog } from "@/components/modals/view-reservation-dialog";
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
import { usePaymentsData } from "@/hooks/use-payments-data";
import { getCurrencySymbol } from "@/utils/currency";

export function PaymentsTable() {
	const { t } = useTranslation();
	const { payments, loading } = usePaymentsData();
	const [viewingReservationId, setViewingReservationId] = useState<
		string | null
	>(null);
	const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);

	const formatCurrency = (amount: number, currency: string) => {
		return `${getCurrencySymbol(currency)}${amount.toLocaleString()}`;
	};

	const formatDate = (dateString: string) => {
		return new Date(dateString).toLocaleDateString("en-US", {
			year: "numeric",
			month: "short",
			day: "numeric",
		});
	};

	const getPaymentMethodColor = (method: string) => {
		const colors: Record<string, string> = {
			cash: "bg-emerald-50 text-emerald-700 border-emerald-200",
			card: "bg-blue-50 text-blue-700 border-blue-200",
			bank_transfer: "bg-violet-50 text-violet-700 border-violet-200",
			mobile_payment: "bg-amber-50 text-amber-700 border-amber-200",
			cheque: "bg-slate-50 text-slate-600 border-slate-200",
		};
		return colors[method] || "bg-slate-50 text-slate-600 border-slate-200";
	};

	const getPaymentTypeColor = (type: string, isAdvance: boolean) => {
		if (isAdvance) {
			return "bg-amber-50 text-amber-700 border-amber-200";
		}
		const colors: Record<string, string> = {
			room_payment: "bg-blue-50 text-blue-700 border-blue-200",
			room_charge: "bg-blue-50 text-blue-700 border-blue-200",
			advance_payment: "bg-amber-50 text-amber-700 border-amber-200",
			partial_payment: "bg-sky-50 text-sky-700 border-sky-200",
			full_payment: "bg-emerald-50 text-emerald-700 border-emerald-200",
			additional_service: "bg-violet-50 text-violet-700 border-violet-200",
			commission: "bg-teal-50 text-teal-700 border-teal-200",
		};
		return colors[type] || "bg-slate-50 text-slate-600 border-slate-200";
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
			<Card className="border-none shadow-sm">
				<CardHeader className="pb-3 bg-slate-50/50">
					<CardTitle className="text-base font-medium flex items-center justify-between text-slate-700">
						<div className="flex items-center gap-2">
							<CreditCard className="h-4 w-4" />
							{t("reservations.paymentsTable.title")}
						</div>
						<Badge
							variant="secondary"
							className="text-xs font-normal bg-slate-100"
						>
							{payments.length}{" "}
							{t("reservations.paymentsTable.payments", {
								count: payments.length,
							})}
						</Badge>
					</CardTitle>
				</CardHeader>
				<CardContent className="p-0">
					{payments.length === 0 ? (
						<div className="text-center py-12">
							<CreditCard className="mx-auto h-10 w-10 text-slate-300 mb-3" />
							<h3 className="text-sm font-medium text-slate-700">
								{t("reservations.paymentsTable.noPayments")}
							</h3>
							<p className="mt-1 text-xs text-slate-500">
								{t("reservations.paymentsTable.noPaymentsDescription")}
							</p>
						</div>
					) : (
						<Table>
							<TableHeader>
								<TableRow className="bg-slate-50/50 border-b hover:bg-slate-50/50">
									<TableHead className="font-medium text-slate-700">
										{t("reservations.paymentsTable.headers.date")}
									</TableHead>
									<TableHead className="font-medium text-slate-700">
										{t("reservations.paymentsTable.headers.guest")}
									</TableHead>
									<TableHead className="font-medium text-slate-700">
										{t("reservations.paymentsTable.headers.room")}
									</TableHead>
									<TableHead className="font-medium text-slate-700 text-right">
										{t("reservations.paymentsTable.headers.amount")}
									</TableHead>
									<TableHead className="font-medium text-slate-700">
										{t("reservations.paymentsTable.headers.type")}
									</TableHead>
									<TableHead className="font-medium text-slate-700">
										{t("reservations.paymentsTable.headers.method")}
									</TableHead>
									<TableHead className="font-medium text-slate-700">
										{t("reservations.paymentsTable.headers.account")}
									</TableHead>
									<TableHead className="font-medium text-slate-700">
										{t("reservations.paymentsTable.headers.note")}
									</TableHead>
									<TableHead className="font-medium text-slate-700 text-right">
										{t("reservations.table.headers.actions")}
									</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{payments.map((payment) => (
									<TableRow
										key={payment.id}
										className="hover:bg-slate-50/50 border-b"
									>
										<TableCell className="py-3">
											<div className="text-sm text-slate-900">
												{formatDate(payment.date)}
											</div>
											{payment.reservation_number && (
												<div className="text-xs text-slate-500 font-mono mt-0.5">
													{payment.reservation_number}
												</div>
											)}
										</TableCell>
										<TableCell className="py-3">
											<span className="text-sm font-medium text-slate-900">
												{payment.guest_name || "-"}
											</span>
										</TableCell>
										<TableCell className="py-3">
											{payment.room_number ? (
												<span className="text-sm text-slate-700">
													{payment.room_number}
													{payment.room_type && (
														<span className="text-slate-400">
															{" "}
															- {payment.room_type}
														</span>
													)}
												</span>
											) : (
												<span className="text-sm text-slate-400">-</span>
											)}
										</TableCell>
										<TableCell className="py-3 text-right">
											<div className="font-semibold text-sm text-emerald-600">
												{formatCurrency(payment.amount, payment.currency)}
											</div>
										</TableCell>
										<TableCell className="py-3">
											<Badge
												variant="outline"
												className={`text-xs font-normal ${getPaymentTypeColor(
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
										<TableCell className="py-3">
											<Badge
												variant="outline"
												className={`text-xs font-normal ${getPaymentMethodColor(
													payment.payment_method,
												)}`}
											>
												{t(
													`reservations.paymentsTable.paymentMethods.${payment.payment_method}`,
												)}
											</Badge>
										</TableCell>
										<TableCell className="py-3">
											<span className="text-sm text-slate-700">
												{payment.account_name || "-"}
											</span>
										</TableCell>
										<TableCell className="py-3">
											{payment.note ? (
												<div
													className="text-sm text-slate-500 truncate max-w-[150px]"
													title={payment.note}
												>
													{payment.note}
												</div>
											) : (
												<span className="text-sm text-slate-400">-</span>
											)}
										</TableCell>
										<TableCell className="py-3 text-right">
											{payment.booking_id && (
												<Button
													variant="ghost"
													size="sm"
													onClick={() =>
														handleViewReservation(payment.booking_id)
													}
													className="h-7 w-7 p-0 hover:bg-slate-100"
													title={t("reservations.table.actions.view")}
												>
													<Eye className="h-3.5 w-3.5 text-slate-600" />
												</Button>
											)}
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					)}
				</CardContent>
			</Card>

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
