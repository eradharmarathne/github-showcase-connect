import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { OTPVerification } from "@/components/auth/otp-verification";
import {
	CompactReservationDialog,
	NewReservationDialog,
	ViewReservationDialog,
} from "@/components/modals";
import { ReservationEditDialog } from "@/components/modals/reservation-edit-dialog";
import { AddIncomeDialog } from "@/components/reservation";
import { PaymentDialog } from "@/components/reservation/payment-dialog";
import { PaymentsTable } from "@/components/reservation/payments-table";
import { ReservationsDesktopTable } from "@/components/reservation/reservations-desktop-table";
import { ReservationsFilters } from "@/components/reservation/reservations-filters";
import { ReservationsHeader } from "@/components/reservation/reservations-header";
import { ReservationsMobileCards } from "@/components/reservation/reservations-mobile-cards";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { useLocationContext } from "@/context/location-context";
import { useAccountData } from "@/hooks/use-account-data";
import { useReservationFinancials } from "@/hooks/use-reservation-financials";
import {
	useIncomeData,
	useReservationsData,
} from "@/hooks/use-reservations-data";
import { useTenant } from "@/hooks/use-tenant";
import type { Database } from "@/integrations/supabase/types";

type Currency = Database["public"]["Enums"]["currency_type"];

