import { ArrowRightLeft, Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocationContext } from "@/context/LocationContext";
import { useTenant } from "@/hooks/useTenant";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";

type Account = Tables<"accounts">;
type AccountWithBalance = Account & { currentBalance: number };

interface RecentTransactionsProps {
	accounts: AccountWithBalance[];
}

export function RecentTransactions({ accounts }: RecentTransactionsProps) {
	const { t } = useTranslation("common");
	const { selectedLocation } = useLocationContext();
	const { tenant } = useTenant();
	const [transactions, setTransactions] = useState<any[]>([]);
	const [loading, setLoading] = useState(true);

	const fetchTransactions = useCallback(async () => {
		// Don't fetch if no tenant or selected location
		if (!tenant?.id || !selectedLocation) {
			setTransactions([]);
			setLoading(false);
			return;
		}

		try {
			const [transfersResponse, incomeResponse, expensesResponse] =
				await Promise.all([
					// Account transfers - filter by tenant through accounts
					supabase
						.from("account_transfers")
						.select(
							"*, from_account:accounts!from_account_id(name, currency, tenant_id, location_access), to_account:accounts!to_account_id(name, currency, tenant_id, location_access)",
						)
						.or(
							`from_account.tenant_id.eq.${tenant.id},to_account.tenant_id.eq.${tenant.id}`,
						)
						.order("created_at", { ascending: false })
						.limit(10),
					// Income - filter by tenant and location
					supabase
						.from("income")
						.select("*, account:accounts(name, currency)")
						.eq("tenant_id", tenant.id)
						.eq("location_id", selectedLocation)
						.not("account_id", "is", null)
						.order("created_at", { ascending: false })
						.limit(10),
					// Expenses - filter by location and tenant through accounts
					supabase
						.from("expenses")
						.select("*, account:accounts(name, currency, tenant_id)")
						.eq("location_id", selectedLocation)
						.eq("account.tenant_id", tenant.id)
						.order("created_at", { ascending: false })
						.limit(10),
				]);

			// Filter account transfers to only include those where at least one account
			// has access to the selected location
			const filteredTransfers = (transfersResponse.data || []).filter(
				(transfer) => {
					const fromAccountAccess =
						transfer.from_account?.location_access || [];
					const toAccountAccess = transfer.to_account?.location_access || [];
					return (
						fromAccountAccess.includes(selectedLocation) ||
						toAccountAccess.includes(selectedLocation)
					);
				},
			);

			// Combine and format all transactions
			const allTransactions = [
				...filteredTransfers.map((transfer) => ({
					...transfer,
					type: "transfer",
					display_amount: transfer.amount,
					currency: transfer.from_account?.currency || "LKR",
					description: `${t("accounts.transactions.transfer")} from ${transfer.from_account?.name || "Unknown"} to ${transfer.to_account?.name || "Unknown"}`,
				})),
				...(incomeResponse.data || []).map((income) => ({
					...income,
					type: "income",
					display_amount: income.amount,
					currency: income.account?.currency || "LKR",
					description: `Income to ${income.account?.name || "Unknown"}`,
				})),
				...(expensesResponse.data || []).map((expense) => ({
					...expense,
					type: "expense",
					display_amount: expense.amount,
					currency: expense.account?.currency || "LKR",
					description: `Expense from ${expense.account?.name || "Unknown"}`,
				})),
			];

			// Sort by created_at descending
			allTransactions.sort(
				(a, b) =>
					new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
			);

			setTransactions(allTransactions.slice(0, 20)); // Show latest 20 transactions
		} catch (error) {
			console.error("Error fetching transactions:", error);
		} finally {
			setLoading(false);
		}
	}, [t, tenant?.id, selectedLocation]);

	useEffect(() => {
		fetchTransactions();
	}, [fetchTransactions]);

	const getTransactionIcon = (type: string) => {
		switch (type) {
			case "transfer":
				return <ArrowRightLeft className="size-4 text-blue-500" />;
			case "income":
				return <Plus className="size-4 text-green-500" />;
			case "expense":
				return <Trash2 className="size-4 text-red-500" />;
			default:
				return <ArrowRightLeft className="size-4 text-muted-foreground" />;
		}
	};

	const getTransactionColor = (type: string) => {
		switch (type) {
			case "income":
				return "text-green-600";
			case "expense":
				return "text-red-600";
			case "transfer":
				return "text-blue-600";
			default:
				return "text-muted-foreground";
		}
	};

	if (loading) {
		return (
			<div className="space-y-4">
				<h3 className="text-base md:text-lg lg:text-xl font-semibold">
					{t("accounts.transactions.title")}
				</h3>
				<RecentTransactionsSkeleton />
			</div>
		);
	}

	if (transactions.length === 0) {
		return (
			<div className="space-y-4">
				<h3 className="text-base md:text-lg lg:text-xl font-semibold">
					{t("accounts.transactions.title")}
				</h3>
				<div className="text-center py-8">
					<p className="text-muted-foreground">
						{t("accounts.transactions.noTransactions")}
					</p>
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-4">
			<h3 className="text-base md:text-lg lg:text-xl font-semibold">
				{t("accounts.transactions.title")}
			</h3>
			<div className="space-y-3">
				{transactions.map((transaction) => (
					<div
						key={`${transaction.type}-${transaction.id}`}
						className="p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors"
					>
						<div className="flex items-center justify-between mb-2">
							<div className="flex items-center gap-3">
								{getTransactionIcon(transaction.type)}
								<div>
									<div className="font-medium">{transaction.description}</div>
									<div className="text-sm text-muted-foreground capitalize">
										{t(`accounts.transactions.${transaction.type}`)}
									</div>
								</div>
							</div>
							<div className="text-right">
								<div
									className={`font-medium ${getTransactionColor(transaction.type)}`}
								>
									{transaction.type === "expense" ? "-" : "+"}
									{transaction.currency === "LKR" ? "Rs." : "$"}
									{transaction.display_amount.toLocaleString()}
								</div>
								{transaction.type === "transfer" &&
									transaction.conversion_rate !== 1 && (
										<div className="text-sm text-muted-foreground">
											Rate: {transaction.conversion_rate}
										</div>
									)}
							</div>
						</div>
						<div className="flex items-center justify-between text-sm text-muted-foreground">
							<span>
								{new Date(transaction.created_at).toLocaleDateString()}{" "}
								{new Date(transaction.created_at).toLocaleTimeString([], {
									hour: "2-digit",
									minute: "2-digit",
								})}
							</span>
							{(transaction.note || transaction.description_text) && (
								<span className="truncate ml-4 max-w-48">
									{transaction.note || transaction.description_text}
								</span>
							)}
						</div>
					</div>
				))}
			</div>
		</div>
	);
}

// Recent Transactions Skeleton Component
export function RecentTransactionsSkeleton() {
	return (
		<div className="space-y-3">
			{Array.from({ length: 8 }).map((_, index) => (
				<div key={index} className="p-4 border border-border rounded-lg">
					<div className="flex items-center justify-between mb-2">
						<div className="flex items-center gap-3">
							<div className="size-4 bg-muted rounded animate-pulse" />
							<div>
								<div className="h-4 bg-muted rounded w-48 animate-pulse mb-1" />
								<div className="h-3 bg-muted rounded w-16 animate-pulse" />
							</div>
						</div>
						<div className="text-right">
							<div className="h-4 bg-muted rounded w-20 animate-pulse mb-1" />
							<div className="h-3 bg-muted rounded w-12 animate-pulse" />
						</div>
					</div>
					<div className="flex items-center justify-between">
						<div className="h-3 bg-muted rounded w-24 animate-pulse" />
						<div className="h-3 bg-muted rounded w-32 animate-pulse" />
					</div>
				</div>
			))}
		</div>
	);
}
