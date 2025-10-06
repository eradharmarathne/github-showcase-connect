import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
	AccountForm,
	AccountGrid,
	AccountSummaryCards,
	AccountTransferForm,
	RecentTransactions,
} from "@/components/accounts";
import { AccountsSkeleton } from "@/components/skeleton/AccountsSkeleton";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useTenant } from "@/hooks/useTenant";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";

type Account = Tables<"accounts">;
type AccountWithBalance = Account & { currentBalance: number };

export default function Accounts() {
	const { t } = useTranslation("common");
	const { toast } = useToast();
	const { tenant } = useTenant();
	const queryClient = useQueryClient();

	const [showAddDialog, setShowAddDialog] = useState(false);
	const [showTransferDialog, setShowTransferDialog] = useState(false);
	const [editingAccount, setEditingAccount] = useState<Account | null>(null);

	// Fetch accounts with calculated balances
	const {
		data: accountsWithBalances = [],
		isLoading,
		error,
	} = useQuery({
		queryKey: ["accounts-with-balances", tenant?.id],
		queryFn: async (): Promise<AccountWithBalance[]> => {
			if (!tenant?.id) return [];

			// First get all accounts
			const { data: accounts, error: accountsError } = await supabase
				.from("accounts")
				.select("*")
				.eq("tenant_id", tenant.id)
				.order("created_at", { ascending: false });

			if (accountsError) throw accountsError;
			if (!accounts) return [];

			// Calculate balance for each account
			const accountsWithBalances: AccountWithBalance[] = [];

			for (const account of accounts) {
				// Fetch payments (income) for this account
				const { data: paymentsData } = await supabase
					.from("payments")
					.select("amount")
					.eq("account_id", account.id);

				// Fetch expenses for this account
				const { data: expensesData } = await supabase
					.from("expenses")
					.select("amount")
					.eq("account_id", account.id);

				// Fetch transfers from this account
				const { data: transfersFromData } = await supabase
					.from("account_transfers")
					.select("amount")
					.eq("from_account_id", account.id);

				// Fetch transfers to this account
				const { data: transfersToData } = await supabase
					.from("account_transfers")
					.select("amount, conversion_rate")
					.eq("to_account_id", account.id);

				// Calculate totals
				const totalPayments = (paymentsData || []).reduce(
					(sum, payment) => sum + Number(payment.amount),
					0,
				);
				const totalExpenses = (expensesData || []).reduce(
					(sum, expense) => sum + Number(expense.amount),
					0,
				);
				const transfersOut = (transfersFromData || []).reduce(
					(sum, transfer) => sum + Number(transfer.amount),
					0,
				);
				const transfersIn = (transfersToData || []).reduce(
					(sum, transfer) =>
						sum + Number(transfer.amount) * Number(transfer.conversion_rate),
					0,
				);

				// Calculate current balance: initial + payments - expenses - transfersOut + transfersIn
				const currentBalance =
					account.initial_balance +
					totalPayments -
					totalExpenses -
					transfersOut +
					transfersIn;

				accountsWithBalances.push({
					...account,
					currentBalance,
				});
			}

			return accountsWithBalances;
		},
		enabled: !!tenant?.id,
	});

	// Fetch locations for form
	const { data: locations = [] } = useQuery({
		queryKey: ["locations", tenant?.id],
		queryFn: async () => {
			if (!tenant?.id) return [];

			const { data, error } = await supabase
				.from("locations")
				.select("*")
				.eq("tenant_id", tenant.id)
				.eq("is_active", true);

			if (error) throw error;
			return data;
		},
		enabled: !!tenant?.id,
	});

	const handleAccountSaved = () => {
		queryClient.invalidateQueries({ queryKey: ["accounts-with-balances"] });
		setShowAddDialog(false);
		setEditingAccount(null);
		toast({
			title: t("common.success"),
			description: t("accounts.form.messages.createSuccess"),
		});
	};

	const handleAccountDeleted = (accountId: string) => {
		queryClient.invalidateQueries({ queryKey: ["accounts-with-balances"] });
		toast({
			title: t("common.success"),
			description: t("accounts.form.messages.deleteSuccess"),
		});
	};

	const handleTransferCompleted = () => {
		queryClient.invalidateQueries({ queryKey: ["accounts-with-balances"] });
		setShowTransferDialog(false);
		toast({
			title: t("common.success"),
			description: t("accounts.transfer.messages.success"),
		});
	};

	const handleEditAccount = (account: Account) => {
		setEditingAccount(account);
		setShowAddDialog(true);
	};

	if (isLoading) {
		return <AccountsSkeleton />;
	}

	if (error) {
		return (
			<div className="container mx-auto p-6">
				<div className="text-center py-8">
					<p className="text-destructive">
						{t("accounts.errorLoading")}: {error.message}
					</p>
				</div>
			</div>
		);
	}

	return (
		<div className="container mx-auto pb-20 sm:pb-8 px-4 sm:px-6 md:px-8 py-6 space-y-6">
			<div className="flex flex-col sm:flex-row gap-2 justify-between items-start sm:items-center">
				<h1 className="text-xl md:text-2xl lg:text-3xl font-bold">
					{t("accounts.title")}
				</h1>
				<div className="flex gap-2">
					<Button
						onClick={() => setShowTransferDialog(true)}
						variant="outline"
						disabled={accountsWithBalances.length < 2}
					>
						{t("accounts.buttons.transferMoney")}
					</Button>
					<Button onClick={() => setShowAddDialog(true)}>
						<Plus className="size-4 mr-2" />
						{t("accounts.buttons.addAccount")}
					</Button>
				</div>
			</div>

			<AccountSummaryCards accounts={accountsWithBalances} />

			<Tabs defaultValue="accounts" className="space-y-4">
				<TabsList className="w-full max-w-md border-b">
					<TabsTrigger value="accounts">
						{t("accounts.tabs.accounts")}
					</TabsTrigger>
					<TabsTrigger value="transactions">
						{t("accounts.tabs.transactions")}
					</TabsTrigger>
				</TabsList>

				<TabsContent value="accounts" className="space-y-4">
					<AccountGrid
						accounts={accountsWithBalances}
						onEdit={handleEditAccount}
						onDelete={handleAccountDeleted}
					/>
				</TabsContent>

				<TabsContent value="transactions">
					<RecentTransactions accounts={accountsWithBalances} />
				</TabsContent>
			</Tabs>

			{/* Add/Edit Account Dialog */}
			<AccountForm
				open={showAddDialog}
				onOpenChange={setShowAddDialog}
				account={editingAccount}
				locations={locations}
				onSaved={handleAccountSaved}
			/>

			{/* Transfer Dialog */}
			<AccountTransferForm
				open={showTransferDialog}
				onOpenChange={setShowTransferDialog}
				accounts={accountsWithBalances.map(
					({ currentBalance, ...account }) => account,
				)}
				onTransferCompleted={handleTransferCompleted}
			/>
		</div>
	);
}