export default function Reservations() {
	const { t } = useTranslation();
	const [accounts, setAccounts] = useState([]);
	const { locations } = useLocationContext();
	const { refetch } = useReservationsData();
	const { refetch: refetchFinancials } = useReservationFinancials();
	const { tenant } = useTenant();
	const navigate = useNavigate();

	// State management
	const [selectedCurrency, setSelectedCurrency] = useState<Currency>("USD");

	// Dialog states
	const [activeTab, setActiveTab] = useState("reservations");
	const [searchQuery, setSearchQuery] = useState("");
	const [statusFilter, setStatusFilter] = useState("all");
	const [isNewReservationDialogOpen, setIsNewReservationDialogOpen] =
		useState(false);
	const [isCompactReservationDialogOpen, setIsCompactReservationDialogOpen] =
		useState(false);
	const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
	const [viewingReservationId, setViewingReservationId] = useState<
		string | null
	>(null);
	const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
	const [editingReservation, setEditingReservation] = useState<any>(null);
	const [showOTPVerification, setShowOTPVerification] = useState(false);
	const [isIncomeDialogOpen, setIsIncomeDialogOpen] = useState(false);
	const [selectedReservation, setSelectedReservation] = useState<any>(null);
	const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
	const [paymentData, setPaymentData] = useState<{
		reservationId: string;
		amount: number;
		currency: string;
	} | null>(null);
	const [otpData, setOtpData] = useState<{
		phoneNumber: string;
		reservationId: string;
		amount: number;
		currency: string;
	} | null>(null);
	const [editOtpData, setEditOtpData] = useState<{
		phoneNumber: string;
		reservation: any;
	} | null>(null);
	const [showEditOTPVerification, setShowEditOTPVerification] = useState(false);
	const { fetchAccountDetails } = useAccountData(selectedCurrency);

	useEffect(() => {
		async function loadAccountDetails() {
			const result = await fetchAccountDetails();
			console.log("Fetched account details:", result);
			if (result) {
				setAccounts(result.accounts);
			}
		}

		loadAccountDetails();
	}, [fetchAccountDetails]);

	// Event handlers
	const handleViewReservation = (id: string) => {
		setViewingReservationId(id);
		setIsViewDialogOpen(true);
	};

	const handleEditReservation = (reservation: any) => {
		// Check if guest has phone number for OTP verification
		if (reservation.guest_phone) {
			setEditOtpData({
				phoneNumber: reservation.guest_phone,
				reservation: reservation,
			});
			setShowEditOTPVerification(true);
		} else {
			// If no phone number, proceed directly to edit
			setEditingReservation(reservation);
			setIsEditDialogOpen(true);
		}
	};

	const handlePayment = (
		reservationId: string,
		amount: number,
		currency: string,
	) => {
		// Open payment dialog instead of navigating
		setPaymentData({ reservationId, amount, currency });
		setIsPaymentDialogOpen(true);
	};

	const handleOTPVerified = () => {
		if (otpData) {
			navigate(
				`/payment-form?reservationId=${otpData.reservationId}&amount=${otpData.amount}&currency=${otpData.currency}`,
			);
		}
		setShowOTPVerification(false);
		setOtpData(null);
	};

	const handleEditOTPVerified = () => {
		if (editOtpData) {
			// OTP verified, proceed to edit dialog
			setEditingReservation(editOtpData.reservation);
			setIsEditDialogOpen(true);
		}
		setShowEditOTPVerification(false);
		setEditOtpData(null);
	};

	const handleAddIncome = (reservation: any) => {
		setSelectedReservation(reservation);
		setIsIncomeDialogOpen(true);
	};

	const handlePrint = (reservation: any) => {
		// Transform reservation data with tenant and location information
		const printableData = {
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

		// Create a professional receipt-style printable content
		const printContent = `
			<div style="font-family: 'Courier New', monospace; max-width: 800px; margin: 0 auto; padding: 20px; line-height: 1.4;">
				<!-- Header -->
				<div style="text-align: center; border-bottom: 2px solid #000; padding-bottom: 15px; margin-bottom: 20px;">
					<h1 style="margin: 0; font-size: 24px; font-weight: bold;">${printableData.hotel_name || "HOTEL RESERVATION"}</h1>
					${printableData.hotel_address ? `<p style="margin: 5px 0; font-size: 12px;">${printableData.hotel_address}</p>` : ""}
					${printableData.hotel_phone ? `<p style="margin: 2px 0; font-size: 12px;">Tel: ${printableData.hotel_phone}</p>` : ""}
					${printableData.hotel_email ? `<p style="margin: 2px 0; font-size: 12px;">Email: ${printableData.hotel_email}</p>` : ""}
				</div>

				<!-- Reservation Info -->
				<div style="text-align: center; margin-bottom: 20px;">
					<h2 style="margin: 0; font-size: 18px; font-weight: bold;">RESERVATION RECEIPT</h2>
					<p style="margin: 10px 0; font-size: 14px; font-weight: bold;">Confirmation #: ${reservation.reservation_number}</p>
					<p style="margin: 5px 0; font-size: 12px;">Date: ${new Date().toLocaleDateString()}</p>
				</div>

				<!-- Guest Information Table -->
				<table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 12px;">
					<tr style="border-bottom: 1px solid #000;">
						<td colspan="2" style="padding: 8px 0; font-weight: bold; text-align: center; background-color: #f0f0f0;">GUEST INFORMATION</td>
					</tr>
					<tr>
						<td style="padding: 5px 0; width: 30%; font-weight: bold;">Guest Name:</td>
						<td style="padding: 5px 0;">${reservation.guest_name}</td>
					</tr>
					<tr style="background-color: #f9f9f9;">
						<td style="padding: 5px 0; font-weight: bold;">Email:</td>
						<td style="padding: 5px 0;">${reservation.guest_email || "N/A"}</td>
					</tr>
					<tr>
						<td style="padding: 5px 0; font-weight: bold;">Phone:</td>
						<td style="padding: 5px 0;">${reservation.guest_phone || "N/A"}</td>
					</tr>
					<tr style="background-color: #f9f9f9;">
						<td style="padding: 5px 0; font-weight: bold;">Nationality:</td>
						<td style="padding: 5px 0;">${reservation.guest_nationality || "N/A"}</td>
					</tr>
					<tr>
						<td style="padding: 5px 0; font-weight: bold;">Guests:</td>
						<td style="padding: 5px 0;">${reservation.adults} Adults${reservation.children > 0 ? `, ${reservation.children} Children` : ""}</td>
					</tr>
				</table>

				<!-- Booking Details Table -->
				<table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 12px;">
					<tr style="border-bottom: 1px solid #000;">
						<td colspan="2" style="padding: 8px 0; font-weight: bold; text-align: center; background-color: #f0f0f0;">BOOKING DETAILS</td>
					</tr>
					<tr>
						<td style="padding: 5px 0; width: 30%; font-weight: bold;">Room:</td>
						<td style="padding: 5px 0;">${printableData.room_number} - ${printableData.room_type}</td>
					</tr>
					<tr style="background-color: #f9f9f9;">
						<td style="padding: 5px 0; font-weight: bold;">Check-in:</td>
						<td style="padding: 5px 0;">${new Date(reservation.check_in_date).toLocaleDateString()}</td>
					</tr>
					<tr>
						<td style="padding: 5px 0; font-weight: bold;">Check-out:</td>
						<td style="padding: 5px 0;">${new Date(reservation.check_out_date).toLocaleDateString()}</td>
					</tr>
					<tr style="background-color: #f9f9f9;">
						<td style="padding: 5px 0; font-weight: bold;">Duration:</td>
						<td style="padding: 5px 0;">${reservation.nights} Night${reservation.nights !== 1 ? "s" : ""}</td>
					</tr>
					<tr>
						<td style="padding: 5px 0; font-weight: bold;">Status:</td>
						<td style="padding: 5px 0; text-transform: uppercase;">${reservation.status}</td>
					</tr>
				</table>

				<!-- Financial Summary Table -->
				<table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 12px;">
					<tr style="border-bottom: 2px solid #000;">
						<td colspan="3" style="padding: 8px 0; font-weight: bold; text-align: center; background-color: #f0f0f0;">FINANCIAL SUMMARY</td>
					</tr>
					<tr style="border-bottom: 1px solid #ccc;">
						<td style="padding: 5px 0; width: 50%; font-weight: bold;">Description</td>
						<td style="padding: 5px 0; width: 20%; text-align: center; font-weight: bold;">Rate</td>
						<td style="padding: 5px 0; width: 30%; text-align: right; font-weight: bold;">Amount</td>
					</tr>
					<tr>
						<td style="padding: 8px 0;">Room Charges (${reservation.nights} night${reservation.nights !== 1 ? "s" : ""})</td>
						<td style="padding: 8px 0; text-align: center;">${reservation.selectedCurrency || reservation.currency} ${reservation.room_rate}</td>
						<td style="padding: 8px 0; text-align: right; font-weight: bold;">${reservation.selectedCurrency || reservation.currency} ${reservation.convertedAmounts?.roomAmount?.toFixed(2) || reservation.total_amount || reservation.room_rate * reservation.nights}</td>
					</tr>
					${
						reservation.convertedAmounts?.expensesAmount &&
						reservation.convertedAmounts.expensesAmount > 0
							? `
					<tr style="background-color: #f9f9f9;">
						<td style="padding: 8px 0;">Additional Expenses & Services</td>
						<td style="padding: 8px 0; text-align: center;">-</td>
						<td style="padding: 8px 0; text-align: right; font-weight: bold;">${reservation.selectedCurrency || reservation.currency} ${reservation.convertedAmounts.expensesAmount.toFixed(2)}</td>
					</tr>
					`
							: ""
					}
					<tr style="border-top: 1px solid #ccc;">
						<td style="padding: 8px 0; font-weight: bold;">SUBTOTAL</td>
						<td style="padding: 8px 0;"></td>
						<td style="padding: 8px 0; text-align: right; font-weight: bold; font-size: 14px;">${reservation.selectedCurrency || reservation.currency} ${((reservation.convertedAmounts?.roomAmount || reservation.total_amount || reservation.room_rate * reservation.nights) + (reservation.convertedAmounts?.expensesAmount || 0)).toFixed(2)}</td>
					</tr>
					<tr style="background-color: #f9f9f9;">
						<td style="padding: 8px 0; font-weight: bold;">Amount Paid</td>
						<td style="padding: 8px 0;"></td>
						<td style="padding: 8px 0; text-align: right; color: green; font-weight: bold;">-${reservation.selectedCurrency || reservation.currency} ${reservation.convertedAmounts?.paidAmount?.toFixed(2) || reservation.paid_amount || 0}</td>
					</tr>
					<tr style="border-top: 2px solid #000;">
						<td style="padding: 8px 0; font-weight: bold; font-size: 14px;">BALANCE DUE</td>
						<td style="padding: 8px 0;"></td>
						<td style="padding: 8px 0; text-align: right; font-weight: bold; font-size: 14px; color: ${reservation.convertedAmounts?.balanceAmount ? (reservation.convertedAmounts.balanceAmount > 0 ? "red" : "green") : (reservation.total_amount || reservation.room_rate * reservation.nights) + (reservation.expenses_usd || 0) - (reservation.paid_amount || 0) > 0 ? "red" : "green"};">${reservation.selectedCurrency || reservation.currency} ${reservation.convertedAmounts?.balanceAmount?.toFixed(2) || ((reservation.total_amount || reservation.room_rate * reservation.nights) + (reservation.expenses_usd || 0) - (reservation.paid_amount || 0)).toFixed(2)}</td>
					</tr>
				</table>

				${
					reservation.special_requests
						? `
				<!-- Special Requests -->
				<table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 12px;">
					<tr style="border-bottom: 1px solid #000;">
						<td style="padding: 8px 0; font-weight: bold; text-align: center; background-color: #f0f0f0;">SPECIAL REQUESTS</td>
					</tr>
					<tr>
						<td style="padding: 10px 0; line-height: 1.5;">${reservation.special_requests}</td>
					</tr>
				</table>
				`
						: ""
				}

				<!-- Footer -->
				<div style="margin-top: 30px; padding-top: 15px; border-top: 1px solid #ccc; text-align: center; font-size: 10px;">
					<p style="margin: 5px 0;">Thank you for choosing ${printableData.hotel_name || "our hotel"}!</p>
					<p style="margin: 5px 0;">For any inquiries, please contact us at ${printableData.hotel_phone || "hotel reception"}.</p>
					<p style="margin: 15px 0 0 0; font-style: italic;">This is an official reservation confirmation.</p>
				</div>

				<!-- Print Timestamp -->
				<div style="margin-top: 20px; text-align: center; font-size: 8px; color: #666;">
					Printed on: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}
				</div>
			</div>
		`;

		// Create a hidden iframe for printing
		const iframe = document.createElement("iframe");
		iframe.style.display = "none";
		document.body.appendChild(iframe);

		const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
		if (iframeDoc) {
			iframeDoc.open();
			iframeDoc.write(`
				<!DOCTYPE html>
				<html>
				<head>
					<title>Reservation Receipt - ${reservation.reservation_number}</title>
					<style>
						@page {
							size: A4;
							margin: 0.5cm;
						}
						@media print {
							body { 
								margin: 0; 
								padding: 0; 
								-webkit-print-color-adjust: exact;
								color-adjust: exact;
							}
							table { 
								page-break-inside: avoid; 
							}
						}
						body {
							font-family: 'Courier New', monospace;
							line-height: 1.3;
						}
						table {
							border-collapse: collapse;
						}
					</style>
				</head>
				<body>
					${printContent}
				</body>
				</html>
			`);
			iframeDoc.close();

			// Trigger print dialog directly
			iframe.contentWindow?.print();

			// Clean up the iframe after printing
			setTimeout(() => {
				document.body.removeChild(iframe);
			}, 1000);
		}
	};

	const handleIncomeSuccess = () => {
		refetch(); // Refetch mobile cards data
		refetchFinancials(); // Refetch desktop table data
		setIsIncomeDialogOpen(false);
		setSelectedReservation(null);
	};

	const handleCloseIncomeDialog = () => {
		setIsIncomeDialogOpen(false);
		setSelectedReservation(null);
	};

	const handlePaymentSuccess = () => {
		refetch(); // Refetch mobile cards data
		refetchFinancials(); // Refetch desktop table data
		setIsPaymentDialogOpen(false);
		setPaymentData(null);
	};

	const handleClosePaymentDialog = () => {
		setIsPaymentDialogOpen(false);
		setPaymentData(null);
	};

	const handleDataUpdate = () => {
		refetch(); // Refetch mobile cards data
		refetchFinancials(); // Refetch desktop table data
	};

	return (
		<div className="max-w-full w-full pb-20 sm:pb-0">
			<Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
				<ReservationsHeader activeTab={activeTab} onTabChange={setActiveTab} />

				<div className="container mx-auto px-4 sm:px-6 md:px-8">
					<ReservationsFilters
						locations={locations}
						selectedLocation=""
						searchQuery={searchQuery}
						statusFilter={statusFilter}
						selectedCurrency={selectedCurrency}
						onLocationChange={() => {
							// Location switching handled by LocationContext
						}}
						onSearchChange={setSearchQuery}
						onStatusFilterChange={setStatusFilter}
						onCurrencyChange={setSelectedCurrency}
						onNewReservation={() => setIsNewReservationDialogOpen(true)}
						onNewCompactReservation={() =>
							setIsCompactReservationDialogOpen(true)
						}
					/>

					<TabsContent value="reservations" className="space-y-4">
						<ReservationsMobileCards
							searchQuery={searchQuery}
							statusFilter={statusFilter}
							selectedCurrency={selectedCurrency}
							onViewReservation={handleViewReservation}
							onEditReservation={handleEditReservation}
							onPayment={handlePayment}
							onAddIncome={handleAddIncome}
						/>

						<ReservationsDesktopTable
							searchQuery={searchQuery}
							statusFilter={statusFilter}
							selectedCurrency={selectedCurrency}
							onViewReservation={handleViewReservation}
							onEditReservation={handleEditReservation}
							onPayment={handlePayment}
							onAddIncome={handleAddIncome}
							onPrint={handlePrint}
						/>
					</TabsContent>

					<TabsContent value="payments" className="space-y-4">
						<PaymentsTable />
					</TabsContent>
				</div>
			</Tabs>

			{/* Dialogs */}
			{showOTPVerification && otpData && (
				<Dialog
					open={showOTPVerification}
					onOpenChange={(open) => {
						if (!open) {
							setShowOTPVerification(false);
							setOtpData(null);
						}
					}}
				>
					<DialogContent>
						<OTPVerification
							phoneNumber={otpData.phoneNumber}
							onVerified={handleOTPVerified}
							triggerComponent={<div />}
						/>
					</DialogContent>
				</Dialog>
			)}

			{/* Edit OTP Verification Dialog */}
			{showEditOTPVerification && editOtpData && (
				<Dialog
					open={showEditOTPVerification}
					onOpenChange={(open) => {
						if (!open) {
							setShowEditOTPVerification(false);
							setEditOtpData(null);
						}
					}}
				>
					<DialogContent>
						<OTPVerification
							phoneNumber={editOtpData.phoneNumber}
							onVerified={handleEditOTPVerified}
							triggerComponent={<div />}
						/>
					</DialogContent>
				</Dialog>
			)}

			{editingReservation && (
				<ReservationEditDialog
					isOpen={isEditDialogOpen}
					reservation={editingReservation}
					onClose={() => {
						setIsEditDialogOpen(false);
						setEditingReservation(null);
					}}
					onUpdate={() => {
						handleDataUpdate();
						setIsEditDialogOpen(false);
						setEditingReservation(null);
					}}
				/>
			)}

			<NewReservationDialog
				isOpen={isNewReservationDialogOpen}
				onClose={() => setIsNewReservationDialogOpen(false)}
				onReservationCreated={() => {
					handleDataUpdate();
					setIsNewReservationDialogOpen(false);
				}}
			/>

			<CompactReservationDialog
				isOpen={isCompactReservationDialogOpen}
				onClose={() => setIsCompactReservationDialogOpen(false)}
				onReservationCreated={() => {
					handleDataUpdate();
					setIsCompactReservationDialogOpen(false);
				}}
			/>

			<ViewReservationDialog
				isOpen={isViewDialogOpen}
				onClose={() => {
					setIsViewDialogOpen(false);
					setViewingReservationId(null);
				}}
				reservationId={viewingReservationId || ""}
			/>

			<AddIncomeDialog
				isOpen={isIncomeDialogOpen}
				onClose={handleCloseIncomeDialog}
				selectedReservation={selectedReservation}
				accounts={accounts}
				onSuccess={handleIncomeSuccess}
			/>

			{paymentData && (
				<PaymentDialog
					isOpen={isPaymentDialogOpen}
					onClose={handleClosePaymentDialog}
					reservationId={paymentData.reservationId}
					initialAmount={paymentData.amount}
					initialCurrency={paymentData.currency}
					onSuccess={handlePaymentSuccess}
				/>
			)}
		</div>
	);
}
