/** biome-ignore-all lint/suspicious/noEmptyBlockStatements: <explanation> */
import { CreditCard, DollarSign } from "lucide-react";
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
	type ReservationWithJoins,
	useReservationsData,
} from "@/hooks/useReservationsData";
import { useReservationPrint } from "@/hooks/useReservationPrint";
import { useAuth } from "@/context/AuthContext";
import { ReservationActions } from "./ReservationActions";
import { ReservationExpensesDisplay } from "./ReservationExpensesDisplay";

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
	const { reservations, loading } = useReservationsData();
	const { printReservation } = useReservationPrint();
	const { tenant } = useAuth();

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

	const getStatusColor = (status: string): string => {
		const colors: Record<string, string> = {
			confirmed: "bg-green-100 text-green-800",
			pending: "bg-yellow-100 text-yellow-800",
			cancelled: "bg-red-100 text-red-800",
			checked_in: "bg-blue-100 text-blue-800",
			checked_out: "bg-gray-100 text-gray-800",
			tentative: "bg-orange-100 text-orange-800",
		};
		return colors[status] || "bg-gray-100 text-gray-800";
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
		const printableData = transformToPrintableData(reservation);
		printReservation(printableData);
	};

	// Filter reservations
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

	if (loading) {
		return <ReservationsListSkeleton />;
	}
	return (
		<div className="hidden lg:block">
			<Card>
				<CardHeader>
					<CardTitle className="px-4 text-sm font-medium">Reservations</CardTitle>
				</CardHeader>
				<CardContent>
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Reservation #</TableHead>
								<TableHead>Guest</TableHead>
								<TableHead>Room</TableHead>
								<TableHead>Stay Period</TableHead>
								<TableHead>Amount Breakdown</TableHead>
								<TableHead>Total Payable</TableHead>
								<TableHead>Paid Amount</TableHead>
								<TableHead>Balance Due</TableHead>
								<TableHead>Quick Actions</TableHead>
								<TableHead>More</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{filteredReservations.map((reservation) => (
								<TableRow key={reservation.id}>
									<TableCell className="font-medium">
										<div>
											<div>{reservation.reservation_number}</div>
											<div className="text-xs text-muted-foreground mt-1">
												<Badge className={`${getStatusColor(reservation.status)} text-xs`}>
													{reservation.status}
												</Badge>
											</div>
										</div>
									</TableCell>
									<TableCell>{reservation.guest_name}</TableCell>
									<TableCell>
										{reservation.rooms?.room_number} -{" "}
										{reservation.rooms?.room_type}
									</TableCell>
									<TableCell>
										<div className="text-sm">
											<div className="font-medium">
												{new Date(reservation.check_in_date).toLocaleDateString()}
											</div>
											<div className="text-muted-foreground text-xs">to</div>
											<div className="font-medium">
												{new Date(reservation.check_out_date).toLocaleDateString()}
											</div>
											<div className="text-xs text-muted-foreground">
												({reservation.nights} {reservation.nights === 1 ? 'night' : 'nights'})
											</div>
										</div>
									</TableCell>
									<TableCell>
										<div className="text-sm space-y-1">
											<div className="font-medium">
												Room: {getCurrencySymbol(reservation.currency)}{" "}
												{(reservation.room_rate * reservation.nights).toLocaleString()}
											</div>
											<div className="text-muted-foreground">
												Services: <ReservationExpensesDisplay
													reservationId={reservation.id}
													currency={reservation.currency}
													isCompact={true}
												/>
											</div>
										</div>
									</TableCell>
									<TableCell>
										{getCurrencySymbol(reservation.currency)}{" "}
										{getTotalPayableAmount(reservation).toLocaleString()}
									</TableCell>
									<TableCell>
										{getCurrencySymbol(reservation.currency)}{" "}
										{(reservation.paid_amount || 0).toLocaleString()}
									</TableCell>
									<TableCell>
										{getCurrencySymbol(reservation.currency)}{" "}
										{Math.max(0, reservation.balance_amount || 0).toLocaleString()}
									</TableCell>
									<TableCell>
										<div className="flex gap-1">
											<Button
												variant="outline"
												size="sm"
												onClick={() => onAddIncome(reservation)}
												className="text-blue-600 hover:text-blue-700 cursor-pointer"
												disabled={reservation.status === "checked_out"}
												title={reservation.status === "checked_out" ? "Cannot add income - reservation is complete" : ""}
											>
												<DollarSign className="size-4 mr-1" />
												Add Income
											</Button>
											{canShowPaymentButton(reservation) && reservation.status !== "checked_out" && (
												<Button
													variant="outline"
													size="sm"
													onClick={() =>
														onPayment(
															reservation.id,
															getTotalPayableAmount(reservation),
															reservation.currency,
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
									<TableCell>
										<ReservationActions
											reservation={reservation}
											onView={() => onViewReservation(reservation.id)}
											onEdit={() => onEditReservation(reservation)}
											onPayment={() => {}} // Not used since showPaymentAndIncome=false
											onAddIncome={() => {}} // Not used since showPaymentAndIncome=false
											onPrint={() => handlePrintReservation(reservation)}
											canShowPayment={false}
											isMobile={false}
											showPaymentAndIncome={false}
										/>
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
