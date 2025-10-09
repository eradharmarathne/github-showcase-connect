import { useCallback } from "react";
import { useLocationContext } from "@/context/location-context";
import { useTenant } from "@/hooks/use-tenant";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { type Currency, convertCurrency } from "@/utils/currency";
import type { AccountDetail } from "./AccountDetailsList";
import type { TransactionWithBalance } from "./TransactionHistoryCard";

export function useAccountData(baseCurrency: Currency) {
	const { toast } = useToast();
	const { tenant } = useTenant();
	const { selectedLocation } = useLocationContext();

	const fetchAccountDetails = useCallback(async () => {
		if (!tenant?.id || !selectedLocation) return null;

		try {
			// Use the new RPC function to get accounts with calculated balances
			const { data: accountsData, error: accountsError } = await supabase.rpc(
				"get_accounts_by_location",
				{
					tenant_id_param: tenant.id,
					location_id_param: selectedLocation,
				},
			);

			if (accountsError) {
				console.error("Error fetching accounts:", accountsError);
				return null;
			}

			if (!accountsData || accountsData.length === 0) {
				return {
					accounts: [],
					allTransactions: [],
					accountSummary: {
						totalInitialBalance: 0,
						totalCurrentBalance: 0,
						totalIncome: 0,
						totalExpenses: 0,
					},
				};
			}

			const accountDetails: AccountDetail[] = [];
			const globalTransactions: TransactionWithBalance[] = [];
			const summaryTotals = {
				totalInitialBalance: 0,
				totalCurrentBalance: 0,
				totalIncome: 0,
				totalExpenses: 0,
			};

			for (const account of accountsData) {
				// Fetch income transactions
				const { data: incomeData } = await supabase
					.from("income")
					.select("id, date, amount, type, note, currency")
					.eq("account_id", account.id)
					.eq("tenant_id", tenant.id)
					.eq("location_id", selectedLocation)
					.order("date", { ascending: true });

				// Fetch expense transactions
				const { data: expenseData } = await supabase
					.from("expenses")
					.select("id, date, amount, main_type, sub_type, note, currency")
					.eq("account_id", account.id)
					.eq("location_id", selectedLocation)
					.order("date", { ascending: true });

				// Fetch transfers from this account
				const { data: transfersFromData } = await supabase
					.from("account_transfers")
					.select("id, created_at, amount, note")
					.eq("from_account_id", account.id)
					.eq("tenant_id", tenant.id)
					.order("created_at", { ascending: true });

				// Fetch transfers to this account
				const { data: transfersToData } = await supabase
					.from("account_transfers")
					.select("id, created_at, amount, conversion_rate, note")
					.eq("to_account_id", account.id)
					.eq("tenant_id", tenant.id)
					.order("created_at", { ascending: true });

				// Process transactions and calculate running balances
				const transactions: TransactionWithBalance[] = [];
				let runningBalance = account.initial_balance;
				let totalIncome = 0;
				let totalExpenses = 0;
				let totalTransfers = 0;

				// Combine all transactions and sort by date
				const allTransactions: Array<{
					id: string;
					date: string;
					type: "income" | "expense" | "transfer_in" | "transfer_out";
					amount: number;
					description: string;
					currency: string;
					note?: string;
				}> = [];

				// Process income
				if (incomeData) {
					for (const income of incomeData) {
						const convertedAmount = await convertCurrency(
							Number(income.amount),
							income.currency as Currency,
							baseCurrency,
							tenant.id,
							selectedLocation,
						);
						allTransactions.push({
							id: income.id,
							date: income.date,
							type: "income",
							amount: convertedAmount,
							description: `${income.type} Income`,
							currency: baseCurrency,
							note: income.note || undefined,
						});
						totalIncome += convertedAmount;
					}
				}

				// Process expenses
				if (expenseData) {
					for (const expense of expenseData) {
						const convertedAmount = await convertCurrency(
							Number(expense.amount),
							expense.currency as Currency,
							baseCurrency,
							tenant.id,
							selectedLocation,
						);
						allTransactions.push({
							id: expense.id,
							date: expense.date,
							type: "expense",
							amount: convertedAmount,
							description: `${expense.main_type} - ${expense.sub_type}`,
							currency: baseCurrency,
							note: expense.note || undefined,
						});
						totalExpenses += convertedAmount;
					}
				}

				// Process transfers out
				if (transfersFromData) {
					for (const transfer of transfersFromData) {
						const amount = Number(transfer.amount);
						allTransactions.push({
							id: transfer.id,
							date: transfer.created_at,
							type: "transfer_out",
							amount: amount,
							description: `Transfer Out${transfer.note ? ` - ${transfer.note}` : ""}`,
							currency: account.currency,
							note: transfer.note || undefined,
						});
						totalTransfers -= amount;
					}
				}

				// Process transfers in
				if (transfersToData) {
					for (const transfer of transfersToData) {
						const amount =
							Number(transfer.amount) * Number(transfer.conversion_rate);
						allTransactions.push({
							id: transfer.id,
							date: transfer.created_at,
							type: "transfer_in",
							amount: amount,
							description: `Transfer In${transfer.note ? ` - ${transfer.note}` : ""}`,
							currency: account.currency,
							note: transfer.note || undefined,
						});
						totalTransfers += amount;
					}
				}

				// Sort by date and calculate running balances
				allTransactions.sort(
					(a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
				);

				for (const txn of allTransactions) {
					if (txn.type === "income" || txn.type === "transfer_in") {
						runningBalance += txn.amount;
					} else {
						runningBalance -= txn.amount;
					}

					transactions.push({
						...txn,
						running_balance: runningBalance,
					});
				}

				// Convert initial balance to base currency
				const convertedInitialBalance = await convertCurrency(
					account.initial_balance,
					account.currency as Currency,
					baseCurrency,
					tenant.id,
					selectedLocation,
				);

				// Use the current_balance from RPC result (already calculated)
				const convertedCurrentBalance = await convertCurrency(
					account.current_balance,
					account.currency as Currency,
					baseCurrency,
					tenant.id,
					selectedLocation,
				);

				// Add to global transactions for overall summary
				for (const txn of transactions) {
					globalTransactions.push({
						...txn,
						description: `${txn.description} (${account.name})`,
					});
				}

				// Update summary totals
				summaryTotals.totalInitialBalance += convertedInitialBalance;
				summaryTotals.totalCurrentBalance += convertedCurrentBalance;
				summaryTotals.totalIncome += totalIncome;
				summaryTotals.totalExpenses += totalExpenses;

				accountDetails.push({
					id: account.id,
					name: account.name,
					currency: account.currency,
					initial_balance: convertedInitialBalance,
					current_balance: convertedCurrentBalance,
					total_income: totalIncome,
					total_expenses: totalExpenses,
					total_transfers: totalTransfers,
					transaction_count: transactions.length,
					transactions: transactions.reverse(), // Show most recent first
				});
			}

			// Sort global transactions by date (most recent first)
			globalTransactions.sort(
				(a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
			);

			return {
				accounts: accountDetails,
				allTransactions: globalTransactions,
				accountSummary: summaryTotals,
			};
		} catch (error) {
			console.error("Error fetching account details:", error);
			toast({
				title: "Error",
				description: "Failed to fetch account details",
				variant: "destructive",
			});
			return null;
		}
	}, [baseCurrency, toast, tenant?.id, selectedLocation]);

	return { fetchAccountDetails };
}
