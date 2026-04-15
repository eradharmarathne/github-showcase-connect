import {
	ArrowDownLeft,
	ArrowRightLeft,
	ArrowUpRight,
	Receipt,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocationContext } from "@/context/location-context";
import { useTenant } from "@/hooks/use-tenant";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import { getCurrencySymbol } from "@/utils/currency";

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

	const accountIds = accounts.map((a) => a.id);

	const fetchTransactions = useCallback(async () => {
		if (!tenant?.id || !selectedLocation || accountIds.length === 0) {
			setTransactions([]);
			setLoading(false);
			return;
		}

		try {
			const [
				transfersResponse,
				paymentsResponse,
				incomeResponse,
				expensesResponse,
			] = await Promise.all([
				supabase
					.from("account_transfers")
					.select(
						"*, from_account:accounts!from_account_id(name, currency, location_access), to_account:accounts!to_account_id(name, currency, location_access)",
					)
					.eq("tenant_id", tenant.id)
					.order("created_at", { ascending: false })
					.limit(20),
				supabase
					.from("payments")
					.select(
						"id, amount, currency, created_at, payment_type, notes, account_id, reservations!inner(guest_name, reservation_number, tenant_id, location_id)",
					)
					.eq("reservations.tenant_id", tenant.id)
					.eq("reservations.location_id", selectedLocation)
					.in("account_id", accountIds)
					.order("created_at", { ascending: false })
					.limit(20),
				supabase
					.from("income")
					.select("id, amount, currency, date, type, note, account_id")
					.eq("tenant_id", tenant.id)
					.eq("location_id", selectedLocation)
					.in("account_id", accountIds)
					.neq("type", "booking")
					.order("date", { ascending: false })
					.limit(20),
				supabase
					.from("expenses")
					.select(
						"id, amount, currency, date, main_type, sub_type, note, account_id",
					)
					.eq("tenant_id", tenant.id)
					.eq("location_id", selectedLocation)
					.in("account_id", accountIds)
					.order("date", { ascending: false })
					.limit(20),
			]);

			const allTransactions: any[] = [];
			const accountMap = new Map(accounts.map((a) => [a.id, a]));

			// Format transfers
			const filteredTransfers = (transfersResponse.data || []).filter(
				(transfer) => {
					const fromAccess =
						transfer.from_account?.location_access || [];
					const toAccess = transfer.to_account?.location_access || [];
					return (
						fromAccess.includes(selectedLocation) ||
						toAccess.includes(selectedLocation)
					);
				},
			);
			for (const transfer of filteredTransfers) {
				allTransactions.push({
					id: transfer.id,
					type: "transfer",
					display_amount: transfer.amount,
					currency: transfer.from_account?.currency || "LKR",
					created_at: transfer.created_at,
					description: `${t("accounts.transactions.transfer")} from ${transfer.from_account?.name || "Unknown"} to ${transfer.to_account?.name || "Unknown"}`,
					note: transfer.note,
					conversion_rate: transfer.conversion_rate,
				});
			}

			// Format payments
			for (const payment of paymentsResponse.data || []) {
				const acc = accountMap.get(payment.account_id);
				const res = payment.reservations as any;
				allTransactions.push({
					id: payment.id,
					type: "payment",
					display_amount: payment.amount,
					currency: payment.currency || acc?.currency || "LKR",
					created_at: payment.created_at,
					description: `${res?.guest_name || "Guest"} (${res?.reservation_number || "N/A"})`,
					note: payment.notes,
					account_name: acc?.name,
				});
			}

			// Format non-booking income
			for (const inc of incomeResponse.data || []) {
				const acc = accountMap.get(inc.account_id!);
				allTransactions.push({
					id: inc.id,
					type: "income",
					display_amount: inc.amount,
					currency: inc.currency || acc?.currency || "LKR",
					created_at: inc.date,
					description: `${inc.type} income`,
					note: inc.note,
					account_name: acc?.name,
				});
			}

			// Format expenses
			for (const exp of expensesResponse.data || []) {
				const acc = accountMap.get(exp.account_id);
				allTransactions.push({
					id: exp.id,
					type: "expense",
					display_amount: exp.amount,
					currency: exp.currency || acc?.currency || "LKR",
					created_at: exp.date,
					description: `${exp.main_type} - ${exp.sub_type}`,
					note: exp.note,
					account_name: acc?.name,
				});
			}

			allTransactions.sort(
				(a, b) =>
					new Date(b.created_at).getTime() -
					new Date(a.created_at).getTime(),
			);

			setTransactions(allTransactions.slice(0, 30));
		} catch (error) {
			console.error("Error fetching transactions:", error);
		} finally {
			setLoading(false);
		}
	}, [t, tenant?.id, selectedLocation, accountIds.join(",")]);

	useEffect(() => {
		fetchTransactions();
	}, [fetchTransactions]);

	const getTransactionIcon = (type: string) => {
		switch (type) {
			case "payment":
			case "income":
				return <ArrowUpRight className="size-4 text-green-500" />;
			case "expense":
				return <ArrowDownLeft className="size-4 text-red-500" />;
			case "transfer":
				return <ArrowRightLeft className="size-4 text-blue-500" />;
			default:
				return <Receipt className="size-4 text-gray-500" />;
		}
	};

	const getTransactionColor = (type: string) => {
		switch (type) {
			case "payment":
			case "income":
				return "text-green-600";
			case "expense":
				return "text-red-600";
			case "transfer":
				return "text-blue-600";
			default:
				return "text-foreground";
		}
	};

	const getAmountPrefix = (type: string) => {
		switch (type) {
			case "payment":
			case "income":
				return "+";
			case "expense":
				return "-";
			default:
				return "";
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
										{transaction.type === "payment"
											? t("accounts.transactions.payment", {
													defaultValue: "Payment",
												})
											: transaction.type === "income"
												? t("accounts.transactions.income", {
														defaultValue: "Income",
													})
												: transaction.type === "expense"
													? t("accounts.transactions.expense", {
															defaultValue: "Expense",
														})
													: t("accounts.transactions.transfer")}
										{transaction.account_name &&
											` · ${transaction.account_name}`}
									</div>
								</div>
							</div>
							<div className="text-right">
								<div
									className={`font-medium ${getTransactionColor(transaction.type)}`}
								>
									{getAmountPrefix(transaction.type)}
									{getCurrencySymbol(transaction.currency)}
									{Number(transaction.display_amount).toLocaleString()}
								</div>
								{transaction.conversion_rate &&
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
							{transaction.note && (
								<span className="truncate ml-4 max-w-48">
									{transaction.note}
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
