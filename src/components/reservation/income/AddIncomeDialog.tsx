import React, { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useLocationContext } from "@/context/location-context";
import { useProfile } from "@/hooks/use-profile";
import { supabase } from "@/integrations/supabase/client";
import { AddToBillForm } from "./AddToBillForm";
import { ImmediatePaymentForm } from "./ImmediatePaymentForm";
import { redirect } from "react-router";

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
	const { profile } = useProfile();
	const { selectedLocation } = useLocationContext();
	const [incomeTypes, setIncomeTypes] = useState<IncomeType[]>([]);
	const [isAddToBill, setIsAddToBill] = useState(false);

	// Store the base amount and currency for conversion reference
	const [baseAmount, setBaseAmount] = useState<number>(0);
	const [baseCurrency, setBaseCurrency] = useState<string>("LKR");
	const [displayedReservationAmount, setDisplayedReservationAmount] =
		useState<number>(0);



	useEffect(() => {
		const fetchIncomeTypes = async () => {
			try {
				console.log("Fetching income types for tenant:", profile?.tenant_id);
				const { data, error } = await supabase
					.from("income_types")
					.select("*")
					.eq("tenant_id", profile?.tenant_id)
					.order("type_name", { ascending: true });
				if (error) throw error;
				console.log("Fetched income types:", data);
				setIncomeTypes(data || []);
			} catch (error) {
				console.error("Error fetching income types:", error);
			}
		};
		if (profile?.tenant_id && isOpen) {
			fetchIncomeTypes();
		}
		// Do not return a redirect here; handle navigation in a different effect or in the render logic.
	}, [profile?.tenant_id, isOpen, supabase, profile, setIncomeTypes]);

	useEffect(() => {
		if (selectedReservation) {
			const reservationCurrency = selectedReservation.currency || "LKR";
			const reservationAmount = selectedReservation.total_amount || 0;

			// Set the base amount and currency from the reservation
			setBaseAmount(reservationAmount);
			setBaseCurrency(reservationCurrency);
			setDisplayedReservationAmount(reservationAmount);
		}
	}, [selectedReservation]);

	const handleClose = () => {
		onClose();
		setIsAddToBill(false);
	};

	const handleSuccess = () => {
		onSuccess();
		handleClose();
	};

	if (!selectedReservation || !profile?.tenant_id || !selectedLocation) {
		return null;
	}

	return (
		<Dialog open={isOpen} onOpenChange={handleClose}>
			<DialogContent className="max-w-2xl sm:max-w-4xl lg:max-w-5xl overflow-y-auto max-h-[95vh]">
				<DialogHeader>
					<DialogTitle>{t("income.addDialog.title")}</DialogTitle>
					<DialogDescription>
						{t("income.addDialog.description")}
					</DialogDescription>
				</DialogHeader>

				<div className="flex items-center space-x-2 p-4 bg-blue-50 rounded-md mb-4">
					<Switch
						id="add-to-bill"
						checked={isAddToBill}
						onCheckedChange={setIsAddToBill}
					/>
					<div className="flex-1">
						<Label htmlFor="add-to-bill" className="text-sm font-medium">
							Add to Guest Bill
						</Label>
						<p className="text-xs text-gray-600">
							{isAddToBill
								? "This item will be added to the guest's total bill to pay at checkout"
								: "This will be recorded as an immediate payment"}
						</p>
					</div>
				</div>

				<React.Suspense fallback={<div className="p-4">Loading...</div>}>
					{isAddToBill ? (
						<AddToBillForm
							reservation={selectedReservation}
							incomeTypes={incomeTypes}
							onSuccess={handleSuccess}
							onCancel={handleClose}
							profileId={profile.id}
							tenantId={profile.tenant_id}
							locationId={selectedLocation}
							baseAmount={baseAmount}
							baseCurrency={baseCurrency}
							displayedReservationAmount={displayedReservationAmount}
							onDisplayedReservationAmountChange={setDisplayedReservationAmount}
						/>
					) : (
						<ImmediatePaymentForm
							reservation={selectedReservation}
							accounts={accounts}
							incomeTypes={incomeTypes}
							onSuccess={handleSuccess}
							onCancel={handleClose}
							profileId={profile.id}
							tenantId={profile.tenant_id}
							locationId={selectedLocation}
							baseAmount={baseAmount}
							baseCurrency={baseCurrency}
							displayedReservationAmount={displayedReservationAmount}
							onDisplayedReservationAmountChange={setDisplayedReservationAmount}
						/>
					)}
				</React.Suspense>
			</DialogContent>
		</Dialog>
	);
}
