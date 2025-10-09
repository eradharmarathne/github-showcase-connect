import { Tables } from "@/integrations/supabase/types";
import { AccountCard } from "./AccountCard";

type Account = Tables<"accounts">;
type AccountWithBalance = Account & { currentBalance: number };

interface AccountGridProps {
	accounts: AccountWithBalance[];
	onEdit: (account: Account) => void;
	onDelete: (accountId: string) => void;
}

export function AccountGrid({ accounts, onEdit, onDelete }: AccountGridProps) {
	return (
		<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
			{accounts.map((account) => (
				<AccountCard
					key={account.id}
					account={account}
					balance={account.currentBalance} // Use calculated current balance
					onEdit={onEdit}
					onDelete={onDelete}
				/>
			))}
		</div>
	);
}
