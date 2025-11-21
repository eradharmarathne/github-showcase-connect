import { format } from "date-fns";
import { Save } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import {
	PaymentDetailsForm,
	ReservationSummaryCard,
	TravelerExpensesCard,
} from "@/components/payment";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/auth-context";
import { useTenant } from "@/hooks/use-tenant";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import type { PaymentAccount, PaymentFormData } from "@/types/payment";
import { convertCurrency } from "@/utils/currency";

type Reservation = Tables<"reservations"> & {
	locations: Tables<"locations">;
	rooms: Tables<"rooms">;
};

export default function PaymentForm() {
	const navigate = useNavigate();
	const { toast } = useToast();
	const [searchParams] = useSearchParams();
	const { user } = useAuth();
	const { tenant } = useTenant();

	const reservationId = searchParams.get("reservation");
	const initialAmount = parseFloat(searchParams.get("amount") || "0");
	const initialCurrency = searchParams.get("currency") || "LKR";

	const [reservation, setReservation] = useState<Reservation | null>(null);
	const [accounts, setAccounts] = useState<PaymentAccount[]>([]);
	const [location, setLocation] = useState<any>(null);
	const [incomeRecords, setIncomeRecords] = useState<any[]>([]);
	const [loading, setLoading] = useState(false);
	const [submitting, setSubmitting] = useState(false);

	const [formData, setFormData] = useState<PaymentFormData>({
		payment_type: "room_payment",
		payment_method: "cash",
		amount: initialAmount,
		account_id: "",
		notes: "",
		currency: initialCurrency,
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
					.select("id, name, currency")
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
						reservationRes.data.currency,
						initialCurrency,
						tenant.id,
						reservationRes.data.location_id,
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
		// Set default account when accounts are loaded and currency is set
		if (
			accounts.length > 0 &&
			formData.currency &&
			(!formData.account_id || formData.account_id === "")
		) {
			const compatibleAccountsForCurrency = accounts.filter(
				(account) => account.currency === formData.currency,
			);
			if (compatibleAccountsForCurrency.length > 0) {
				setFormData((prev) => ({
					...prev,
					account_id: compatibleAccountsForCurrency[0].id,
				}));
			}
		}
	}, [accounts, formData.currency, formData.account_id]);

	const handleFormChange = (
		field: keyof PaymentFormData,
		value: string | number,
	) => {
		setFormData((prev) => ({ ...prev, [field]: value }));
	};

	const handleCurrencyChange = async (newCurrency: string) => {
		if (!reservation) return;

		try {
			let newAmount = formData.amount;
			if (formData.currency !== newCurrency) {
				newAmount = await convertCurrency(
					formData.amount,
					formData.currency,
					newCurrency,
					tenant?.id!,
					reservation.location_id,
				);
			}

			// Find compatible accounts for the new currency
			const compatibleAccountsForCurrency = accounts.filter(
				(account) => account.currency === newCurrency,
			);

			setFormData((prev) => ({
				...prev,
				currency: newCurrency,
				amount: newAmount,
				account_id:
					compatibleAccountsForCurrency.length > 0
						? compatibleAccountsForCurrency[0].id
						: "", // Reset account selection
			}));
		} catch (error) {
			console.error("Currency conversion failed:", error);
			toast({
				title: "Currency Conversion Failed",
				description: "Using original amount. Please adjust manually if needed.",
				variant: "destructive",
			});

			// Find compatible accounts for the new currency
			const compatibleAccountsForCurrency = accounts.filter(
				(account) => account.currency === newCurrency,
			);

			setFormData((prev) => ({
				...prev,
				currency: newCurrency,
				account_id:
					compatibleAccountsForCurrency.length > 0
						? compatibleAccountsForCurrency[0].id
						: "",
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
				location_id: reservation.location_id,
				tenant_id: tenant?.id,
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
					formData.currency,
					reservation.currency,
					tenant?.id!,
					reservation.location_id,
				);
			}

			const newPaidAmount =
				(reservation.paid_amount || 0) + paymentAmountInReservationCurrency;
			const newBalanceAmount = reservation.total_amount - newPaidAmount;

			// Check if there are any pending expenses
			const pendingExpenses = incomeRecords
				.filter((inc) => inc.payment_method === "pending")
				.reduce((sum, inc) => sum + Number(inc.amount), 0);

			// Enhanced status logic based on payment completion and payment type
			const isPaymentComplete = newBalanceAmount <= 0 && pendingExpenses <= 0;
			const isCompletionPayment =
				formData.payment_type === "Payment Type" ||
				formData.payment_type === "full_payment";

			// Determine new status based on payment completion and type
			let newStatus = reservation.status;
			if (isPaymentComplete) {
				if (isCompletionPayment) {
					// Mark as checked_out (completed) when payment is done AND payment type is Payment Type or full_payment
					newStatus = "checked_out";
				} else if (reservation.status === "tentative") {
					// Mark as confirmed for other payment types when balance is paid
					newStatus = "confirmed";
				}
			}

			await supabase
				.from("reservations")
				.update({
					paid_amount: newPaidAmount,
					balance_amount: newBalanceAmount,
					status: newStatus,
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
		<div className="w-full mx-auto px-4 sm:px-6 md:px-8 space-y-6 pb-20 sm:pb-8">
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
			<ReservationSummaryCard
				reservation={reservation}
				incomeRecords={incomeRecords}
			/>

			{/* Traveler Expenses Breakdown */}
			{incomeRecords.length > 0 && (
				<TravelerExpensesCard
					reservation={reservation}
					incomeRecords={incomeRecords}
				/>
			)}

			{/* Payment Form */}
			<form id="payment-form" onSubmit={handleSubmit}>
				<PaymentDetailsForm
					formData={formData}
					accounts={accounts}
					compatibleAccounts={compatibleAccounts}
					onFormChange={handleFormChange}
					onCurrencyChange={handleCurrencyChange}
				/>
			</form>
		</div>
	);
}
