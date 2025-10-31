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
import { convertCurrency } from "@/utils/currency";

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
	const [externalBooking, setExternalBooking] = useState<any | null>(null);
	const [isExternalBooking, setIsExternalBooking] = useState(false);
	const [incomeRecords, setIncomeRecords] = useState<IncomeRecord[]>([]);
	const [loading, setLoading] = useState(true);
	const [convertedAmounts, setConvertedAmounts] = useState({
		totalExpenses: 0,
		pendingExpenses: 0,
		paidExpenses: 0,
	});

	const fetchReservation = useCallback(async () => {
		if (!reservationId) return;

		setLoading(true);
		try {
			// Fetch reservation (handles both direct and external bookings from unified table)
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
					.maybeSingle(),
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

			if (!reservationRes.data) {
				toast({
					title: "Not Found",
					description: "Booking not found.",
					variant: "destructive",
				});
				onClose();
				setLoading(false);
				return;
			}

			// Check if it's an external booking
			const isExternal = reservationRes.data.is_external === true;
			setIsExternalBooking(isExternal);
			
			if (isExternal) {
				setExternalBooking(reservationRes.data);
			} else {
				setReservation(reservationRes.data);
			}
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
	}, [reservationId, toast, onClose]);

	useEffect(() => {
		if (isOpen && reservationId) {
			fetchReservation();
		}
	}, [isOpen, reservationId, fetchReservation]);

	// Convert income amounts to booking currency when data loads
	useEffect(() => {
		const currentBooking = isExternalBooking ? externalBooking : reservation;
		if (currentBooking && incomeRecords.length >= 0) {
			const convertAmounts = async () => {
				try {
					let totalExpenses = 0;
					let pendingExpenses = 0;
					let paidExpenses = 0;

					for (const income of incomeRecords) {
						const convertedAmount = await convertCurrency(
							Number(income.amount),
							income.currency,
							currentBooking.currency,
							currentBooking.tenant_id!,
							currentBooking.location_id,
						);

						totalExpenses += convertedAmount;

						if (income.payment_method === "pending" || !income.payment_method) {
							pendingExpenses += convertedAmount;
						} else {
							paidExpenses += convertedAmount;
						}
					}

					setConvertedAmounts({
						totalExpenses: Math.round(totalExpenses * 100) / 100,
						pendingExpenses: Math.round(pendingExpenses * 100) / 100,
						paidExpenses: Math.round(paidExpenses * 100) / 100,
					});
				} catch (error) {
					console.error("Error converting income amounts:", error);
				}
			};

			convertAmounts();
		}
	}, [reservation, externalBooking, isExternalBooking, incomeRecords]);

	const getPendingExpenses = () => {
		return convertedAmounts.pendingExpenses;
	};

	const getTotalExpenses = () => {
		return convertedAmounts.totalExpenses;
	};

	const getPaidExpenses = () => {
		return convertedAmounts.paidExpenses;
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
		// Balance = Room balance + Pending expenses
		// Room balance already accounts for paid room amount and paid additional services
		// We only need to add pending expenses that haven't been paid yet
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
		return null;
	}

	const currentBooking = isExternalBooking ? externalBooking : reservation;
	
	if (!currentBooking) {
		return (
			<Dialog open={isOpen} onOpenChange={onClose}>
				<DialogContent className="max-w-4xl">
					<div className="text-center py-8">
						<p className="text-muted-foreground">Booking not found</p>
					</div>
				</DialogContent>
			</Dialog>
		);
	}

	// For external bookings, map field names
	const bookingNumber = isExternalBooking 
		? currentBooking.reservation_number || `${(currentBooking.source_channel || 'EXTERNAL').toUpperCase()}-${currentBooking.external_id}`
		: currentBooking.reservation_number;
	
	const guestName = currentBooking.guest_name;
	const guestEmail = isExternalBooking 
		? currentBooking.raw_data?.guest?.email || null
		: currentBooking.guest_email;
	const guestPhone = isExternalBooking
		? currentBooking.raw_data?.guest?.phone || null
		: currentBooking.guest_phone;
	const guestAddress = isExternalBooking ? null : currentBooking.guest_address;
	const guestNationality = isExternalBooking ? null : currentBooking.guest_nationality;
	const guestPassportNumber = isExternalBooking ? null : currentBooking.guest_passport_number;
	const guestIdNumber = isExternalBooking ? null : currentBooking.guest_id_number;
	const adults = currentBooking.adults || 0;
	const children = currentBooking.children || 0;
	// For external bookings, prefer timestamp fields, fall back to date fields
	const checkInDate = isExternalBooking 
		? (currentBooking.check_in_timestamp || currentBooking.check_in_date)
		: currentBooking.check_in_date;
	const checkOutDate = isExternalBooking 
		? (currentBooking.check_out_timestamp || currentBooking.check_out_date)
		: currentBooking.check_out_date;
	const nights = currentBooking.nights || Math.ceil((new Date(checkOutDate).getTime() - new Date(checkInDate).getTime()) / (1000 * 60 * 60 * 24));
	const arrivalTime = isExternalBooking ? null : currentBooking.arrival_time;
	const specialRequests = isExternalBooking 
		? currentBooking.raw_data?.notes || null
		: currentBooking.special_requests;
	const bookingSource = isExternalBooking ? currentBooking.source_channel : currentBooking.booking_source;
	
	// Room information
	const roomInfo = currentBooking.rooms || null;
	
	// Financial fields
	const currency = currentBooking.currency || "LKR";
	const roomRate = currentBooking.room_rate || 0;
	const totalAmount = currentBooking.total_amount || 0;
	const paidAmount = currentBooking.paid_amount || 0;

	return (
		<Dialog open={isOpen} onOpenChange={onClose}>
			<DialogContent className="max-w-2xl w-full sm:max-w-5xl md:max-w-8xl max-h-[90vh] md:max-h-[95vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2 text-xl">
						<Calendar className="size-5" />
						{isExternalBooking ? "Booking Details" : t("reservations.dialog.viewTitle")}
					</DialogTitle>
					<DialogDescription>
						{isExternalBooking ? "Booking" : t("reservations.viewDialog.reservationNumber")} #
						{bookingNumber}
						{isExternalBooking && (
							<span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
								External Booking
							</span>
						)}
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-6">
					{/* Status and Location */}
					<div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b">
						<div className="flex items-center gap-3">
							<Badge className={getStatusColor(currentBooking.status)}>
								{getStatusText(currentBooking.status).toUpperCase()}
							</Badge>
							{currentBooking.locations && (
								<div className="flex items-center gap-2 text-sm text-muted-foreground">
									<MapPin className="size-4" />
									<span>{currentBooking.locations.name}</span>
								</div>
							)}
						</div>
						<div className="text-sm text-muted-foreground">
							{isExternalBooking ? "Last Synced" : "Created"}: {new Date(isExternalBooking ? currentBooking.last_synced_at : currentBooking.created_at).toLocaleDateString()}
						</div>
					</div>

					<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
						{/* Guest Information */}
						<Card>
							<CardHeader>
								<CardTitle className="flex items-center gap-2 text-sm md:text-base lg:text-lg">
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
										{guestName}
									</p>
								</div>
								{guestEmail && (
									<div>
										<label className="text-xs font-medium text-muted-foreground">
											Email
										</label>
										<p className="text-sm">{guestEmail}</p>
									</div>
								)}
								{guestPhone && (
									<div>
										<label className="text-xs font-medium text-muted-foreground">
											Phone
										</label>
										<p className="text-sm">{guestPhone}</p>
									</div>
								)}
								{guestAddress && (
									<div>
										<label className="text-xs font-medium text-muted-foreground">
											Address
										</label>
										<p className="text-sm">{guestAddress}</p>
									</div>
								)}
								{guestNationality && (
									<div>
										<label className="text-xs font-medium text-muted-foreground">
											Nationality
										</label>
										<p className="text-sm">{guestNationality}</p>
									</div>
								)}
								{guestPassportNumber && (
									<div>
										<label className="text-xs font-medium text-muted-foreground">
											Passport Number
										</label>
										<p className="text-sm">
											{guestPassportNumber}
										</p>
									</div>
								)}
								{guestIdNumber && (
									<div>
										<label className="text-xs font-medium text-muted-foreground">
											ID Number
										</label>
										<p className="text-sm">{guestIdNumber}</p>
									</div>
								)}
								<div className="flex gap-6">
									<div>
										<label className="text-xs font-medium text-muted-foreground">
											Adults
										</label>
										<p className="text-sm font-semibold">
											{adults}
										</p>
									</div>
									<div>
										<label className="text-xs font-medium text-muted-foreground">
											Children
										</label>
										<p className="text-sm font-semibold">
											{children}
										</p>
									</div>
								</div>
							</CardContent>
						</Card>

						{/* Stay Details */}
						<Card>
							<CardHeader>
								<CardTitle className="flex items-center gap-2 text-sm md:text-base lg:text-lg">
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
											{new Date(checkInDate).toLocaleDateString()}
										</p>
									</div>
									<div>
										<label className="text-xs font-medium text-muted-foreground">
											Check-out
										</label>
										<p className="text-sm font-semibold">
											{new Date(checkOutDate).toLocaleDateString()}
										</p>
									</div>
								</div>
								<div>
									<label className="text-xs font-medium text-muted-foreground">
										Nights
									</label>
									<p className="text-sm font-semibold">{nights}</p>
								</div>
								{arrivalTime && (
									<div>
										<label className="text-xs font-medium text-muted-foreground">
											Arrival Time
										</label>
										<p className="text-sm flex items-center gap-1">
											<Clock className="size-3" />
											{arrivalTime}
										</p>
									</div>
								)}
								{specialRequests && (
									<div>
										<label className="text-xs font-medium text-muted-foreground">
											Special Requests
										</label>
										<p className="text-sm">{specialRequests}</p>
									</div>
								)}
								<div>
									<label className="text-xs font-medium text-muted-foreground">
										Booking Source
									</label>
									<p className="text-sm capitalize">
										{bookingSource || "Direct"}
									</p>
								</div>
							</CardContent>
						</Card>

						{/* Room Information */}
						<Card>
							<CardHeader>
								<CardTitle className="flex items-center gap-2 text-sm md:text-base lg:text-lg">
									<BedDouble className="size-4" />
									{t("reservations.viewDialog.roomInformation")}
								</CardTitle>
							</CardHeader>
							<CardContent className="space-y-3">
								{roomInfo ? (
									<>
										<div>
											<label className="text-xs font-medium text-muted-foreground">
												Room Number
											</label>
											<p className="text-sm font-semibold">
												{roomInfo.room_number}
											</p>
										</div>
										<div>
											<label className="text-xs font-medium text-muted-foreground">
												Room Type
											</label>
											<p className="text-sm">{roomInfo.room_type}</p>
										</div>
										<div>
											<label className="text-xs font-medium text-muted-foreground">
												Bed Type
											</label>
											<p className="text-sm">{roomInfo.bed_type}</p>
										</div>
										{roomInfo.description && (
											<div>
												<label className="text-xs font-medium text-muted-foreground">
													Description
												</label>
												<p className="text-sm">
													{roomInfo.description}
												</p>
											</div>
										)}
										{roomInfo.amenities &&
											roomInfo.amenities.length > 0 && (
												<div>
													<label className="text-xs font-medium text-muted-foreground">
														Amenities
													</label>
													<p className="text-sm">
														{roomInfo.amenities.join(", ")}
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
								<CardTitle className="flex items-center gap-2 text-sm md:text-base lg:text-lg">
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
										{getCurrencySymbol(currency)}{" "}
										{roomRate.toLocaleString()}
									</p>
								</div>
								<div className="flex justify-between items-center">
									<label className="text-xs font-medium text-muted-foreground">
										Nights
									</label>
									<p className="text-sm">× {nights}</p>
								</div>
								<Separator />
								<div className="flex justify-between items-center">
									<label className="text-xs font-medium text-muted-foreground">
										Total Amount
									</label>
									<p className="text-sm font-bold">
										{getCurrencySymbol(currency)}{" "}
										{totalAmount.toLocaleString()}
									</p>
								</div>
								<div className="flex justify-between items-center">
									<label className="text-xs font-medium text-muted-foreground">
										Paid Amount
									</label>
									<p className="text-sm text-emerald-600 font-semibold">
										{getCurrencySymbol(currency)}{" "}
										{(paidAmount || 0).toLocaleString()}
									</p>
								</div>
								{getPaidExpenses() > 0 && (
									<div className="flex justify-between items-center">
										<label className="text-xs font-medium text-muted-foreground">
											Paid Additional Services
										</label>
										<p className="text-sm text-emerald-600">
											{getCurrencySymbol(currency)}{" "}
											{getPaidExpenses().toLocaleString()}
										</p>
									</div>
								)}
								{getPendingExpenses() > 0 && (
									<div className="flex justify-between items-center">
										<label className="text-xs font-medium text-muted-foreground">
											Pending Additional Services
										</label>
										<p className="text-sm text-orange-600">
											{getCurrencySymbol(currency)}{" "}
											{getPendingExpenses().toLocaleString()}
										</p>
									</div>
								)}
								<Separator />
								<div className="flex justify-between items-center">
									<label className="text-sm font-semibold">Balance Due</label>
									<p
										className={`text-base font-bold ${getTotalBalance() > 0 ? "text-red-600" : "text-emerald-600"}`}
									>
										{getCurrencySymbol(currency)}{" "}
										{getTotalBalance().toLocaleString()}
									</p>
								</div>
							</CardContent>
						</Card>
					</div>

					{/* Commission Details (if applicable) - only for direct reservations */}
					{!isExternalBooking && (reservation.guides || reservation.agents) && (
						<Card>
							<CardHeader>
								<CardTitle className="flex items-center gap-2 text-sm md:text-base lg:text-lg">
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
													Commission: {getCurrencySymbol(currency)}{" "}
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
													Commission: {getCurrencySymbol(currency)}{" "}
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
