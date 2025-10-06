import { format, parseISO } from "date-fns";
import {
	Calendar,
	CreditCard,
	DollarSign,
	Edit,
	FileText,
	Mail,
	MapPin,
	Phone,
	Trash2,
	User,
} from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import type { Database } from "@/integrations/supabase/types";

type Reservation = Database["public"]["Tables"]["reservations"]["Row"] & {
	rooms: { room_number: string; room_type: string } | null;
	locations: { name: string } | null;
};

interface BookingDetailsDialogProps {
	reservation: Reservation | null;
	isOpen: boolean;
	onClose: () => void;
	getStatusColor: (status: string) => string;
	getStatusBorderColor: (status: string) => string;
	getCurrencySymbol: (currency: string) => string;
}

export function BookingDetailsDialog({
	reservation,
	isOpen,
	onClose,
	getStatusColor,
	getStatusBorderColor,
	getCurrencySymbol,
}: BookingDetailsDialogProps) {
	const navigate = useNavigate();
	const { t } = useTranslation("common");

	if (!reservation) return null;

	const handleEdit = () => {
		navigate(`/reservations/${reservation.id}`);
		onClose();
	};

	const handlePayment = () => {
		navigate(`/payments/new?reservation=${reservation.id}`);
		onClose();
	};

	const handleViewDetails = () => {
		navigate(`/reservations/${reservation.id}`);
		onClose();
	};

	const checkInDate = parseISO(reservation.check_in_date);
	const checkOutDate = parseISO(reservation.check_out_date);
	const nights = Math.ceil(
		(checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24),
	);

	return (
		<Dialog open={isOpen} onOpenChange={onClose}>
			<DialogContent className="max-w-md">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<User className="h-5 w-5" />
						{t("calendar.bookingDialog.title")}
					</DialogTitle>
				</DialogHeader>

				<div className="space-y-4">
					{/* Guest Information */}
					<div className="space-y-3">
						<div className="flex items-center justify-between">
							<h3 className="text-base md:text-lg lg:text-xl font-semibold">
								{reservation.guest_name}
							</h3>
							<Badge
								variant="outline"
								className="text-xs"
								style={{
									color: getStatusBorderColor(reservation.status),
									borderColor: getStatusBorderColor(reservation.status),
								}}
							>
								{reservation.status.toUpperCase()}
							</Badge>
						</div>

						<div className="text-sm text-muted-foreground">
							<div className="flex items-center gap-2 mb-1">
								<FileText className="h-4 w-4" />
								<span>#{reservation.reservation_number}</span>
							</div>
							{reservation.guest_email && (
								<div className="flex items-center gap-2 mb-1">
									<Mail className="h-4 w-4" />
									<span>{reservation.guest_email}</span>
								</div>
							)}
							{reservation.guest_phone && (
								<div className="flex items-center gap-2">
									<Phone className="h-4 w-4" />
									<span>{reservation.guest_phone}</span>
								</div>
							)}
						</div>
					</div>

					<Separator />

					{/* Stay Information */}
					<div className="space-y-3">
						<div className="flex items-center gap-2 font-medium">
							<Calendar className="h-4 w-4" />
							{t("calendar.bookingDialog.stayDetails")}
						</div>

						<div className="grid grid-cols-2 gap-4 text-sm">
							<div>
								<div className="text-muted-foreground">
									{t("calendar.bookingDialog.checkIn")}
								</div>
								<div className="font-medium">
									{format(checkInDate, "MMM dd, yyyy")}
								</div>
							</div>
							<div>
								<div className="text-muted-foreground">
									{t("calendar.bookingDialog.checkOut")}
								</div>
								<div className="font-medium">
									{format(checkOutDate, "MMM dd, yyyy")}
								</div>
							</div>
						</div>

						<div className="grid grid-cols-2 gap-4 text-sm">
							<div>
								<div className="text-muted-foreground">
									{t("calendar.bookingDialog.room")}
								</div>
								<div className="font-medium">
									{reservation.rooms?.room_number} -{" "}
									{reservation.rooms?.room_type}
								</div>
							</div>
							<div>
								<div className="text-muted-foreground">
									{t("calendar.bookingDialog.nights", { count: nights })}
								</div>
								<div className="font-medium">
									{nights}{" "}
									{t("calendar.bookingDialog.nights", { count: nights })}
								</div>
							</div>
						</div>

						{reservation.adults && (
							<div className="grid grid-cols-2 gap-4 text-sm">
								<div>
									<div className="text-muted-foreground">
										{t("calendar.bookingDialog.adults")}
									</div>
									<div className="font-medium">{reservation.adults}</div>
								</div>
								{reservation.children && (
									<div>
										<div className="text-muted-foreground">
											{t("calendar.bookingDialog.children")}
										</div>
										<div className="font-medium">{reservation.children}</div>
									</div>
								)}
							</div>
						)}
					</div>

					<Separator />

					{/* Financial Information */}
					<div className="space-y-3">
						<div className="flex items-center gap-2 font-medium">
							<DollarSign className="h-4 w-4" />
							{t("calendar.bookingDialog.financialDetails")}
						</div>

						<div className="grid grid-cols-2 gap-4 text-sm">
							<div>
								<div className="text-muted-foreground">
									{t("calendar.bookingDialog.totalAmount")}
								</div>
								<div className="font-medium">
									{getCurrencySymbol(reservation.currency || "USD")}{" "}
									{reservation.total_amount?.toFixed(2) || "0.00"}
								</div>
							</div>
							<div>
								<div className="text-muted-foreground">
									{t("calendar.bookingDialog.paidAmount")}
								</div>
								<div className="font-medium">
									{getCurrencySymbol(reservation.currency || "USD")}{" "}
									{reservation.paid_amount?.toFixed(2) || "0.00"}
								</div>
							</div>
						</div>

						{reservation.total_amount && reservation.paid_amount && (
							<div className="text-sm">
								<div className="text-muted-foreground">
									{t("calendar.bookingDialog.balance")}
								</div>
								<div
									className={`font-medium ${
										reservation.total_amount - reservation.paid_amount > 0
											? "text-red-600"
											: "text-green-600"
									}`}
								>
									{getCurrencySymbol(reservation.currency || "USD")}{" "}
									{(reservation.total_amount - reservation.paid_amount).toFixed(
										2,
									)}
								</div>
							</div>
						)}
					</div>

					{/* Action Buttons */}
					<Separator />

					<div className="flex gap-2 flex-wrap">
						<Button
							onClick={handleViewDetails}
							className="flex-1"
							variant="outline"
						>
							<Edit className="h-4 w-4 mr-2" />
							{t("calendar.bookingDialog.viewDetails")}
						</Button>

						{(reservation.status === "tentative" ||
							reservation.status === "pending") && (
							<Button onClick={handlePayment} className="flex-1">
								<CreditCard className="h-4 w-4 mr-2" />
								{t("calendar.bookingDialog.payment")}
							</Button>
						)}
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
