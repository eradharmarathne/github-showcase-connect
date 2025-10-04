import {
	CheckCircle,
	CreditCard,
	DollarSign,
	Edit,
	Eye,
	MoreHorizontal,
	Printer,
} from "lucide-react";
import { OTPVerification } from "@/components/OTPVerification";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type ReservationForActions = {
	id: string;
	reservation_number: string;
	location_id: string;
	room_id: string;
	guest_name: string;
	guest_email?: string | null;
	guest_phone?: string | null;
	guest_address?: string | null;
	guest_id_number?: string | null;
	guest_nationality?: string | null;
	adults: number;
	children: number;
	check_in_date: string;
	check_out_date: string;
	nights: number;
	room_rate: number;
	total_amount: number;
	advance_amount?: number | null;
	paid_amount?: number | null;
	balance_amount?: number | null;
	currency: "LKR" | "USD" | "EUR" | "GBP";
	status:
		| "pending"
		| "confirmed"
		| "checked_in"
		| "checked_out"
		| "cancelled"
		| "tentative";
	special_requests?: string | null;
	arrival_time?: string | null;
	created_by?: string | null;
	grc_approved: boolean;
	grc_approved_by?: string | null;
	grc_approved_at?: string | null;
	created_at: string;
	updated_at: string;
	tenant_id?: string | null;
	guide_id?: string | null;
	agent_id?: string | null;
	guide_commission?: number | null;
	agent_commission?: number | null;
	booking_source: string;
};

interface ReservationActionsProps {
	reservation: ReservationForActions;
	onView: () => void;
	onEdit: () => void;
	onPayment?: () => void;
	onAddIncome?: () => void;
	onPrint?: () => void;
	canShowPayment: boolean;
	isMobile?: boolean;
	showPaymentAndIncome?: boolean; // New prop to control visibility
}

export function ReservationActions({
	reservation,
	onView,
	onEdit,
	onPayment,
	onAddIncome,
	onPrint,
	canShowPayment,
	isMobile = false,
	showPaymentAndIncome = true,
}: ReservationActionsProps) {
	// Disable income and payment actions when reservation is checked out (complete)
	const isReservationComplete =
		reservation.status === "checked_out" || reservation.status === "confirmed";

	if (isMobile) {
		return (
			<div className="flex gap-2 mt-4">
				<Button variant="outline" size="sm" className="flex-1" onClick={onView}>
					<Eye className="size-4 mr-1" />
					View
				</Button>
				{onPrint && (
					<Button variant="outline" size="sm" onClick={onPrint}>
						<Printer className="size-4" />
					</Button>
				)}
				{showPaymentAndIncome &&
					(isReservationComplete ? (
						<Button
							variant="outline"
							size="sm"
							className="text-green-600 cursor-not-allowed"
							disabled
						>
							<CheckCircle className="size-4 mr-1" />
							Reservation Completed
						</Button>
					) : (
						<>
							{onAddIncome && (
								<Button
									variant="outline"
									size="sm"
									onClick={onAddIncome}
									className="text-blue-600 hover:text-blue-700"
								>
									<DollarSign className="size-4" />
								</Button>
							)}
							{canShowPayment && onPayment && (
								<Button
									variant="outline"
									size="sm"
									onClick={onPayment}
									className="text-green-600 hover:text-green-700"
								>
									<CreditCard className="size-4" />
								</Button>
							)}
						</>
					))}{" "}
				<OTPVerification
					onVerified={onEdit}
					triggerComponent={
						<Button variant="outline" size="sm">
							<Edit className="size-4" />
						</Button>
					}
				/>
			</div>
		);
	}

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="ghost" size="icon">
					<MoreHorizontal className="size-4" />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="w-48">
				<DropdownMenuItem onClick={onView}>
					<Eye className="size-4 mr-2" />
					View Details
				</DropdownMenuItem>
				{onPrint && (
					<DropdownMenuItem onClick={onPrint}>
						<Printer className="size-4 mr-2" />
						Print Reservation
					</DropdownMenuItem>
				)}
				{showPaymentAndIncome && (
					<>
						<DropdownMenuSeparator />
						<DropdownMenuItem
							onClick={isReservationComplete ? undefined : onAddIncome}
							className={
								isReservationComplete
									? "text-gray-400 cursor-not-allowed"
									: "text-blue-600"
							}
							disabled={isReservationComplete}
						>
							<DollarSign className="size-4 mr-2" />
							Add Income
							{isReservationComplete && (
								<span className="text-xs ml-2">(Complete)</span>
							)}
						</DropdownMenuItem>
						{canShowPayment && (
							<DropdownMenuItem
								onClick={isReservationComplete ? undefined : onPayment}
								className={
									isReservationComplete
										? "text-gray-400 cursor-not-allowed"
										: "text-green-600"
								}
								disabled={isReservationComplete}
							>
								<CreditCard className="size-4 mr-2" />
								Pay Now
								{isReservationComplete && (
									<span className="text-xs ml-2">(Complete)</span>
								)}
							</DropdownMenuItem>
						)}
					</>
				)}
				<DropdownMenuSeparator />
				<OTPVerification
					onVerified={onEdit}
					triggerComponent={
						<DropdownMenuItem onSelect={(e) => e.preventDefault()}>
							<Edit className="size-4 mr-2" />
							Edit Reservation
						</DropdownMenuItem>
					}
				/>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
