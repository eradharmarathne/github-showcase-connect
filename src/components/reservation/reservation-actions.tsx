import {
	CheckCircle,
	CreditCard,
	DollarSign,
	Download,
	Edit,
	Eye,
	MoreHorizontal,
	Printer,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { OTPVerification } from "../auth/otp-verification";

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
	currency: string;
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
	onDownloadPdf?: () => void;
	canShowPayment: boolean;
	isMobile?: boolean;
	showPaymentAndIncome?: boolean;
}

export function ReservationActions({
	reservation,
	onView,
	onEdit,
	onPayment,
	onAddIncome,
	onPrint,
	onDownloadPdf,
	canShowPayment,
	isMobile = false,
	showPaymentAndIncome = true,
}: ReservationActionsProps) {
	const isReservationComplete = reservation.status === "checked_out";

	if (isMobile) {
		return (
			<div className="space-y-2 mt-4">
				{/* Payment row - full width prominent button */}
				{showPaymentAndIncome &&
					(isReservationComplete ? (
						<div className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-green-50 border border-green-200 text-green-600">
							<CheckCircle className="size-4" />
							<span className="text-sm font-medium">Reservation Completed</span>
						</div>
					) : (
						<div className="flex gap-2">
							{canShowPayment && onPayment && (
								<Button
									variant="default"
									size="default"
									onClick={onPayment}
									className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold h-10"
								>
									<CreditCard className="size-4 mr-2" />
									Pay Now
								</Button>
							)}
							{onAddIncome && (
								<Button
									variant="outline"
									size="default"
									onClick={onAddIncome}
									className="flex-1 border-blue-300 text-blue-600 hover:bg-blue-50 hover:text-blue-700 font-medium h-10"
								>
									<DollarSign className="size-4 mr-2" />
									Add Income
								</Button>
							)}
						</div>
					))}

				{/* Action buttons row */}
				<div className="flex gap-2">
					<Button variant="outline" size="sm" className="flex-1" onClick={onView}>
						<Eye className="size-4 mr-1" />
						View
					</Button>
					{onPrint && (
						<Button variant="outline" size="sm" onClick={onPrint}>
							<Printer className="size-4" />
						</Button>
					)}
					{onDownloadPdf && (
						<Button variant="outline" size="sm" onClick={onDownloadPdf} className="text-blue-600 hover:text-blue-700">
							<Download className="size-4" />
						</Button>
					)}
					<OTPVerification
						onVerified={onEdit}
						triggerComponent={
							<Button variant="outline" size="sm">
								<Edit className="size-4" />
							</Button>
						}
					/>
				</div>
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
			<DropdownMenuContent align="end" className="w-52">
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
				{onDownloadPdf && (
					<DropdownMenuItem onClick={onDownloadPdf}>
						<Download className="size-4 mr-2" />
						Download PDF
					</DropdownMenuItem>
				)}

				{showPaymentAndIncome && (
					<>
						<DropdownMenuSeparator />
						{canShowPayment && (
							<DropdownMenuItem
								onClick={isReservationComplete ? undefined : onPayment}
								className={
									isReservationComplete
										? "text-gray-400 cursor-not-allowed"
										: "text-emerald-600 font-semibold"
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
