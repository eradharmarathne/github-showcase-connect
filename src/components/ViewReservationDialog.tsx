import {
	BedDouble,
	Calendar,
	Clock,
	CreditCard,
	DollarSign,
	MapPin,
	User,
	X,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";

type Reservation = Tables<"reservations"> & {
	locations: Tables<"locations"> | null;
	rooms: Tables<"rooms"> | null;
	guides?: Tables<"guides"> | null;
	agents?: Tables<"agents"> | null;
};

type IncomeRecord = {
	id: string;
	booking_id: string;
	amount: number;
	payment_method: string;
	currency: string;
};

interface ViewReservationDialogProps {
	isOpen: boolean;
	onClose: () => void;
	reservationId: string;
}

export function ViewReservationDialog({
	isOpen,
	onClose,
	reservationId,
}: ViewReservationDialogProps) {
	const { t } = useTranslation();
	const { toast } = useToast();
	const [reservation, setReservation] = useState<Reservation | null>(null);
	const [incomeRecords, setIncomeRecords] = useState<IncomeRecord[]>([]);
	const [loading, setLoading] = useState(true);

	const fetchReservation = useCallback(async () => {
		if (!reservationId) return;

		setLoading(true);
		try {
			const [reservationRes, incomeRes] = await Promise.all([
				supabase
					.from("reservations")
					.select(`
						*,
						locations (*),
						rooms (*),
						guides (*),
						agents (*)
					`)
					.eq("id", reservationId)
					.single(),
				supabase
					.from("income")
					.select(`
						id,
						booking_id,
						amount,
						payment_method,
						currency
					`)
					.eq("booking_id", reservationId),
			]);

			if (reservationRes.error) throw reservationRes.error;
			if (incomeRes.error) throw incomeRes.error;

			setReservation(reservationRes.data);
			setIncomeRecords(incomeRes.data || []);
		} catch (error) {
			console.error("Error fetching reservation:", error);
			toast({
				title: "Error",
				description: "Failed to load reservation details",
				variant: "destructive",
			});
		} finally {
			setLoading(false);
		}
	}, [reservationId, toast]);

	useEffect(() => {
		if (isOpen && reservationId) {
			fetchReservation();
		}
	}, [isOpen, reservationId, fetchReservation]);

	const getPendingExpenses = () => {
		return incomeRecords
			.filter((inc) => inc.payment_method === "pending")
			.reduce((sum, inc) => sum + Number(inc.amount), 0);
	};

	const getTotalExpenses = () => {
		return incomeRecords.reduce((sum, inc) => sum + Number(inc.amount), 0);
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

	const getTotalBalance = () => {
		const roomBalance = reservation?.balance_amount || 0;
		const pendingExpenses = getPendingExpenses();
		return roomBalance + pendingExpenses;
	};

	const getStatusColor = (status: string) => {
		const colors = {
			confirmed: "bg-emerald-100 text-emerald-800 border-emerald-200",
			tentative: "bg-amber-100 text-amber-800 border-amber-200",
			pending: "bg-orange-100 text-orange-800 border-border",
			checked_in: "bg-blue-100 text-blue-800 border-blue-200",
			checked_out: "bg-gray-100 text-gray-800 border-gray-200",
			cancelled: "bg-red-100 text-red-800 border-red-200",
		};
		return (
			colors[status as keyof typeof colors] ||
			"bg-gray-100 text-gray-800 border-gray-200"
		);
	};

	const getCurrencySymbol = (currency: string) => {
		const symbols: Record<string, string> = {
			LKR: "Rs.",
			USD: "$",
			EUR: "€",
			GBP: "£",
		};
		return symbols[currency] || currency;
	};

	if (loading) {
		return (
			null
		);
	}

	if (!reservation) {
		return (
			<Dialog open={isOpen} onOpenChange={onClose}>
				<DialogContent className="max-w-4xl">
					<div className="text-center py-8">
						<p className="text-muted-foreground">Reservation not found</p>
					</div>
				</DialogContent>
			</Dialog>
		);
	}

	return (
		<Dialog open={isOpen} onOpenChange={onClose}>
			<DialogContent className="max-w-2xl w-full sm:max-w-5xl md:max-w-8xl max-h-[90vh] md:max-h-[95vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2 text-xl">
						<Calendar className="size-5" />
						{t("reservations.dialog.viewTitle")}
					</DialogTitle>
					<DialogDescription>
						{t("reservations.viewDialog.reservationNumber")} #
						{reservation.reservation_number}
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-6">
					{/* Status and Location */}
					<div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b">
						<div className="flex items-center gap-3">
							<Badge className={getStatusColor(reservation.status)}>
								{getStatusText(reservation.status).toUpperCase()}
							</Badge>
							{reservation.locations && (
								<div className="flex items-center gap-2 text-sm text-muted-foreground">
									<MapPin className="size-4" />
									<span>{reservation.locations.name}</span>
								</div>
							)}
						</div>
						<div className="text-sm text-muted-foreground">
							Created: {new Date(reservation.created_at).toLocaleDateString()}
						</div>
					</div>

					<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
						{/* Guest Information */}
						<Card>
							<CardHeader>
								<CardTitle className="flex items-center gap-2 text-base">
									<User className="size-4" />
									{t("reservations.viewDialog.guestInformation")}
								</CardTitle>
							</CardHeader>
							<CardContent className="space-y-3">
								<div>
									<label className="text-xs font-medium text-muted-foreground">
										Name
									</label>
									<p className="text-sm font-semibold">
										{reservation.guest_name}
									</p>
								</div>
								{reservation.guest_email && (
									<div>
										<label className="text-xs font-medium text-muted-foreground">
											Email
										</label>
										<p className="text-sm">{reservation.guest_email}</p>
									</div>
								)}
								{reservation.guest_phone && (
									<div>
										<label className="text-xs font-medium text-muted-foreground">
											Phone
										</label>
										<p className="text-sm">{reservation.guest_phone}</p>
									</div>
								)}
								{reservation.guest_address && (
									<div>
										<label className="text-xs font-medium text-muted-foreground">
											Address
										</label>
										<p className="text-sm">{reservation.guest_address}</p>
									</div>
								)}
								{reservation.guest_nationality && (
									<div>
										<label className="text-xs font-medium text-muted-foreground">
											Nationality
										</label>
										<p className="text-sm">{reservation.guest_nationality}</p>
									</div>
								)}
								{reservation.guest_passport_number && (
									<div>
										<label className="text-xs font-medium text-muted-foreground">
											Passport Number
										</label>
										<p className="text-sm">
											{reservation.guest_passport_number}
										</p>
									</div>
								)}
								{reservation.guest_id_number && (
									<div>
										<label className="text-xs font-medium text-muted-foreground">
											ID Number
										</label>
										<p className="text-sm">{reservation.guest_id_number}</p>
									</div>
								)}
								<div className="flex gap-6">
									<div>
										<label className="text-xs font-medium text-muted-foreground">
											Adults
										</label>
										<p className="text-sm font-semibold">
											{reservation.adults}
										</p>
									</div>
									<div>
										<label className="text-xs font-medium text-muted-foreground">
											Children
										</label>
										<p className="text-sm font-semibold">
											{reservation.children}
										</p>
									</div>
								</div>
							</CardContent>
						</Card>

						{/* Stay Details */}
						<Card>
							<CardHeader>
								<CardTitle className="flex items-center gap-2 text-base">
									<Calendar className="size-4" />
									{t("reservations.viewDialog.stayDetails")}
								</CardTitle>
							</CardHeader>
							<CardContent className="space-y-3">
								<div className="grid grid-cols-2 gap-4">
									<div>
										<label className="text-xs font-medium text-muted-foreground">
											Check-in
										</label>
										<p className="text-sm font-semibold">
											{new Date(reservation.check_in_date).toLocaleDateString()}
										</p>
									</div>
									<div>
										<label className="text-xs font-medium text-muted-foreground">
											Check-out
										</label>
										<p className="text-sm font-semibold">
											{new Date(
												reservation.check_out_date,
											).toLocaleDateString()}
										</p>
									</div>
								</div>
								<div>
									<label className="text-xs font-medium text-muted-foreground">
										Nights
									</label>
									<p className="text-sm font-semibold">{reservation.nights}</p>
								</div>
								{reservation.arrival_time && (
									<div>
										<label className="text-xs font-medium text-muted-foreground">
											Arrival Time
										</label>
										<p className="text-sm flex items-center gap-1">
											<Clock className="size-3" />
											{reservation.arrival_time}
										</p>
									</div>
								)}
								{reservation.special_requests && (
									<div>
										<label className="text-xs font-medium text-muted-foreground">
											Special Requests
										</label>
										<p className="text-sm">{reservation.special_requests}</p>
									</div>
								)}
								<div>
									<label className="text-xs font-medium text-muted-foreground">
										Booking Source
									</label>
									<p className="text-sm capitalize">
										{reservation.booking_source || "Direct"}
									</p>
								</div>
							</CardContent>
						</Card>

						{/* Room Information */}
						<Card>
							<CardHeader>
								<CardTitle className="flex items-center gap-2 text-base">
									<BedDouble className="size-4" />
									{t("reservations.viewDialog.roomInformation")}
								</CardTitle>
							</CardHeader>
							<CardContent className="space-y-3">
								{reservation.rooms ? (
									<>
										<div>
											<label className="text-xs font-medium text-muted-foreground">
												Room Number
											</label>
											<p className="text-sm font-semibold">
												{reservation.rooms.room_number}
											</p>
										</div>
										<div>
											<label className="text-xs font-medium text-muted-foreground">
												Room Type
											</label>
											<p className="text-sm">{reservation.rooms.room_type}</p>
										</div>
										<div>
											<label className="text-xs font-medium text-muted-foreground">
												Bed Type
											</label>
											<p className="text-sm">{reservation.rooms.bed_type}</p>
										</div>
										{reservation.rooms.description && (
											<div>
												<label className="text-xs font-medium text-muted-foreground">
													Description
												</label>
												<p className="text-sm">
													{reservation.rooms.description}
												</p>
											</div>
										)}
										{reservation.rooms.amenities &&
											reservation.rooms.amenities.length > 0 && (
												<div>
													<label className="text-xs font-medium text-muted-foreground">
														Amenities
													</label>
													<p className="text-sm">
														{reservation.rooms.amenities.join(", ")}
													</p>
												</div>
											)}
									</>
								) : (
									<p className="text-sm text-muted-foreground">
										Room information not available
									</p>
								)}
							</CardContent>
						</Card>

						{/* Pricing & Payment */}
						<Card>
							<CardHeader>
								<CardTitle className="flex items-center gap-2 text-base">
									<DollarSign className="size-4" />
									{t("reservations.viewDialog.financialDetails")}
								</CardTitle>
							</CardHeader>
							<CardContent className="space-y-3">
								<div className="flex justify-between items-center">
									<label className="text-xs font-medium text-muted-foreground">
										Room Rate (per night)
									</label>
									<p className="text-sm font-semibold">
										{getCurrencySymbol(reservation.currency)}{" "}
										{reservation.room_rate.toLocaleString()}
									</p>
								</div>
								<div className="flex justify-between items-center">
									<label className="text-xs font-medium text-muted-foreground">
										Nights
									</label>
									<p className="text-sm">× {reservation.nights}</p>
								</div>
								<Separator />
								<div className="flex justify-between items-center">
									<label className="text-xs font-medium text-muted-foreground">
										Total Amount
									</label>
									<p className="text-sm font-bold">
										{getCurrencySymbol(reservation.currency)}{" "}
										{reservation.total_amount.toLocaleString()}
									</p>
								</div>
								<div className="flex justify-between items-center">
									<label className="text-xs font-medium text-muted-foreground">
										Paid Amount
									</label>
									<p className="text-sm text-emerald-600 font-semibold">
										{getCurrencySymbol(reservation.currency)}{" "}
										{(reservation.paid_amount || 0).toLocaleString()}
									</p>
								</div>
								{getTotalExpenses() > 0 && (
									<div className="flex justify-between items-center">
										<label className="text-xs font-medium text-muted-foreground">
											Additional Expenses
										</label>
										<p className="text-sm text-orange-600">
											{getCurrencySymbol(reservation.currency)}{" "}
											{getTotalExpenses().toLocaleString()}
										</p>
									</div>
								)}
								<Separator />
								<div className="flex justify-between items-center">
									<label className="text-sm font-semibold">Balance Due</label>
									<p
										className={`text-base font-bold ${getTotalBalance() > 0 ? "text-red-600" : "text-emerald-600"}`}
									>
										{getCurrencySymbol(reservation.currency)}{" "}
										{getTotalBalance().toLocaleString()}
									</p>
								</div>
							</CardContent>
						</Card>
					</div>

					{/* Commission Details (if applicable) */}
					{(reservation.guides || reservation.agents) && (
						<Card>
							<CardHeader>
								<CardTitle className="flex items-center gap-2 text-base">
									<CreditCard className="size-4" />
									{t("reservations.viewDialog.commissionDetails")}
								</CardTitle>
							</CardHeader>
							<CardContent className="space-y-3">
								<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
									{reservation.guides && (
										<div>
											<label className="text-xs font-medium text-muted-foreground">
												Guide
											</label>
											<p className="text-sm font-semibold">
												{reservation.guides.name}
											</p>
											{reservation.guide_commission && (
												<p className="text-sm text-muted-foreground">
													Commission: {getCurrencySymbol(reservation.currency)}{" "}
													{reservation.guide_commission.toLocaleString()}
												</p>
											)}
										</div>
									)}
									{reservation.agents && (
										<div>
											<label className="text-xs font-medium text-muted-foreground">
												Agent
											</label>
											<p className="text-sm font-semibold">
												{reservation.agents.name}
											</p>
											{reservation.agents.agency_name && (
												<p className="text-xs text-muted-foreground">
													{reservation.agents.agency_name}
												</p>
											)}
											{reservation.agent_commission && (
												<p className="text-sm text-muted-foreground">
													Commission: {getCurrencySymbol(reservation.currency)}{" "}
													{reservation.agent_commission.toLocaleString()}
												</p>
											)}
										</div>
									)}
								</div>
							</CardContent>
						</Card>
					)}

					{/* Action Buttons */}
					<div className="flex justify-end gap-3 pt-2 border-t">
						<Button variant="outline" onClick={onClose}>
							<X className="size-4 mr-2" />
							Close
						</Button>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
