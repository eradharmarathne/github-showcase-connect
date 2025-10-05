import { useEffect, useState } from "react";
import { type Currency } from "@/utils/currency";
import { useAccountData } from "./detailed-balance/useAccountData";
import { BalanceSheetHeader, exportBalanceSheetToCSV } from "./detailed-balance/BalanceSheetHeader";
import { AccountSummaryCard } from "./detailed-balance/AccountSummaryCard";
import { TransactionHistoryCard, type TransactionWithBalance } from "./detailed-balance/TransactionHistoryCard";
import { AccountDetailsList, type AccountDetail } from "./detailed-balance/AccountDetailsList";

export default function DetailedBalanceSheet() {
	const [accounts, setAccounts] = useState<AccountDetail[]>([]);
	const [allTransactions, setAllTransactions] = useState<TransactionWithBalance[]>([]);
	const [loading, setLoading] = useState(true);
	const [baseCurrency, setBaseCurrency] = useState<Currency>("LKR");
	const [accountSummary, setAccountSummary] = useState({
		totalInitialBalance: 0,
		totalCurrentBalance: 0,
		totalIncome: 0,
		totalExpenses: 0,
	});

	const { fetchAccountDetails } = useAccountData(baseCurrency);

	useEffect(() => {
		async function loadAccountDetails() {
			setLoading(true);
			const result = await fetchAccountDetails();
			if (result) {
				setAccounts(result.accounts);
				setAllTransactions(result.allTransactions);
				setAccountSummary(result.accountSummary);
			}
			setLoading(false);
		}

		loadAccountDetails();
	}, [fetchAccountDetails]);

	const handleExport = () => {
		exportBalanceSheetToCSV(accounts);
	};

	if (loading) {
		return null;
	}

	return (
		<div className="space-y-6 px-4">
			<BalanceSheetHeader
				baseCurrency={baseCurrency}
				onCurrencyChange={setBaseCurrency}
				onExport={handleExport}
			/>

			<AccountSummaryCard
				totalInitialBalance={accountSummary.totalInitialBalance}
				totalIncome={accountSummary.totalIncome}
				totalExpenses={accountSummary.totalExpenses}
				totalCurrentBalance={accountSummary.totalCurrentBalance}
				baseCurrency={baseCurrency}
			/>

			<TransactionHistoryCard
				transactions={allTransactions}
				baseCurrency={baseCurrency}
			/>

			<AccountDetailsList
				accounts={accounts}
				baseCurrency={baseCurrency}
			/>
		</div>
	);
}
