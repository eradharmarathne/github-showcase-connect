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
import { PublicBookingsManager } from "@/components/reservation/public-bookings-manager";
import { useReservationPrint } from "@/components/reservation/reservation-print";
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

type Currency = string;

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
	const { printReservation } = useReservationPrint();

	useEffect(() => {
		async function loadAccountDetails() {
			const result = await fetchAccountDetails();
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
		printReservation(reservation, tenant);
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
		<div className="max-w-full w-full pb-20 sm:pb-12">
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

					<TabsContent value="public-requests" className="space-y-4">
						<PublicBookingsManager />
					</TabsContent>
				</div>
			</Tabs>{" "}
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
