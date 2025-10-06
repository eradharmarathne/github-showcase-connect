import { Badge } from "@/components/ui/badge";
import {
	Card,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { type Currency, formatCurrency } from "@/utils/currency";

export type AccountDetail = {
	id: string;
	name: string;
	currency: string;
	initial_balance: number;
	current_balance: number;
	total_income: number;
	total_expenses: number;
	total_transfers: number;
	transaction_count: number;
	transactions: any[];
};

type AccountDetailsListProps = {
	accounts: AccountDetail[];
	baseCurrency: Currency;
};

export function AccountDetailsList({
	accounts,
	baseCurrency,
}: AccountDetailsListProps) {
	return (
		<div>
			<h3 className="text-base md:text-lg lg:text-xl font-semibold text-green-600 mb-4">
				Account Details
			</h3>
			<div className="space-y-4">
				{accounts.map((account) => (
					<Card
						key={account.id}
						className="border-l-2 sm:border-l-4 border-l-primary"
					>
						<CardHeader className="pb-3">
							<div className="flex flex-col sm:flex-row items-start sm:items-center justify-between">
								<div>
									<CardTitle className="text-base md:text-lg lg:text-xl font-bold">
										{account.name}
									</CardTitle>
									<CardDescription>
										<Badge variant="outline" className="mr-2">
											{account.currency} Account
										</Badge>
										{account.transaction_count} transactions
									</CardDescription>
								</div>
								<div className="text-right">
									<p className="text-lg sm:text-2xl font-bold">
										{formatCurrency(account.current_balance, baseCurrency)}
									</p>
								</div>
							</div>
						</CardHeader>
					</Card>
				))}
			</div>
		</div>
	);
}
