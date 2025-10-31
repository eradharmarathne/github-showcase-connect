import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
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
import { usePermissions } from "@/hooks/use-permissions";
import { useTenant } from "@/hooks/use-tenant";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";

type Account = Tables<"accounts">;
type Location = Tables<"locations">;

interface AccountFormProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	account: Account | null;
	locations: Location[];
	onSaved: () => void;
}

export function AccountForm({
	open,
	onOpenChange,
	account: editingAccount,
	locations,
	onSaved,
}: AccountFormProps) {
	const { toast } = useToast();
	const { tenant } = useTenant();
	const { hasPermission } = usePermissions();
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [formData, setFormData] = useState({
		name: editingAccount?.name || "",
		currency: editingAccount?.currency || "LKR",
		initial_balance: editingAccount?.initial_balance || 0,
		location_access: editingAccount?.location_access || ([] as string[]),
	});

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (isSubmitting) return;

		// Check permission before allowing create/edit
		if (!hasPermission("access_accounts")) {
			toast({
				title: "Error",
				description: "You don't have permission to manage accounts",
				variant: "destructive",
			});
			return;
		}

		setIsSubmitting(true);

		try {
			if (editingAccount) {
				// Update existing account
				// Calculate adjustment needed for current_balance when initial_balance changes
				const initialBalanceDifference =
					formData.initial_balance - editingAccount.initial_balance;
				const newCurrentBalance =
					editingAccount.current_balance + initialBalanceDifference;

				const { error } = await supabase
					.from("accounts")
					.update({
						name: formData.name,
						currency: formData.currency,
						initial_balance: formData.initial_balance,
						current_balance: newCurrentBalance, // Adjust current_balance by the difference
						location_access: formData.location_access,
					})
					.eq("id", editingAccount.id);

				if (error) throw error;

				toast({
					title: "Success",
					description: "Account updated successfully",
				});
			} else {
				// Create new account
				const { error } = await supabase.from("accounts").insert({
					name: formData.name,
					currency: formData.currency,
					initial_balance: formData.initial_balance,
					current_balance: formData.initial_balance, // Set current_balance equal to initial_balance
					location_access: formData.location_access,
					tenant_id: tenant?.id || "",
				});

				if (error) throw error;

				toast({
					title: "Success",
					description: "Account created successfully",
				});
			}

			onSaved();
			resetForm();
		} catch (error) {
			console.error("Error saving account:", error);
			toast({
				title: "Error",
				description: "Failed to save account",
				variant: "destructive",
			});
		} finally {
			setIsSubmitting(false);
		}
	};

	const resetForm = () => {
		setFormData({
			name: "",
			currency: "LKR",
			initial_balance: 0,
			location_access: [],
		});
		onOpenChange(false);
	};

	// Update form data when editing account changes
	useEffect(() => {
		if (editingAccount) {
			setFormData({
				name: editingAccount.name,
				currency: editingAccount.currency,
				initial_balance: editingAccount.initial_balance,
				location_access: editingAccount.location_access,
			});
		} else {
			setFormData({
				name: "",
				currency: "LKR",
				initial_balance: 0,
				location_access: [],
			});
		}
	}, [editingAccount]);

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>
						{editingAccount ? "Edit Account" : "Add New Account"}
					</DialogTitle>
				</DialogHeader>
				<form onSubmit={handleSubmit} className="space-y-4">
					<div>
						<Label htmlFor="name">Account Name</Label>
						<Input
							id="name"
							value={formData.name}
							onChange={(e) =>
								setFormData({ ...formData, name: e.target.value })
							}
							required
						/>
					</div>
					<div>
						<Label htmlFor="currency">Currency</Label>
						<Select
							value={formData.currency}
							onValueChange={(value: "LKR" | "USD") =>
								setFormData({ ...formData, currency: value })
							}
						>
							<SelectTrigger>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="LKR">LKR</SelectItem>
								<SelectItem value="USD">USD</SelectItem>
							</SelectContent>
						</Select>
					</div>
					<div>
						<Label htmlFor="initial_balance">Initial Balance</Label>
						<Input
							id="initial_balance"
							type="number"
							step="0.01"
							value={formData.initial_balance}
							onChange={(e) =>
								setFormData({
									...formData,
									initial_balance: parseFloat(e.target.value) || 0,
								})
							}
						/>
					</div>
					<div>
						<Label htmlFor="location_access">Location Access</Label>
						<div className="space-y-2 max-h-32 overflow-y-auto border rounded-md p-2">
							{locations.map((location) => (
								<div key={location.id} className="flex items-center space-x-2">
									<input
										type="checkbox"
										id={location.id}
										checked={formData.location_access.includes(location.id)}
										onChange={(e) => {
											if (e.target.checked) {
												setFormData({
													...formData,
													location_access: [
														...formData.location_access,
														location.id,
													],
												});
											} else {
												setFormData({
													...formData,
													location_access: formData.location_access.filter(
														(id) => id !== location.id,
													),
												});
											}
										}}
									/>
									<Label htmlFor={location.id} className="text-sm">
										{location.name}
									</Label>
								</div>
							))}
						</div>
					</div>
					<div className="flex gap-2">
						<Button type="submit" disabled={isSubmitting}>
							{isSubmitting
								? editingAccount
									? "Updating..."
									: "Adding..."
								: editingAccount
									? "Update Account"
									: "Add Account"}
						</Button>
						<Button type="button" variant="outline" onClick={resetForm}>
							Cancel
						</Button>
					</div>
				</form>
			</DialogContent>
		</Dialog>
	);
}
