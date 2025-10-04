import {
	Calendar,
	CreditCard,
	DollarSign,
	Edit,
	Eye,
	MapPin,
} from "lucide-react";
import React, { useState } from "react";
import { ReservationsListSkeleton } from "@/components/ReservationsListSkeleton";
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
import {
	type ReservationFinancial,
	useReservationFinancials,
} from "@/hooks/useReservationFinancials";

const formatUSD = (amount: number) => {
	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: "USD",
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
	onViewReservation: (id: string) => void;
	onEditReservation: (reservation: any) => void;
	onPayment: (reservationId: string, amount: number, currency: string) => void;
	onAddIncome: (reservation: any) => void;
}

export function ReservationsDesktopTable({
	searchQuery,
	statusFilter,
	onViewReservation,
	onEditReservation,
	onPayment,
	onAddIncome,
}: ReservationsDesktopTableProps) {
	const { data: reservations, isLoading, error } = useReservationFinancials();

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
				<CardHeader>
					<CardTitle className="px-4 text-sm font-medium">
						Reservations
					</CardTitle>
				</CardHeader>
				<CardContent>
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Reservation</TableHead>
								<TableHead>Room Amount</TableHead>
								<TableHead>Expenses</TableHead>
								<TableHead>User Paid Amount</TableHead>
								<TableHead>Needs to Pay</TableHead>
								<TableHead>Quick Actions</TableHead>
								<TableHead className="text-right">More</TableHead>
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
													{reservation.status}
												</Badge>
											</div>
											<div className="text-sm text-gray-600">
												{reservation.guest_name}
											</div>
											<div className="flex items-center gap-3 text-xs text-gray-500">
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
											{formatUSD(reservation.room_amount_usd)}
										</div>
										<div className="text-xs text-gray-500">
											{reservation.nights} nights
										</div>
									</TableCell>
									<TableCell>
										<div className="font-medium text-orange-600">
											{formatUSD(reservation.expenses_usd)}
										</div>
									</TableCell>
									<TableCell>
										<div className="font-medium text-blue-600">
											{formatUSD(reservation.user_paid_amount_usd)}
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
											{formatUSD(reservation.needs_to_pay_usd)}
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
														? "Cannot add income - reservation is complete"
														: ""
												}
											>
												<DollarSign className="size-4 mr-1" />
												Add Income
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
														Pay Now
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
												onClick={() => onViewReservation(reservation.id)}
												className="h-8 w-8 p-0"
											>
												<Calendar className="h-4 w-4" />
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
