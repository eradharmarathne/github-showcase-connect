import {
	ArrowLeft,
	Calendar,
	Clock,
	CreditCard,
	Edit,
	MapPin,
	PenTool,
	Printer,
	User,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import { OTPVerification } from "@/components/auth/otp-verification";
import { SignatureCapture } from "@/components/media/signature-capture";

type Reservation = Tables<"reservations"> & {
	locations: Tables<"locations">;
	rooms: Tables<"rooms">;
};

type IncomeRecord = {
	id: string;
	booking_id: string;
	amount: number;
	payment_method: string;
	currency: string;
};

export default function ReservationDetails() {
	const { id } = useParams<{ id: string }>();
	const navigate = useNavigate();
	const { toast } = useToast();
	const [reservation, setReservation] = useState<Reservation | null>(null);
	const [incomeRecords, setIncomeRecords] = useState<IncomeRecord[]>([]);
	const [loading, setLoading] = useState(true);
	const [isOTPVerified, setIsOTPVerified] = useState(false);
	const [guestSignature, setGuestSignature] = useState("");

	const fetchReservation = useCallback(async () => {
		try {
			const [reservationRes, incomeRes] = await Promise.all([
				supabase
					.from("reservations")
					.select(`
						*,
						locations (*),
						rooms (*)
					`)
					.eq("id", id)
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
					.eq("booking_id", id),
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
	}, [id, toast]);

	useEffect(() => {
		if (id) {
			fetchReservation();
		}
	}, [id, fetchReservation]);
	const getPendingExpenses = () => {
		return incomeRecords
			.filter((inc) => inc.payment_method === "pending")
			.reduce((sum, inc) => sum + Number(inc.amount), 0);
	};

	const getTotalExpenses = () => {
		return incomeRecords.reduce((sum, inc) => sum + Number(inc.amount), 0);
	};

	const getTotalBalance = () => {
		const roomBalance = reservation?.balance_amount || 0;
		const pendingExpenses = getPendingExpenses();

		// If room is fully paid (balance = 0), only return pending expenses
		// If room has balance, return room balance + pending expenses
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

	const handlePrint = () => {
		// Custom print styles for better formatting
		const printStyles = `
      <style>
        @media print {
          body * { visibility: hidden; }
          .print-area, .print-area * { visibility: visible; }
          .print-area { position: absolute; left: 0; top: 0; width: 100%; }
          .no-print { display: none !important; }
          @page { margin: 0.5in; size: A4; }
        }
      </style>
    `;

		const head = document.head.innerHTML;
		document.head.innerHTML = head + printStyles;

		window.print();
	};

	const handleOTPVerified = () => {
		setIsOTPVerified(true);
		toast({
			title: "Verification Successful",
			description: "You can now edit this reservation.",
		});
	};

	if (loading) {
		return null;
	}

	if (!reservation) {
		return (
			<div className="max-w-4xl mx-auto p-4 sm:p-6 md:p-8 text-center">
				<h1 className="text-xl md:text-2xl lg:text-3xl font-bold mb-4">
					Reservation Not Found
				</h1>
				<Button asChild>
					<Link to="/reservations">Back to Reservations</Link>
				</Button>
			</div>
		);
	}

	return (
		<div className="w-full mx-auto px-4 sm:px-6 md:px-8 space-y-6 print-area">
			{/* Header */}
			<div className="flex flex-col sm:flex-row items-start px-0 sm:items-center gap-4 no-print">
				<div className="flex flex-1 items-center gap-4">
					<div className="flex-1">
						<h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-foreground">
							Reservation Details
						</h1>
						<p className="text-muted-foreground">
							#{reservation.reservation_number}
						</p>
					</div>
				</div>
				<div className="flex gap-2">
					<Button variant="outline" onClick={handlePrint}>
						<Printer className="size-4 mr-2" />
						Print
					</Button>
					<Button
						onClick={() => {
							const totalBalance = getTotalBalance();
							if (totalBalance > 0) {
								navigate(
									`/payments/new?reservation=${reservation.id}&amount=${totalBalance}&currency=${reservation.currency}`,
								);
							} else {
								navigate(`/reservations?reservation=${reservation.id}`);
							}
						}}
					>
						<CreditCard className="size-4 mr-2" />
						{getTotalBalance() > 0 ? "Make Payment" : "Payment History"}
					</Button>
					{isOTPVerified ? (
						<Button variant="outline" asChild>
							<Link to={`/reservations/edit/${reservation.id}`}>
								<Edit className="size-4 mr-2" />
								Edit
							</Link>
						</Button>
					) : (
						<OTPVerification
							onVerified={handleOTPVerified}
							triggerComponent={
								<Button variant="outline">
									<Edit className="size-4 mr-2" />
									Edit
								</Button>
							}
						/>
					)}
				</div>
			</div>

			{/* Print Header - Only visible when printing */}
			<div className="hidden print:block text-center mb-6">
				<h1 className="text-xl md:text-2xl lg:text-3xl font-bold">
					Reservation Details
				</h1>
				<p className="text-base md:text-lg lg:text-xl">
					#{reservation.reservation_number}
				</p>
				<p className="text-xs sm:text-sm md:text-base text-muted-foreground">
					Generated on {new Date().toLocaleString()}
				</p>
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6 px-0 pb-20 sm:pb-8">
				{/* Guest Information */}
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<User className="size-5" />
							Guest Information
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						<div>
							<label className="text-sm font-medium text-muted-foreground">
								Name
							</label>
							<p className="font-semibold">{reservation.guest_name}</p>
						</div>
						{reservation.guest_email && (
							<div>
								<label className="text-sm font-medium text-muted-foreground">
									Email
								</label>
								<p>{reservation.guest_email}</p>
							</div>
						)}
						{reservation.guest_phone && (
							<div>
								<label className="text-sm font-medium text-muted-foreground">
									Phone
								</label>
								<p>{reservation.guest_phone}</p>
							</div>
						)}
						{reservation.guest_address && (
							<div>
								<label className="text-sm font-medium text-muted-foreground">
									Address
								</label>
								<p>{reservation.guest_address}</p>
							</div>
						)}
						{reservation.guest_nationality && (
							<div>
								<label className="text-sm font-medium text-muted-foreground">
									Nationality
								</label>
								<p>{reservation.guest_nationality}</p>
							</div>
						)}
						<div className="flex gap-4">
							<div>
								<label className="text-sm font-medium text-muted-foreground">
									Adults
								</label>
								<p className="font-semibold">{reservation.adults}</p>
							</div>
							<div>
								<label className="text-sm font-medium text-muted-foreground">
									Children
								</label>
								<p className="font-semibold">{reservation.children}</p>
							</div>
						</div>
					</CardContent>
				</Card>

				{/* Reservation Details */}
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<Calendar className="size-5" />
							Reservation Details
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						<div>
							<label className="text-sm font-medium text-muted-foreground">
								Status
							</label>
							<div className="mt-1">
								<Badge className={getStatusColor(reservation.status)}>
									{reservation.status.toUpperCase()}
								</Badge>
							</div>
						</div>
						<div className="grid grid-cols-2 gap-4">
							<div>
								<label className="text-sm font-medium text-muted-foreground">
									Check-in
								</label>
								<p className="font-semibold">
									{new Date(reservation.check_in_date).toLocaleDateString()}
								</p>
							</div>
							<div>
								<label className="text-sm font-medium text-muted-foreground">
									Check-out
								</label>
								<p className="font-semibold">
									{new Date(reservation.check_out_date).toLocaleDateString()}
								</p>
							</div>
						</div>
						<div>
							<label className="text-sm font-medium text-muted-foreground">
								Nights
							</label>
							<p className="font-semibold">{reservation.nights}</p>
						</div>
						{reservation.arrival_time && (
							<div>
								<label className="text-sm font-medium text-muted-foreground">
									Arrival Time
								</label>
								<p>{reservation.arrival_time}</p>
							</div>
						)}
					</CardContent>
				</Card>

				{/* Location & Room */}
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<MapPin className="size-5" />
							Location & Room
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						<div>
							<label className="text-sm font-medium text-muted-foreground">
								Location
							</label>
							<p className="font-semibold">{reservation.locations?.name}</p>
						</div>
						<div>
							<label className="text-sm font-medium text-muted-foreground">
								Room
							</label>
							<p className="font-semibold">
								{reservation.rooms?.room_number} -{" "}
								{reservation.rooms?.room_type}
							</p>
						</div>
						<div>
							<label className="text-sm font-medium text-muted-foreground">
								Rate per Night
							</label>
							<p className="font-semibold">
								LKR {reservation.room_rate.toLocaleString()}
							</p>
						</div>
					</CardContent>
				</Card>

				{/* Payment Information */}
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<CreditCard className="size-5" />
							Payment Information
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="flex justify-between">
							<span className="text-muted-foreground">Total Amount</span>
							<span className="font-semibold">
								LKR {reservation.total_amount.toLocaleString()}
							</span>
						</div>
						<div className="flex justify-between">
							<span className="text-muted-foreground">Advance Paid</span>
							<span className="font-semibold text-emerald-600">
								LKR {reservation.advance_amount?.toLocaleString() || "0"}
							</span>
						</div>
						<div className="flex justify-between">
							<span className="text-muted-foreground">Total Paid</span>
							<span className="font-semibold text-emerald-600">
								LKR {reservation.paid_amount?.toLocaleString() || "0"}
							</span>
						</div>
						{getTotalExpenses() > 0 && (
							<>
								<div className="flex justify-between">
									<span className="text-muted-foreground">Total Expenses</span>
									<span className="font-semibold text-blue-600">
										LKR {getTotalExpenses().toLocaleString()}
									</span>
								</div>
								{getPendingExpenses() > 0 && (
									<div className="flex justify-between">
										<span className="text-muted-foreground">
											Pending Expenses
										</span>
										<span className="font-semibold text-yellow-600">
											LKR {getPendingExpenses().toLocaleString()}
										</span>
									</div>
								)}
							</>
						)}
						<Separator />
						<div className="flex justify-between text-lg">
							<span className="font-medium">Room Balance</span>
							<span className="font-bold text-red-600">
								LKR {reservation.balance_amount?.toLocaleString() || "0"}
							</span>
						</div>
						{getPendingExpenses() > 0 && (
							<div className="flex justify-between text-lg">
								<span className="font-medium">
									Total Balance (Room + Expenses)
								</span>
								<span className="font-bold text-red-600">
									LKR {getTotalBalance().toLocaleString()}
								</span>
							</div>
						)}
					</CardContent>
				</Card>

				{/* Special Requests */}
				{reservation.special_requests && (
					<Card>
						<CardHeader>
							<CardTitle>Special Requests</CardTitle>
						</CardHeader>
						<CardContent>
							<p>{reservation.special_requests}</p>
						</CardContent>
					</Card>
				)}

				{/* Guest Signature */}
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<PenTool className="size-5" />
							Guest Signature
						</CardTitle>
					</CardHeader>
					<CardContent>
						<SignatureCapture
							signature={guestSignature}
							onSignatureChange={setGuestSignature}
							title="Update Guest Signature"
						/>
					</CardContent>
				</Card>

				{/* System Information */}
				<Card className="no-print">
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<Clock className="size-5" />
							System Information
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-2">
						<div className="flex justify-between text-sm">
							<span className="text-muted-foreground">Created</span>
							<span>{new Date(reservation.created_at).toLocaleString()}</span>
						</div>
						<div className="flex justify-between text-sm">
							<span className="text-muted-foreground">Last Updated</span>
							<span>{new Date(reservation.updated_at).toLocaleString()}</span>
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
