import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { CurrencySelector } from "@/components/CurrencySelector";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useLocationContext } from "@/context/LocationContext";
import { useToast } from "@/hooks/use-toast";
import { useProfile } from "@/hooks/useProfile";
import { supabase } from "@/integrations/supabase/client";
import { convertCurrency } from "@/utils/currency";

type Database = any;
type Reservation = Database["public"]["Tables"]["reservations"]["Row"];
type Account = Database["public"]["Tables"]["accounts"]["Row"];
type IncomeType = {
	id: string;
	type_name: string;
	created_at: string;
	tenant_id: string;
};

interface AddIncomeDialogProps {
	isOpen: boolean;
	onClose: () => void;
	selectedReservation: Reservation | null;
	accounts: Account[];
	onSuccess: () => void;
}

export function AddIncomeDialog({
	isOpen,
	onClose,
	selectedReservation,
	accounts,
	onSuccess,
}: AddIncomeDialogProps) {
	const { t } = useTranslation();
	const { toast } = useToast();
	const { profile } = useProfile();
	const { selectedLocation } = useLocationContext();
	const [incomeTypes, setIncomeTypes] = useState<IncomeType[]>([]);
	const [incomeForm, setIncomeForm] = useState({
		amount: 0,
		note: "",
		account_id: "",
		income_type_id: "",
		currency: "LKR", // Default currency
		payment_method: "cash", // "cash" for immediate payment, "pending" for add to bill
	});
	// Store the base amount and currency for conversion reference
	const [baseAmount, setBaseAmount] = useState<number>(0);
	const [baseCurrency, setBaseCurrency] = useState<string>("LKR");
	const [displayedReservationAmount, setDisplayedReservationAmount] =
		useState<number>(0);

	const fetchIncomeTypes = useCallback(async () => {
		try {
			const { data, error } = await supabase
				.from("income_types")
				.select("*")
				.eq("tenant_id", profile?.tenant_id)
				.order("type_name", { ascending: true });
			if (error) throw error;
			setIncomeTypes(data || []);
		} catch (error) {
			console.error("Error fetching income types:", error);
		}
	}, [profile?.tenant_id]);

	useEffect(() => {
		if (profile?.tenant_id && isOpen) {
			fetchIncomeTypes();
		}
	}, [profile?.tenant_id, fetchIncomeTypes, isOpen]);

	useEffect(() => {
		if (selectedReservation) {
			const reservationCurrency = selectedReservation.currency || "LKR";
			const reservationAmount = selectedReservation.total_amount || 0;
			const paidAmount = selectedReservation.paid_amount || 0;
			const remainingBalance = reservationAmount - paidAmount;

			// Set the base amount and currency from the reservation
			setBaseAmount(reservationAmount);
			setBaseCurrency(reservationCurrency);
			setDisplayedReservationAmount(reservationAmount);

			// Set form currency to match reservation and amount to remaining balance
			setIncomeForm((prev) => ({
				...prev,
				currency: reservationCurrency,
				amount: Math.max(0, remainingBalance), // Ensure non-negative
				note:
					t("income.addDialog.reservationInfo.reservation") +
					` ${selectedReservation.reservation_number}`,
			}));
		}
	}, [selectedReservation, t]);

	const handleIncomeSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (!selectedReservation) return;

		// Validate required fields
		if (incomeForm.payment_method === "cash" && !incomeForm.account_id) {
			toast({
				title: "Error",
				description: "Please select an account for the payment.",
				variant: "destructive",
			});
			return;
		}

		try {
			const isAddToBill = incomeForm.payment_method === "pending";

			if (isAddToBill) {
				// Add to bill: create income record with pending status
				// Database trigger will automatically update reservation total_amount and balance_amount
				const { error: incomeError } = await supabase.from("income").insert({
					booking_id: selectedReservation.id,
					amount: incomeForm.amount,
					currency: incomeForm.currency as "LKR" | "USD" | "EUR" | "GBP",
					note:
						incomeForm.note ||
						`Additional service for reservation ${selectedReservation.reservation_number}`,
					income_type_id: incomeForm.income_type_id || null,
					tenant_id: profile?.tenant_id,
					location_id: selectedLocation,
					account_id: null, // No account for pending items
					payment_method: "pending",
					type: "booking",
				});

				if (incomeError) throw incomeError;

				toast({
					title: "Success",
					description: "Item added to guest bill successfully",
				});
			} else {
				// Immediate payment: create payment record
				// Database trigger will automatically update account balance and reservation amounts
				const selectedAccount = accounts.find(
					(acc) => acc.id === incomeForm.account_id,
				);
				const accountCurrency = selectedAccount?.currency || "LKR";

				// Convert amount to account currency if needed
				let convertedAmount = incomeForm.amount;
				if (incomeForm.currency !== accountCurrency) {
					// TODO: Implement currency conversion
					convertedAmount = incomeForm.amount; // For now, use same amount
				}

				const { error: paymentError } = await supabase.from("payments").insert({
					reservation_id: selectedReservation.id,
					amount: convertedAmount,
					currency: accountCurrency as "LKR" | "USD" | "EUR" | "GBP",
					payment_method: incomeForm.payment_method,
					payment_type: "reservation",
					payment_number: `PAY-${Date.now()}`,
					account_id: incomeForm.account_id,
					notes:
						incomeForm.note ||
						`Payment for reservation ${selectedReservation.reservation_number}`,
					tenant_id: profile?.tenant_id,
					created_by: profile?.id || null,
				});

				if (paymentError) throw paymentError;

				toast({
					title: "Success",
					description: "Payment recorded successfully",
				});
			}

			onSuccess();
			handleClose();
		} catch (error) {
			console.error("Error recording income:", error);
			toast({
				title: "Error",
				description: "Failed to record payment. Please try again.",
				variant: "destructive",
			});
		}
	};

	const resetIncomeForm = () => {
		setIncomeForm({
			amount: 0,
			note: "",
			account_id: "",
			income_type_id: "",
			currency: "LKR", // Reset to default currency
			payment_method: "cash", // Reset to immediate payment
		});
	};

	const handleClose = () => {
		onClose();
		resetIncomeForm();
	};

	// Handle currency change with automatic amount conversion
	const handleCurrencyChange = async (newCurrency: string) => {
		if (incomeForm.currency === newCurrency) return;

		try {
			// Convert the current amount from the old currency to the new currency
			const convertedAmount = await convertCurrency(
				incomeForm.amount,
				incomeForm.currency,
				newCurrency,
				profile?.tenant_id!,
				selectedLocation!,
			);

			// Also convert the reservation total amount for display
			const convertedReservationAmount = await convertCurrency(
				baseAmount,
				baseCurrency,
				newCurrency,
				profile?.tenant_id!,
				selectedLocation!,
			);

			setIncomeForm((prev) => ({
				...prev,
				currency: newCurrency,
				amount: Number(convertedAmount.toFixed(2)), // Round to 2 decimal places
			}));

			setDisplayedReservationAmount(
				Number(convertedReservationAmount.toFixed(2)),
			);
		} catch (error) {
			console.error("Error converting currency:", error);
			// If conversion fails, just change the currency without converting amount
			setIncomeForm((prev) => ({
				...prev,
				currency: newCurrency,
			}));
			toast({
				title: "Warning",
				description: "Could not convert amount. Please verify the value.",
				variant: "destructive",
			});
		}
	};

	return (
		<Dialog open={isOpen} onOpenChange={handleClose}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>{t("income.addDialog.title")}</DialogTitle>
					<DialogDescription>
						{t("income.addDialog.description")}
					</DialogDescription>
				</DialogHeader>
				<form onSubmit={handleIncomeSubmit} className="space-y-4">
					{selectedReservation && (
						<div className="p-4 bg-gray-50 rounded-md">
							<p>
								<strong>
									{t("income.addDialog.reservationInfo.reservation")}
								</strong>{" "}
								{selectedReservation.reservation_number}
							</p>
							<p>
								<strong>{t("income.addDialog.reservationInfo.guest")}</strong>{" "}
								{selectedReservation.guest_name}
							</p>
							<p>
								<strong>{t("income.addDialog.reservationInfo.amount")}</strong>{" "}
								{incomeForm.currency}{" "}
								{displayedReservationAmount.toLocaleString()}
							</p>
						</div>
					)}
					<div>
						<Label htmlFor="amount">{t("income.addDialog.form.amount")}</Label>
						<Input
							id="amount"
							type="number"
							step="0.01"
							value={incomeForm.amount}
							onChange={(e) =>
								setIncomeForm({
									...incomeForm,
									amount: Number.parseFloat(e.target.value),
								})
							}
							required
						/>
					</div>
					<div>
						<Label htmlFor="currency">Currency</Label>
						<CurrencySelector
							currency={incomeForm.currency}
							onCurrencyChange={handleCurrencyChange}
							label=""
							showGoogleSearchLink={false}
						/>
					</div>
					<div>
						<Label htmlFor="note">{t("income.addDialog.form.note")}</Label>
						<Textarea
							id="note"
							value={incomeForm.note}
							onChange={(e) =>
								setIncomeForm({ ...incomeForm, note: e.target.value })
							}
							placeholder={t("income.addDialog.form.notePlaceholder")}
						/>
					</div>
					<div>
						<Label htmlFor="income_type_id">
							{t("income.addDialog.form.incomeType")}
						</Label>
						<Select
							value={incomeForm.income_type_id}
							onValueChange={(value) =>
								setIncomeForm({ ...incomeForm, income_type_id: value })
							}
						>
							<SelectTrigger>
								<SelectValue
									placeholder={t("income.addDialog.form.incomeTypePlaceholder")}
								/>
							</SelectTrigger>
							<SelectContent>
								{incomeTypes.map((type) => (
									<SelectItem key={type.id} value={type.id}>
										{type.type_name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
					<div className="flex items-center space-x-2 p-4 bg-blue-50 rounded-md">
						<Switch
							id="add-to-bill"
							checked={incomeForm.payment_method === "pending"}
							onCheckedChange={(checked) =>
								setIncomeForm({ 
									...incomeForm, 
									payment_method: checked ? "pending" : "cash",
									account_id: checked ? "" : incomeForm.account_id // Clear account if adding to bill
								})
							}
						/>
						<div className="flex-1">
							<Label htmlFor="add-to-bill" className="text-sm font-medium">
								Add to Guest Bill
							</Label>
							<p className="text-xs text-gray-600">
								{incomeForm.payment_method === "pending" 
									? "This item will be added to the guest's total bill to pay at checkout"
									: "This will be recorded as an immediate payment"}
							</p>
						</div>
					</div>
					{incomeForm.payment_method === "cash" && (
					<div>
						<Label htmlFor="account_id">
							{t("income.addDialog.form.accountRequired")}
						</Label>
						<Select
							value={incomeForm.account_id}
							onValueChange={(value) =>
								setIncomeForm((prev) => ({ ...prev, account_id: value }))
							}
							required
						>
							<SelectTrigger>
								<SelectValue
									placeholder={t("income.addDialog.form.accountPlaceholder")}
								/>
							</SelectTrigger>
							<SelectContent>
								{accounts.map((account) => (
									<SelectItem key={account.id} value={account.id}>
										{account.name} ({account.currency})
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						<p className="text-sm text-gray-600 mt-1">
							{t("income.addDialog.form.accountDescription")}
						</p>
					</div>
					)}
					<div className="flex gap-2 justify-end">
						<Button type="button" variant="outline" onClick={handleClose}>
							{t("income.addDialog.buttons.cancel")}
						</Button>
						<Button
							type="submit"
							disabled={!incomeForm.amount || (incomeForm.payment_method === "cash" && !incomeForm.account_id)}
						>
							{incomeForm.payment_method === "pending" 
								? "Add to Bill" 
								: t("income.addDialog.buttons.record")}
						</Button>
					</div>
				</form>
			</DialogContent>
		</Dialog>
	);
}
