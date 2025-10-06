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
import { useReservationsData } from "@/hooks/useReservationsData";
import type { Database } from "@/integrations/supabase/types";

type Currency = Database["public"]["Enums"]["currency_type"];

export default function Reservations() {
	const { t } = useTranslation();
	const { locations } = useLocationContext();
	const { refetch } = useReservationsData();
	const { refetch: refetchFinancials } = useReservationFinancials();
	const { accounts } = useIncomeData();
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
