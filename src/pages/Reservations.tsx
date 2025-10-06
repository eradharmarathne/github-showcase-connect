import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { NewReservationDialog } from "@/components/NewReservationDialog";
import { OTPVerification } from "@/components/OTPVerification";
import { ReservationEditDialog } from "@/components/ReservationEditDialog";
import { AddIncomeDialog } from "@/components/reservation/AddIncomeDialog";
import { PaymentDialog } from "@/components/reservation/PaymentDialog";
import { PaymentsTable } from "@/components/reservation/PaymentsTable";
import { ReservationsDesktopTable } from "@/components/reservation/ReservationsDesktopTable";
import { ReservationsFilters } from "@/components/reservation/ReservationsFilters";
import { ReservationsHeader } from "@/components/reservation/ReservationsHeader";
import { ReservationsMobileCards } from "@/components/reservation/ReservationsMobileCards";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { ViewReservationDialog } from "@/components/ViewReservationDialog";
import { useLocationContext } from "@/context/LocationContext";
import { useIncomeData } from "@/hooks/useIncomeData";
import { useReservationFinancials } from "@/hooks/useReservationFinancials";
import { useTenant } from "@/hooks/useTenant";
import { useReservationsData } from "@/hooks/useReservationsData";
import type { Database } from "@/integrations/supabase/types";

type Currency = Database["public"]["Enums"]["currency_type"];

export default function Reservations() {
	const { t } = useTranslation();
	const { locations } = useLocationContext();
	const { refetch } = useReservationsData();
	const { refetch: refetchFinancials } = useReservationFinancials();
	const { accounts } = useIncomeData();
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

	// Event handlers
	const handleViewReservation = (id: string) => {
		setViewingReservationId(id);
		setIsViewDialogOpen(true);
	};

	const handleEditReservation = (reservation: any) => {
		setEditingReservation(reservation);
		setIsEditDialogOpen(true);
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
		
		// Create a hidden div with printable content
		const printContent = `
			<div style="font-family: Arial, sans-serif; padding: 20px;">
				<div style="text-align: center; margin-bottom: 30px;">
					<h1>${printableData.hotel_name || 'Hotel Reservation'}</h1>
					<h2>Reservation Confirmation</h2>
					<p><strong>Reservation Number:</strong> ${reservation.reservation_number}</p>
				</div>
				
				<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
					<div>
						<h3>Guest Information</h3>
						<p><strong>Name:</strong> ${reservation.guest_name}</p>
						<p><strong>Email:</strong> ${reservation.guest_email || 'N/A'}</p>
						<p><strong>Phone:</strong> ${reservation.guest_phone || 'N/A'}</p>
						<p><strong>Nationality:</strong> ${reservation.guest_nationality || 'N/A'}</p>
						<p><strong>Adults:</strong> ${reservation.adults}</p>
						<p><strong>Children:</strong> ${reservation.children}</p>
					</div>
					
					<div>
						<h3>Booking Details</h3>
						<p><strong>Check-in:</strong> ${new Date(reservation.check_in_date).toLocaleDateString()}</p>
						<p><strong>Check-out:</strong> ${new Date(reservation.check_out_date).toLocaleDateString()}</p>
						<p><strong>Nights:</strong> ${reservation.nights}</p>
						<p><strong>Room:</strong> ${printableData.room_number} (${printableData.room_type})</p>
						<p><strong>Status:</strong> ${reservation.status}</p>
					</div>
				</div>
				
				<div style="margin-bottom: 20px;">
					<h3>Financial Summary</h3>
					<p><strong>Room Rate:</strong> ${reservation.currency} ${reservation.room_rate}</p>
					<p><strong>Total Amount:</strong> ${reservation.currency} ${reservation.total_amount}</p>
					<p><strong>Paid Amount:</strong> ${reservation.currency} ${reservation.paid_amount || 0}</p>
					<p><strong>Balance:</strong> ${reservation.currency} ${(reservation.total_amount - (reservation.paid_amount || 0)).toFixed(2)}</p>
				</div>
				
				${reservation.special_requests ? `
				<div style="margin-bottom: 20px;">
					<h3>Special Requests</h3>
					<p>${reservation.special_requests}</p>
				</div>
				` : ''}
				
				<div style="margin-bottom: 20px;">
					<h3>Hotel Information</h3>
					<p><strong>Location:</strong> ${printableData.location_name}</p>
					${printableData.hotel_address ? `<p><strong>Address:</strong> ${printableData.hotel_address}</p>` : ''}
					${printableData.hotel_phone ? `<p><strong>Phone:</strong> ${printableData.hotel_phone}</p>` : ''}
					${printableData.hotel_email ? `<p><strong>Email:</strong> ${printableData.hotel_email}</p>` : ''}
				</div>
			</div>
		`;

		// Create a hidden iframe for printing
		const iframe = document.createElement('iframe');
		iframe.style.display = 'none';
		document.body.appendChild(iframe);

		const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
		if (iframeDoc) {
			iframeDoc.open();
			iframeDoc.write(`
				<!DOCTYPE html>
				<html>
				<head>
					<title>Reservation ${reservation.reservation_number}</title>
					<style>
						@page {
							size: A4;
							margin: 1cm;
						}
						@media print {
							body { margin: 0; padding: 0; }
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
