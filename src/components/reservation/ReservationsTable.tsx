import { DollarSign } from "lucide-react";
import { useTranslation } from "react-i18next";
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

type Database = any;
type Reservation = Database["public"]["Tables"]["reservations"]["Row"];
type Room = Database["public"]["Tables"]["rooms"]["Row"];

interface ReservationsTableProps {
	reservations: Reservation[];
	rooms: Room[];
	reservationIncomeMap: Record<string, boolean>;
	onAddIncome: (reservation: Reservation) => void;
}

export function ReservationsTable({
	reservations,
	rooms,
	reservationIncomeMap,
	onAddIncome,
}: ReservationsTableProps) {
	const { t } = useTranslation();

	const getStatusBadge = (status: string) => {
		const variants: Record<
			string,
			"default" | "secondary" | "destructive" | "outline"
		> = {
			tentative: "outline",
			confirmed: "default",
			checked_in: "secondary",
			checked_out: "destructive",
			cancelled: "destructive",
		};
		return (
			<Badge variant={variants[status] || "default"}>
				{t(
					`income.reservationsTable.statuses.${status}`,
					status.charAt(0).toUpperCase() + status.slice(1),
				)}
			</Badge>
		);
	};

	const isAddIncomeDisabled = (reservation: Reservation) => {
		// Disable if balance is fully paid (balance <= 0.01 to handle rounding)
		if ((reservation.balance_amount || 0) <= 0.01) {
			return true;
		}
		// Disable if income already exists for this reservation
		if (reservationIncomeMap[reservation.id]) {
			return true;
		}
		return false;
	};

	const getDisabledReason = (reservation: Reservation) => {
		if ((reservation.balance_amount || 0) <= 0.01) {
			return t("income.reservationsTable.disabledReasons.fullyPaid");
		}
		if (reservationIncomeMap[reservation.id]) {
			return t("income.reservationsTable.disabledReasons.alreadyRecorded");
		}
		return "";
	};

	return (
		<Card>
			<CardHeader>
				<CardTitle>{t("income.reservationsTable.title")}</CardTitle>
			</CardHeader>
			<CardContent>
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>
								{t("income.reservationsTable.headers.reservationNumber")}
							</TableHead>
							<TableHead>
								{t("income.reservationsTable.headers.guest")}
							</TableHead>
							<TableHead>
								{t("income.reservationsTable.headers.room")}
							</TableHead>
							<TableHead>
								{t("income.reservationsTable.headers.checkIn")}
							</TableHead>
							<TableHead>
								{t("income.reservationsTable.headers.checkOut")}
							</TableHead>
							<TableHead>
								{t("income.reservationsTable.headers.totalAmount")}
							</TableHead>
							<TableHead>
								{t("income.reservationsTable.headers.status")}
							</TableHead>
							<TableHead>
								{t("income.reservationsTable.headers.action")}
							</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{reservations.map((reservation) => {
							const room = rooms.find((r) => r.id === reservation.room_id);
							return (
								<TableRow key={reservation.id}>
									<TableCell className="font-medium">
										{reservation.reservation_number}
									</TableCell>
									<TableCell>{reservation.guest_name}</TableCell>
									<TableCell>
										{room?.room_number} - {room?.room_type}
									</TableCell>
									<TableCell>
										{new Date(reservation.check_in_date).toLocaleDateString()}
									</TableCell>
									<TableCell>
										{new Date(reservation.check_out_date).toLocaleDateString()}
									</TableCell>
									<TableCell>
										LKR {reservation.total_amount.toLocaleString()}
									</TableCell>
									<TableCell>{getStatusBadge(reservation.status)}</TableCell>
									<TableCell>
										<Button
											variant="outline"
											size="sm"
											disabled={isAddIncomeDisabled(reservation)}
											title={getDisabledReason(reservation)}
											onClick={() => onAddIncome(reservation)}
										>
											<DollarSign className="size-4 mr-1" />
											{t("income.reservationsTable.addIncomeButton")}
										</Button>
									</TableCell>
								</TableRow>
							);
						})}
					</TableBody>
				</Table>
			</CardContent>
		</Card>
	);
}
