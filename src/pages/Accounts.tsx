import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { AccountsSkeleton } from "@/components/AccountsSkeleton";
import {
	AccountForm,
	AccountGrid,
	AccountSummaryCards,
	AccountTransferForm,
	RecentTransactions,
} from "@/components/accounts";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useTenant } from "@/hooks/useTenant";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";

type Account = Tables<"accounts">;

export default function Accounts() {
	const { t } = useTranslation("common");
	const { toast } = useToast();
	const { tenant } = useTenant();
	const queryClient = useQueryClient();

	const [showAddDialog, setShowAddDialog] = useState(false);
	const [showTransferDialog, setShowTransferDialog] = useState(false);
	const [editingAccount, setEditingAccount] = useState<Account | null>(null);

	// Fetch accounts
	const {
		data: accounts = [],
		isLoading,
		error,
	} = useQuery({
		queryKey: ["accounts", tenant?.id],
		queryFn: async () => {
			if (!tenant?.id) return [];

			const { data, error } = await supabase
				.from("accounts")
				.select("*")
				.eq("tenant_id", tenant.id)
				.order("created_at", { ascending: false });

			if (error) throw error;
			return data;
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
		queryClient.invalidateQueries({ queryKey: ["accounts"] });
		setShowAddDialog(false);
		setEditingAccount(null);
		toast({
			title: t("common.success"),
			description: t("accounts.form.messages.createSuccess"),
		});
	};

	const handleAccountDeleted = (accountId: string) => {
		queryClient.invalidateQueries({ queryKey: ["accounts"] });
		toast({
			title: t("common.success"),
			description: t("accounts.form.messages.deleteSuccess"),
		});
	};

	const handleTransferCompleted = () => {
		queryClient.invalidateQueries({ queryKey: ["accounts"] });
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
		<div className="container mx-auto px-2 sm:px-4 py-6 space-y-6">
			<div className="flex justify-between items-center">
				<h1 className="text-2xl font-bold">{t("accounts.title")}</h1>
				<div className="flex gap-2">
					<Button
						onClick={() => setShowTransferDialog(true)}
						variant="outline"
						disabled={accounts.length < 2}
					>
						{t("accounts.buttons.transferMoney")}
					</Button>
					<Button onClick={() => setShowAddDialog(true)}>
						<Plus className="size-4 mr-2" />
						{t("accounts.buttons.addAccount")}
					</Button>
				</div>
			</div>

			<AccountSummaryCards accounts={accounts} />

			<Tabs defaultValue="accounts" className="space-y-4">
				<TabsList>
					<TabsTrigger value="accounts">
						{t("accounts.tabs.accounts")}
					</TabsTrigger>
					<TabsTrigger value="transactions">
						{t("accounts.tabs.transactions")}
					</TabsTrigger>
				</TabsList>

				<TabsContent value="accounts" className="space-y-4">
					<AccountGrid
						accounts={accounts}
						onEdit={handleEditAccount}
						onDelete={handleAccountDeleted}
					/>
				</TabsContent>

				<TabsContent value="transactions">
					<RecentTransactions accounts={accounts} />
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
				accounts={accounts}
				onTransferCompleted={handleTransferCompleted}
			/>
		</div>
	);
}
