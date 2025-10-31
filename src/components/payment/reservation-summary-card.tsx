import { CreditCard } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ReservationData {
	reservation_number: string;
	guest_name: string;
	currency: string;
	total_amount: number;
	paid_amount: number | null;
	balance_amount: number | null;
	rooms?: {
		room_number: string;
		room_type: string;
	};
}

interface IncomeRecord {
	payment_method: string;
	amount: number;
}

interface ReservationSummaryCardProps {
	reservation: ReservationData;
	incomeRecords: IncomeRecord[];
}

export function ReservationSummaryCard({
	reservation,
	incomeRecords,
}: ReservationSummaryCardProps) {
	const pendingExpenses = incomeRecords
		.filter((inc) => inc.payment_method === "pending")
		.reduce((sum, inc) => sum + Number(inc.amount), 0);

	const hasPendingExpenses = pendingExpenses > 0;
	const totalToPay = (reservation.balance_amount || 0) + pendingExpenses;

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<CreditCard className="size-5" />
					Reservation Summary
				</CardTitle>
			</CardHeader>
			<CardContent className="space-y-2">
				<div className="flex justify-between">
					<span className="text-muted-foreground">Guest:</span>
					<span className="font-medium">{reservation.guest_name}</span>
				</div>
				<div className="flex justify-between">
					<span className="text-muted-foreground">Room:</span>
					<span className="font-medium">
						{reservation.rooms?.room_number} - {reservation.rooms?.room_type}
					</span>
				</div>
				<div className="flex justify-between">
					<span className="text-muted-foreground">Total Amount:</span>
					<span className="font-medium">
						{reservation.currency} {reservation.total_amount.toLocaleString()}
					</span>
				</div>
				<div className="flex justify-between">
					<span className="text-muted-foreground">Paid Amount:</span>
					<span className="font-medium text-green-600">
						{reservation.currency}{" "}
						{(reservation.paid_amount || 0).toLocaleString()}
					</span>
				</div>
				<div className="flex justify-between">
					<span className="text-muted-foreground">Balance:</span>
					<span className="font-bold text-red-600">
						{reservation.currency}{" "}
						{(reservation.balance_amount || 0).toLocaleString()}
					</span>
				</div>
				{hasPendingExpenses && (
					<>
						<div className="flex justify-between border-t pt-2">
							<span className="text-muted-foreground">Pending Expenses:</span>
							<span className="font-semibold text-yellow-600">
								{reservation.currency} {pendingExpenses.toLocaleString()}
							</span>
						</div>
						<div className="flex justify-between border-t pt-2">
							<span className="text-muted-foreground font-semibold">
								Total to Pay (Room + Expenses):
							</span>
							<span className="font-bold text-blue-600 text-lg">
								{reservation.currency} {totalToPay.toLocaleString()}
							</span>
						</div>
					</>
				)}
			</CardContent>
		</Card>
	);
}
