import { useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";

type Account = Tables<"accounts">;

interface AccountTransferFormProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	accounts: Account[];
	onTransferCompleted: () => void;
}

export function AccountTransferForm({
	open,
	onOpenChange,
	accounts,
	onTransferCompleted,
}: AccountTransferFormProps) {
	const { toast } = useToast();
	const [isTransferring, setIsTransferring] = useState(false);

	// Calculate current balance for account
	const calculateAccountBalance = (account: Account) => {
		// Use the current_balance column which is automatically calculated by database triggers
		return account.current_balance;
	};
	const [currentExchangeRate, setCurrentExchangeRate] = useState({
		usdToLkr: 300,
		lkrToUsd: 0.0033,
	});
	const [transferData, setTransferData] = useState({
		fromAccountId: "",
		toAccountId: "",
		amount: 0,
		conversionRate: 1,
		note: "",
	});

	const getConversionRate = (fromCurrency: string, toCurrency: string) => {
		if (fromCurrency === toCurrency) return 1;
		if (fromCurrency === "USD" && toCurrency === "LKR") {
			return currentExchangeRate.usdToLkr;
		} else if (fromCurrency === "LKR" && toCurrency === "USD") {
			return currentExchangeRate.lkrToUsd;
		}
		return 1;
	};

	const handleFromAccountChange = (value: string) => {
		const toAccount = accounts.find(
			(acc) => acc.id === transferData.toAccountId,
		);
		const fromAccount = accounts.find((acc) => acc.id === value);

		setTransferData({
			...transferData,
			fromAccountId: value,
			conversionRate:
				fromAccount && toAccount
					? getConversionRate(fromAccount.currency, toAccount.currency)
					: 1,
		});
	};

	const handleToAccountChange = (value: string) => {
		const fromAccount = accounts.find(
			(acc) => acc.id === transferData.fromAccountId,
		);
		const toAccount = accounts.find((acc) => acc.id === value);

		setTransferData({
			...transferData,
			toAccountId: value,
			conversionRate:
				fromAccount && toAccount
					? getConversionRate(fromAccount.currency, toAccount.currency)
					: 1,
		});
	};

	const handleTransfer = async (e: React.FormEvent) => {
		e.preventDefault();
		if (isTransferring) return;

		setIsTransferring(true);

		try {
			const fromAccount = accounts.find(
				(acc) => acc.id === transferData.fromAccountId,
			);
			const currentBalance =
				calculateAccountBalance(
					accounts.find(
						(acc) => acc.id === transferData.fromAccountId,
					) as Account,
				) || 0;

			if (transferData.amount > currentBalance) {
				toast({
					title: "Error",
					description: "Insufficient balance in source account",
					variant: "destructive",
				});
				return;
			}

			const { error } = await supabase.from("account_transfers").insert({
				from_account_id: transferData.fromAccountId,
				to_account_id: transferData.toAccountId,
				amount: transferData.amount,
				conversion_rate: transferData.conversionRate,
				note: transferData.note,
			});

			if (error) throw error;

			toast({
				title: "Success",
				description: `Transfer completed successfully`,
			});

			resetTransferForm();
			onTransferCompleted();
		} catch (error) {
			console.error("Error transferring funds:", error);
			toast({
				title: "Error",
				description: "Failed to complete transfer",
				variant: "destructive",
			});
		} finally {
			setIsTransferring(false);
		}
	};

	const resetTransferForm = () => {
		setTransferData({
			fromAccountId: "",
			toAccountId: "",
			amount: 0,
			conversionRate: 1,
			note: "",
		});
		onOpenChange(false);
	};

	const fromAccount = accounts.find(
		(acc) => acc.id === transferData.fromAccountId,
	);
	const toAccount = accounts.find((acc) => acc.id === transferData.toAccountId);

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-md">
				<DialogHeader>
					<DialogTitle>Transfer Money Between Accounts</DialogTitle>
				</DialogHeader>
				<form onSubmit={handleTransfer} className="space-y-4">
					<div>
						<Label htmlFor="fromAccount">From Account</Label>
						<Select
							value={transferData.fromAccountId}
							onValueChange={handleFromAccountChange}
						>
							<SelectTrigger>
								<SelectValue placeholder="Select source account" />
							</SelectTrigger>
							<SelectContent>
								{accounts.map((account) => (
									<SelectItem key={account.id} value={account.id}>
										<div className="flex justify-between items-center w-full">
											<span>
												{account.name} ({account.currency})
											</span>
											<span className="text-muted-foreground ml-2">
												Balance: {account.currency === "LKR" ? "Rs." : "$"}
												{calculateAccountBalance(account).toLocaleString()}
											</span>
										</div>
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					<div>
						<Label htmlFor="toAccount">To Account</Label>
						<Select
							value={transferData.toAccountId}
							onValueChange={handleToAccountChange}
						>
							<SelectTrigger>
								<SelectValue placeholder="Select destination account" />
							</SelectTrigger>
							<SelectContent>
								{accounts
									.filter((acc) => acc.id !== transferData.fromAccountId)
									.map((account) => (
										<SelectItem key={account.id} value={account.id}>
											<div className="flex justify-between items-center w-full">
												<span>
													{account.name} ({account.currency})
												</span>
												<span className="text-muted-foreground ml-2">
													Balance: {account.currency === "LKR" ? "Rs." : "$"}
													{calculateAccountBalance(account).toLocaleString()}
												</span>
											</div>
										</SelectItem>
									))}
							</SelectContent>
						</Select>
					</div>

					<div className="grid grid-cols-2 gap-4">
						<div>
							<Label htmlFor="usdToLkr">USD to LKR Rate</Label>
							<Input
								id="usdToLkr"
								type="number"
								step="0.01"
								value={currentExchangeRate.usdToLkr}
								onChange={(e) =>
									setCurrentExchangeRate({
										...currentExchangeRate,
										usdToLkr: parseFloat(e.target.value) || 300,
										lkrToUsd: 1 / (parseFloat(e.target.value) || 300),
									})
								}
							/>
						</div>
						<div>
							<Label htmlFor="lkrToUsd">LKR to USD Rate</Label>
							<Input
								id="lkrToUsd"
								type="number"
								step="0.0001"
								value={currentExchangeRate.lkrToUsd}
								onChange={(e) =>
									setCurrentExchangeRate({
										...currentExchangeRate,
										lkrToUsd: parseFloat(e.target.value) || 0.0033,
										usdToLkr: 1 / (parseFloat(e.target.value) || 0.0033),
									})
								}
							/>
						</div>
					</div>

					<div>
						<Label htmlFor="amount">Amount</Label>
						<Input
							id="amount"
							type="number"
							step="0.01"
							value={transferData.amount}
							onChange={(e) =>
								setTransferData({
									...transferData,
									amount: parseFloat(e.target.value) || 0,
								})
							}
							required
						/>
					</div>

					{fromAccount &&
						toAccount &&
						fromAccount.currency !== toAccount.currency && (
							<div>
								<Label htmlFor="conversionRate">
									Conversion Rate ({fromAccount.currency} to{" "}
									{toAccount.currency})
								</Label>
								<Input
									id="conversionRate"
									type="number"
									step="0.0001"
									value={transferData.conversionRate}
									onChange={(e) =>
										setTransferData({
											...transferData,
											conversionRate: parseFloat(e.target.value) || 1,
										})
									}
									required
								/>
								<p className="text-sm text-muted-foreground mt-1">
									{transferData.amount} {fromAccount.currency} ={" "}
									{(transferData.amount * transferData.conversionRate).toFixed(
										2,
									)}{" "}
									{toAccount.currency}
								</p>
							</div>
						)}

					<div>
						<Label htmlFor="note">Note (Optional)</Label>
						<Textarea
							id="note"
							placeholder="Transfer reason or description..."
							value={transferData.note}
							onChange={(e) =>
								setTransferData({
									...transferData,
									note: e.target.value,
								})
							}
							rows={3}
						/>
					</div>

					<div className="flex gap-2">
						<Button type="submit" disabled={isTransferring}>
							{isTransferring ? "Transferring..." : "Transfer"}
						</Button>
						<Button type="button" variant="outline" onClick={resetTransferForm}>
							Cancel
						</Button>
					</div>
				</form>
			</DialogContent>
		</Dialog>
	);
}
