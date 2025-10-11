import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
	AccountDeleteDialog,
	AccountForm,
	AccountGrid,
	AccountSummaryCards,
	AccountTransferForm,
	RecentTransactions,
} from "@/components/accounts";
import { AccountsSkeleton } from "@/components/skeleton";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTenant } from "@/hooks/use-tenant";
import { useToast } from "@/hooks/use-toast";
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
	const [showDeleteDialog, setShowDeleteDialog] = useState(false);
	const [editingAccount, setEditingAccount] = useState<Account | null>(null);
	const [deletingAccount, setDeletingAccount] = useState<{
		id: string;
		name: string;
	} | null>(null);

	// Fetch accounts and map current_balance to currentBalance for component compatibility
	const {
		data: accountsWithBalances = [],
		isLoading,
		error,
	} = useQuery({
		queryKey: ["accounts", tenant?.id],
		queryFn: async (): Promise<AccountWithBalance[]> => {
			if (!tenant?.id) return [];

			const { data: accounts, error: accountsError } = await supabase
				.from("accounts")
				.select("*")
				.eq("tenant_id", tenant.id)
				.order("created_at", { ascending: false });

			if (accountsError) throw accountsError;

			// Map current_balance to currentBalance for component compatibility
			return (accounts || []).map((account) => ({
				...account,
				currentBalance: Number(account.current_balance),
			}));
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

	const handleAccountDeleted = async (accountId: string) => {
		// Find the account to get its name
		const account = accountsWithBalances.find((acc) => acc.id === accountId);
		if (!account) {
			toast({
				title: t("common.error"),
				description: "Account not found",
				variant: "destructive",
			});
			return;
		}

		try {
			// First check if account has any related transactions using our RPC function
			const { data: transactionCheck, error: checkError } = await supabase.rpc(
				"check_account_transactions",
				{
					account_id: accountId,
					tenant_id: tenant?.id,
				},
			);

			if (checkError) {
				console.error("Error checking account transactions:", checkError);
				toast({
					title: t("common.error"),
					description: "Error checking account transactions. Please try again.",
					variant: "destructive",
				});
				return;
			}

			// Parse the JSON response
			const result =
				typeof transactionCheck === "string"
					? JSON.parse(transactionCheck)
					: transactionCheck;

			if (result?.error) {
				toast({
					title: t("common.error"),
					description: result.error,
					variant: "destructive",
				});
				return;
			}

			if (result?.has_transactions) {
				const counts = result.transaction_counts;
				const details = [];
				if (counts.income > 0)
					details.push(`${counts.income} income transactions`);
				if (counts.expenses > 0)
					details.push(`${counts.expenses} expense transactions`);
				if (counts.transfers > 0)
					details.push(`${counts.transfers} transfer transactions`);

				toast({
					title: t("common.error"),
					description: `Cannot delete account "${result.account_name}". It has ${details.join(", ")}. Please remove all transactions first.`,
					variant: "destructive",
				});
				return;
			}

			// Show confirmation dialog
			setDeletingAccount({ id: accountId, name: account.name });
			setShowDeleteDialog(true);
		} catch (error) {
			console.error("Error preparing account deletion:", error);
			toast({
				title: t("common.error"),
				description:
					"An error occurred while checking the account. Please try again.",
				variant: "destructive",
			});
		}
	};

	const handleConfirmDeleteAccount = async () => {
		if (!deletingAccount) return;

		try {
			// Proceed with deletion
			const { error: deleteError } = await supabase
				.from("accounts")
				.delete()
				.eq("id", deletingAccount.id)
				.eq("tenant_id", tenant?.id);

			if (deleteError) {
				throw deleteError;
			}

			queryClient.invalidateQueries({ queryKey: ["accounts-with-balances"] });
			queryClient.invalidateQueries({ queryKey: ["accounts"] });
			toast({
				title: t("common.success"),
				description: `Account "${deletingAccount.name}" has been successfully deleted.`,
			});
		} catch (error) {
			console.error("Error deleting account:", error);
			toast({
				title: t("common.error"),
				description:
					"An error occurred while deleting the account. Please try again.",
				variant: "destructive",
			});
		} finally {
			setDeletingAccount(null);
		}
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
				<TabsList className="w-full justify-between">
					<TabsTrigger value="accounts" className="w-full">
						{t("accounts.tabs.accounts")}
					</TabsTrigger>
					<TabsTrigger value="transactions" className="w-full">
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

			{/* Delete Confirmation Dialog */}
			<AccountDeleteDialog
				open={showDeleteDialog}
				onOpenChange={setShowDeleteDialog}
				accountName={deletingAccount?.name || ""}
				onConfirm={handleConfirmDeleteAccount}
			/>
		</div>
	);
}
