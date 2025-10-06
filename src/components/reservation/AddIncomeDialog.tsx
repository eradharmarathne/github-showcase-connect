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
		payment_type: "direct" as "direct" | "deferred", // direct = paid now, deferred = add to bill
		currency: "LKR", // Default currency
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

			// Set the base amount and currency from the reservation
			setBaseAmount(reservationAmount);
			setBaseCurrency(reservationCurrency);
			setDisplayedReservationAmount(reservationAmount);

			setIncomeForm({
				amount: 0, // Start with empty amount for additional services
				note:
					t("income.addDialog.reservationInfo.reservation") +
					` ${selectedReservation.reservation_number}`,
				account_id: "",
				income_type_id: "",
				payment_type: "direct",
				currency: reservationCurrency, // Use reservation currency
			});
		}
	}, [selectedReservation, t]);

	const handleIncomeSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		// Allow income creation with or without a reservation

		try {
			const incomeData = {
				note:
					incomeForm.note ||
					(selectedReservation
						? t("income.addDialog.reservationInfo.reservation") +
							` ${selectedReservation.reservation_number}`
						: "General income entry"),
				amount: incomeForm.amount,
				currency: incomeForm.currency as "LKR" | "USD" | "EUR" | "GBP", // Cast to correct enum type
				// For direct payments: require account_id, for deferred: set to null
				account_id:
					incomeForm.payment_type === "direct" ? incomeForm.account_id : null,
				income_type_id: incomeForm.income_type_id || null,
				type: "booking" as const,
				payment_method:
					incomeForm.payment_type === "direct" ? "cash" : "pending",
				location_id: selectedLocation,
				tenant_id: profile?.tenant_id,
				// Only set booking_id if there's a valid reservation selected
				booking_id: selectedReservation?.id || null,
			}; // Start transaction-like operations
			const { error: incomeError } = await supabase
				.from("income")
				.insert(incomeData);
			if (incomeError) throw incomeError;

			// Only update reservation amounts if there's a selected reservation
			if (selectedReservation) {
				// Convert income amount to reservation currency for updating reservation totals
				const convertedAmount = await convertCurrency(
					incomeForm.amount,
					incomeForm.currency,
					selectedReservation.currency,
				);

				// If deferred payment, update reservation total amount
				if (incomeForm.payment_type === "deferred") {
					const newTotal = selectedReservation.total_amount + convertedAmount;
					const { error: reservationError } = await supabase
						.from("reservations")
						.update({
							total_amount: newTotal,
							updated_at: new Date().toISOString(),
						})
						.eq("id", selectedReservation.id);
					if (reservationError) throw reservationError;
				} else if (incomeForm.payment_type === "direct") {
					// For direct payments, update paid_amount to reflect the payment received
					const newPaidAmount =
						(selectedReservation.paid_amount || 0) + convertedAmount;
					const { error: reservationError } = await supabase
						.from("reservations")
						.update({
							paid_amount: newPaidAmount,
							updated_at: new Date().toISOString(),
						})
						.eq("id", selectedReservation.id);
					if (reservationError) throw reservationError;
				}
			}

			const successMessage =
				incomeForm.payment_type === "direct"
					? t("income.addDialog.messages.directSuccess")
					: t("income.addDialog.messages.deferredSuccess");

			toast({ title: "Success", description: successMessage });
			onClose();
			resetIncomeForm();
			onSuccess();
		} catch (error) {
			console.error("Income error:", error);
			toast({
				title: "Error",
				description: t("income.addDialog.messages.error"),
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
			payment_type: "direct",
			currency: "LKR", // Reset to default currency
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
			);

			// Also convert the reservation total amount for display
			const convertedReservationAmount = await convertCurrency(
				baseAmount,
				baseCurrency,
				newCurrency,
			);

			setIncomeForm({
				...incomeForm,
				currency: newCurrency,
				amount: Number(convertedAmount.toFixed(2)), // Round to 2 decimal places
			});

			setDisplayedReservationAmount(
				Number(convertedReservationAmount.toFixed(2)),
			);
		} catch (error) {
			console.error("Error converting currency:", error);
			// If conversion fails, just change the currency without converting amount
			setIncomeForm({
				...incomeForm,
				currency: newCurrency,
			});
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
					<div>
						<Label htmlFor="payment_type">
							{t("income.addDialog.form.paymentType")}
						</Label>
						<Select
							value={incomeForm.payment_type}
							onValueChange={(value) =>
								setIncomeForm({
									...incomeForm,
									payment_type: value as "direct" | "deferred",
								})
							}
						>
							<SelectTrigger>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="direct">
									{t("income.addDialog.paymentTypes.direct")}
								</SelectItem>
								<SelectItem value="deferred">
									{t("income.addDialog.paymentTypes.deferred")}
								</SelectItem>
							</SelectContent>
						</Select>
						<p className="text-sm text-gray-600 mt-1">
							{incomeForm.payment_type === "direct"
								? t("income.addDialog.paymentTypes.directDescription")
								: t("income.addDialog.paymentTypes.deferredDescription")}
						</p>
					</div>
					{incomeForm.payment_type === "direct" && (
						<div>
							<Label htmlFor="account_id">
								{t("income.addDialog.form.accountRequired")}
							</Label>
							<Select
								value={incomeForm.account_id}
								onValueChange={(value) =>
									setIncomeForm({ ...incomeForm, account_id: value })
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
					{incomeForm.payment_type === "deferred" && (
						<div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
							<p className="text-sm text-blue-800">
								<strong>
									{t("income.addDialog.paymentTypes.deferredInfo")}
								</strong>
							</p>
						</div>
					)}
					<div className="flex gap-2 justify-end">
						<Button type="button" variant="outline" onClick={handleClose}>
							{t("income.addDialog.buttons.cancel")}
						</Button>
						<Button
							type="submit"
							disabled={
								!incomeForm.amount ||
								(incomeForm.payment_type === "direct" && !incomeForm.account_id)
							}
						>
							{t("income.addDialog.buttons.record")}
						</Button>
					</div>
				</form>
			</DialogContent>
		</Dialog>
	);
}
