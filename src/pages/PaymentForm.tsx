import { format } from "date-fns";
import { ArrowLeft, CreditCard, Save } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { CurrencySelector } from "@/components/CurrencySelector";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/context/AuthContext";
import { useLocationContext } from "@/context/LocationContext";
import { useToast } from "@/hooks/use-toast";
import { useTenant } from "@/hooks/useTenant";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import { convertCurrency } from "@/utils/currency";

type Reservation = Tables<"reservations"> & {
	locations: Tables<"locations">;
	rooms: Tables<"rooms">;
};
type Account = Tables<"accounts">;

export default function PaymentForm() {
	const navigate = useNavigate();
	const { toast } = useToast();
	const [searchParams] = useSearchParams();
	const { user } = useAuth();
	const { tenant } = useTenant();
	const { selectedLocation } = useLocationContext();

	const reservationId = searchParams.get("reservation");
	const initialAmount = parseFloat(searchParams.get("amount") || "0");
	const initialCurrency = searchParams.get("currency") || "LKR";

	const [reservation, setReservation] = useState<Reservation | null>(null);
	const [accounts, setAccounts] = useState<Account[]>([]);
	const [location, setLocation] = useState<any>(null);
	const [incomeRecords, setIncomeRecords] = useState<any[]>([]);
	const [loading, setLoading] = useState(false);
	const [submitting, setSubmitting] = useState(false);

	const [formData, setFormData] = useState({
		payment_type: "room_payment",
		payment_method: "",
		amount: initialAmount,
		account_id: "",
		notes: "",
		currency: initialCurrency as any,
		reference_number: "",
	});

	const fetchLocation = useCallback(
		async (locationId: string) => {
			if (!tenant?.id) return;

			try {
				const { data } = await supabase
					.from("locations")
					.select("id, name, phone, email")
					.eq("id", locationId)
					.eq("tenant_id", tenant.id)
					.single();

				setLocation(data);
			} catch (error) {
				console.error("Failed to fetch location:", error);
			}
		},
		[tenant?.id],
	);

	const fetchReservationAndAccounts = useCallback(async () => {
		if (!tenant?.id) {
			toast({
				title: "Error",
				description: "Tenant information not available",
				variant: "destructive",
			});
			return;
		}

		setLoading(true);
		try {
			const [reservationRes, accountsRes, incomeRes] = await Promise.all([
				supabase
					.from("reservations")
					.select(`
            *,
            locations (*),
            rooms (*)
          `)
					.eq("id", reservationId)
					.eq("tenant_id", tenant.id)
					.single(),
				supabase
					.from("accounts")
					.select("*")
					.eq("tenant_id", tenant.id)
					.order("name"),
				supabase
					.from("income")
					.select("*, income_types(type_name), accounts(name)")
					.eq("booking_id", reservationId)
					.eq("tenant_id", tenant.id)
					.order("created_at", { ascending: false }),
			]);

			if (reservationRes.error) throw reservationRes.error;
			if (accountsRes.error) throw accountsRes.error;
			if (incomeRes.error) throw incomeRes.error;

			setReservation(reservationRes.data);
			setAccounts(accountsRes.data || []);
			setIncomeRecords(incomeRes.data || []);

			// Calculate total pending expenses
			const pendingExpenses = (incomeRes.data || [])
				.filter((inc: any) => inc.payment_method === "pending")
				.reduce((sum: number, inc: any) => sum + Number(inc.amount), 0);

			// Calculate total amount: reservation balance + pending expenses
			const totalAmount =
				(reservationRes.data?.balance_amount || 0) + pendingExpenses;

			// Fetch location data for SMS
			if (reservationRes.data?.location_id) {
				fetchLocation(reservationRes.data.location_id);
			}

			// Convert amount if currencies don't match
			if (
				reservationRes.data &&
				reservationRes.data.currency !== initialCurrency
			) {
				try {
					const convertedAmount = await convertCurrency(
						totalAmount,
						reservationRes.data.currency as any,
						initialCurrency as any,
					);
					setFormData((prev) => ({ ...prev, amount: convertedAmount }));
				} catch (error) {
					console.error("Currency conversion failed:", error);
					setFormData((prev) => ({ ...prev, amount: totalAmount }));
				}
			} else {
				setFormData((prev) => ({ ...prev, amount: totalAmount }));
			}
		} catch (error) {
			console.error("Error fetching data:", error);
			toast({
				title: "Error",
				description: "Failed to load payment details",
				variant: "destructive",
			});
		} finally {
			setLoading(false);
		}
	}, [tenant?.id, reservationId, initialCurrency, toast, fetchLocation]);

	useEffect(() => {
		if (reservationId && tenant?.id) {
			fetchReservationAndAccounts();
		}
	}, [reservationId, tenant?.id, fetchReservationAndAccounts]);

	useEffect(() => {
		// Filter accounts based on selected currency
		setFormData((prev) => ({ ...prev, account_id: "" }));
	}, []);

	const handleCurrencyChange = async (newCurrency: string) => {
		if (!reservation) return;

		try {
			let newAmount = formData.amount;
			if (formData.currency !== newCurrency) {
				newAmount = await convertCurrency(
					formData.amount,
					formData.currency as any,
					newCurrency as any,
				);
			}

			setFormData((prev) => ({
				...prev,
				currency: newCurrency as any,
				amount: newAmount,
				account_id: "", // Reset account selection
			}));
		} catch (error) {
			console.error("Currency conversion failed:", error);
			toast({
				title: "Currency Conversion Failed",
				description: "Using original amount. Please adjust manually if needed.",
				variant: "destructive",
			});
			setFormData((prev) => ({
				...prev,
				currency: newCurrency as any,
				account_id: "",
			}));
		}
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!reservation) return;

		setSubmitting(true);
		try {
			// Generate payment number
			const currentYear = new Date().getFullYear();
			const { data: existingPayments } = await supabase
				.from("payments")
				.select("id")
				.gte("created_at", `${currentYear}-01-01`)
				.lt("created_at", `${currentYear + 1}-01-01`);

			const paymentNumber = `PAY${currentYear}${String((existingPayments?.length || 0) + 1).padStart(4, "0")}`;

			const paymentData = {
				reservation_id: reservationId,
				payment_type: formData.payment_type,
				payment_method: formData.payment_method,
				amount: formData.amount,
				account_id: formData.account_id,
				notes: formData.notes || null,
				reference_number: formData.reference_number || null,
				payment_number: paymentNumber,
				currency: formData.currency,
				created_by: user?.id,
			};

			const { error: paymentError } = await supabase
				.from("payments")
				.insert(paymentData);

			if (paymentError) throw paymentError;

			// Create income record
			const incomeData = {
				location_id: reservation.location_id,
				account_id: formData.account_id,
				type: "booking" as const,
				amount: formData.amount,
				payment_method: formData.payment_method,
				booking_source: reservation.booking_source || "direct",
				check_in_date: reservation.check_in_date,
				check_out_date: reservation.check_out_date,
				note: formData.notes || null,
				currency: formData.currency,
				booking_id: null, // Remove booking_id since we're dealing with reservations
				tenant_id: tenant?.id,
			};

			const { error: incomeError } = await supabase
				.from("income")
				.insert(incomeData);

			if (incomeError) throw incomeError;

			// Update reservation amounts (convert to reservation currency if needed)
			let paymentAmountInReservationCurrency = formData.amount;
			if (formData.currency !== reservation.currency) {
				paymentAmountInReservationCurrency = await convertCurrency(
					formData.amount,
					formData.currency as any,
					reservation.currency as any,
				);
			}

			const newPaidAmount =
				(reservation.paid_amount || 0) + paymentAmountInReservationCurrency;
			const newBalanceAmount = reservation.total_amount - newPaidAmount;

			// Check if there are any pending expenses
			const pendingExpenses = incomeRecords
				.filter((inc) => inc.payment_method === "pending")
				.reduce((sum, inc) => sum + Number(inc.amount), 0);

			// Only mark as confirmed if both room balance is paid AND no pending expenses exist
			const shouldMarkConfirmed = newBalanceAmount <= 0 && pendingExpenses <= 0;

			await supabase
				.from("reservations")
				.update({
					paid_amount: newPaidAmount,
					balance_amount: newBalanceAmount,
					status: shouldMarkConfirmed ? "confirmed" : reservation.status,
				})
				.eq("id", reservationId)
				.eq("tenant_id", tenant?.id);

			// Update pending income records to reflect the payment
			// This ensures that pending services/charges are marked as paid
			const { error: updateIncomeError } = await supabase
				.from("income")
				.update({
					payment_method: formData.payment_method,
				})
				.eq("booking_id", reservationId)
				.eq("payment_method", "pending")
				.eq("tenant_id", tenant?.id);

			if (updateIncomeError) {
				console.error(
					"Failed to update pending income records:",
					updateIncomeError,
				);
				// Don't throw error here as payment was successful, just log the issue
			}

			// Send SMS notification for payment
			try {
				const selectedAccount = accounts.find(
					(acc) => acc.id === formData.account_id,
				);

				await supabase.functions.invoke("send-sms-notification", {
					body: {
						type: "payment",
						paymentNumber: paymentNumber,
						amount: formData.amount,
						currency: formData.currency,
						paymentMethod: formData.payment_method,
						guestName: reservation.guest_name,
						reservationNumber: reservation.reservation_number,
						account: selectedAccount?.name || "N/A",
						locationId: reservation.location_id, // Added for location admin SMS
						locationPhone: location?.phone, // Primary SMS recipient
						date: format(new Date(), "MMM dd, yyyy"),
						note: formData.notes,
					},
				});
			} catch (smsError) {
				console.error("SMS notification failed:", smsError);
			}

			toast({
				title: "Success",
				description: "Payment processed successfully",
			});

			navigate("/reservations");
		} catch (error: any) {
			console.error("Error processing payment:", error);
			toast({
				title: "Error",
				description: error.message || "Failed to process payment",
				variant: "destructive",
			});
		} finally {
			setSubmitting(false);
		}
	};

	// Filter accounts by currency
	const compatibleAccounts = accounts.filter(
		(account) => account.currency === formData.currency,
	);

	if (loading) {
		return null;
	}

	if (!reservation) {
		return (
			<div className="max-w-4xl mx-auto p-4 text-center">
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
		<div className="w-full mx-auto p-4 space-y-6 pb-20 sm:pb-12">
			{/* Header */}
			<div className="flex items-center gap-4">
				<div className="flex-1">
					<h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-foreground">
						New Payment
					</h1>
					<p className="text-muted-foreground">
						Reservation #{reservation.reservation_number} -{" "}
						{reservation.guest_name}
					</p>
				</div>
				<Button type="submit" form="payment-form" disabled={submitting}>
					<Save className="size-4 mr-2" />
					{submitting ? "Processing..." : "Save Payment"}
				</Button>
			</div>

			{/* Reservation Summary */}
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
					{incomeRecords.filter((inc) => inc.payment_method === "pending")
						.length > 0 && (
						<>
							<div className="flex justify-between border-t pt-2">
								<span className="text-muted-foreground">Pending Expenses:</span>
								<span className="font-semibold text-yellow-600">
									{reservation.currency}{" "}
									{incomeRecords
										.filter((inc) => inc.payment_method === "pending")
										.reduce((sum, inc) => sum + Number(inc.amount), 0)
										.toLocaleString()}
								</span>
							</div>
							<div className="flex justify-between border-t pt-2">
								<span className="text-muted-foreground font-semibold">
									Total to Pay (Room + Expenses):
								</span>
								<span className="font-bold text-blue-600 text-lg">
									{reservation.currency}{" "}
									{(
										(reservation.balance_amount || 0) +
										incomeRecords
											.filter((inc) => inc.payment_method === "pending")
											.reduce((sum, inc) => sum + Number(inc.amount), 0)
									).toLocaleString()}
								</span>
							</div>
						</>
					)}
				</CardContent>
			</Card>

			{/* Traveler Expenses Breakdown */}
			{incomeRecords.length > 0 && (
				<Card>
					<CardHeader>
						<CardTitle>Traveler Expenses</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="space-y-2">
							<div className="flex justify-between font-semibold border-b pb-2">
								<span>Expense Type</span>
								<span>Amount</span>
								<span>Status</span>
							</div>
							{incomeRecords.map((income) => (
								<div
									key={income.id}
									className="flex justify-between items-center py-2 border-b"
								>
									<div className="flex-1">
										<p className="font-medium">
											{income.income_types?.type_name || income.type}
										</p>
										{income.note && (
											<p className="text-sm text-muted-foreground">
												{income.note}
											</p>
										)}
										<p className="text-xs text-muted-foreground">
											{format(new Date(income.created_at), "MMM dd, yyyy")}
										</p>
									</div>
									<div className="flex-1 text-right">
										<p className="font-semibold">
											{income.currency} {income.amount.toLocaleString()}
										</p>
										{income.accounts && (
											<p className="text-xs text-muted-foreground">
												via {income.accounts.name}
											</p>
										)}
									</div>
									<div className="flex-1 text-right">
										{income.payment_method === "pending" ? (
											<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
												Pending
											</span>
										) : (
											<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
												Paid
											</span>
										)}
									</div>
								</div>
							))}
						</div>
						<div className="pt-4 border-t space-y-2">
							<div className="flex justify-between text-sm">
								<span className="text-muted-foreground">Total Expenses:</span>
								<span className="font-semibold">
									{reservation.currency}{" "}
									{incomeRecords
										.reduce((sum, inc) => sum + Number(inc.amount), 0)
										.toLocaleString()}
								</span>
							</div>
							<div className="flex justify-between text-sm">
								<span className="text-muted-foreground">Paid Expenses:</span>
								<span className="font-semibold text-green-600">
									{reservation.currency}{" "}
									{incomeRecords
										.filter((inc) => inc.payment_method !== "pending")
										.reduce((sum, inc) => sum + Number(inc.amount), 0)
										.toLocaleString()}
								</span>
							</div>
							<div className="flex justify-between text-sm">
								<span className="text-muted-foreground">Pending Expenses:</span>
								<span className="font-semibold text-yellow-600">
									{reservation.currency}{" "}
									{incomeRecords
										.filter((inc) => inc.payment_method === "pending")
										.reduce((sum, inc) => sum + Number(inc.amount), 0)
										.toLocaleString()}
								</span>
							</div>
						</div>
					</CardContent>
				</Card>
			)}

			{/* Payment Form */}
			<form id="payment-form" onSubmit={handleSubmit}>
				<Card>
					<CardHeader>
						<CardTitle>Payment Details</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="grid grid-cols-2 gap-4">
							<div>
								<Label>Payment Type</Label>
								<Select
									value={formData.payment_type}
									onValueChange={(value) =>
										setFormData((prev) => ({ ...prev, payment_type: value }))
									}
								>
									<SelectTrigger>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="room_payment">Room Payment</SelectItem>
										<SelectItem value="advance_payment">
											Advance Payment
										</SelectItem>
										<SelectItem value="balance_payment">
											Balance Payment
										</SelectItem>
										<SelectItem value="refund">Refund</SelectItem>
									</SelectContent>
								</Select>
							</div>

							<div>
								<Label>Payment Method *</Label>
								<Select
									value={formData.payment_method}
									onValueChange={(value) =>
										setFormData((prev) => ({ ...prev, payment_method: value }))
									}
								>
									<SelectTrigger>
										<SelectValue placeholder="Select method" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="cash">Cash</SelectItem>
										<SelectItem value="bank_transfer">Bank Transfer</SelectItem>
										<SelectItem value="card">Credit/Debit Card</SelectItem>
										<SelectItem value="cheque">Cheque</SelectItem>
										<SelectItem value="online">Online Payment</SelectItem>
									</SelectContent>
								</Select>
							</div>
						</div>

						<div className="grid grid-cols-2 gap-4">
							<div>
								<CurrencySelector
									currency={formData.currency}
									onCurrencyChange={handleCurrencyChange}
									label="Payment Currency"
								/>
							</div>

							<div>
								<Label htmlFor="amount">Amount *</Label>
								<Input
									id="amount"
									type="number"
									step="0.01"
									min="0"
									value={formData.amount}
									onChange={(e) =>
										setFormData((prev) => ({
											...prev,
											amount: parseFloat(e.target.value) || 0,
										}))
									}
									required
								/>
							</div>
						</div>

						<div>
							<Label>Account *</Label>
							<Select
								value={formData.account_id}
								onValueChange={(value) =>
									setFormData((prev) => ({ ...prev, account_id: value }))
								}
							>
								<SelectTrigger>
									<SelectValue placeholder="Select account" />
								</SelectTrigger>
								<SelectContent>
									{compatibleAccounts.map((account) => (
										<SelectItem key={account.id} value={account.id}>
											{account.name} ({account.currency})
										</SelectItem>
									))}
								</SelectContent>
							</Select>
							{compatibleAccounts.length === 0 && (
								<p className="text-sm text-red-600 mt-1">
									No {formData.currency} accounts available. Please create a{" "}
									{formData.currency} account first.
								</p>
							)}
						</div>

						<div>
							<Label htmlFor="reference_number">Reference Number</Label>
							<Input
								id="reference_number"
								value={formData.reference_number}
								onChange={(e) =>
									setFormData((prev) => ({
										...prev,
										reference_number: e.target.value,
									}))
								}
								placeholder="Optional reference number"
							/>
						</div>

						<div>
							<Label htmlFor="notes">Notes</Label>
							<Textarea
								id="notes"
								value={formData.notes}
								onChange={(e) =>
									setFormData((prev) => ({ ...prev, notes: e.target.value }))
								}
								placeholder="Additional notes..."
							/>
						</div>
					</CardContent>
				</Card>
			</form>
		</div>
	);
}
