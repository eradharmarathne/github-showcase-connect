import { CreditCard, DollarSign, TrendingDown, TrendingUp } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { useLocationContext } from "@/context/location-context";
import { useTenant } from "@/hooks/use-tenant";
import { supabase } from "@/integrations/supabase/client";
import { convertCurrency, formatCurrency } from "@/utils/currency";

type FinancialSummary = {
	totalExpenses: number;
	totalPayments: number;
	netProfit: number;
	profitMargin: number;
	totalTransactions: number;
};

interface FinancialSummaryCardsProps {
	baseCurrency: string;
	dateFrom?: string;
	dateTo?: string;
}

export function FinancialSummaryCards({
	baseCurrency,
	dateFrom,
	dateTo,
}: FinancialSummaryCardsProps) {
	const { t } = useTranslation();
	const { tenant } = useTenant();
	const { selectedLocation } = useLocationContext();
	const [summary, setSummary] = useState<FinancialSummary>({
		totalExpenses: 0,
		totalPayments: 0,
		netProfit: 0,
		profitMargin: 0,
		totalTransactions: 0,
	});
	const [loading, setLoading] = useState(true);

	const fetchFinancialSummary = useCallback(async () => {
		if (!tenant?.id) return;

		setLoading(true);
		try {
			// Fetch all accounts for this tenant
			const { data: accountsData, error: accountsError } = await supabase
				.from("accounts")
				.select("*")
				.eq("tenant_id", tenant.id);

			if (accountsError) throw accountsError;

			let totalExpenses = 0;
			let totalPayments = 0;
			let totalTransactions = 0;

			for (const account of accountsData || []) {
				// Fetch expenses for this account
				let expensesQuery = supabase
					.from("expenses")
					.select("amount, currency")
					.eq("account_id", account.id);

				if (selectedLocation) {
					expensesQuery = expensesQuery.eq("location_id", selectedLocation);
				}
				if (dateFrom) {
					expensesQuery = expensesQuery.gte("date", dateFrom);
				}
				if (dateTo) {
					expensesQuery = expensesQuery.lte("date", dateTo);
				}

				// Fetch payments for this account
				let paymentsQuery = supabase
					.from("payments")
					.select("amount, currency, reservations!inner(tenant_id)")
					.eq("account_id", account.id)
					.eq("reservations.tenant_id", tenant.id);

				if (selectedLocation) {
					paymentsQuery = paymentsQuery.eq(
						"reservations.location_id",
						selectedLocation,
					);
				}
				if (dateFrom) {
					paymentsQuery = paymentsQuery.gte("created_at", dateFrom);
				}
				if (dateTo) {
					paymentsQuery = paymentsQuery.lte("created_at", dateTo);
				}

				const [expensesResult, paymentsResult] = await Promise.all([
					expensesQuery,
					paymentsQuery,
				]);

				if (expensesResult.error) throw expensesResult.error;
				if (paymentsResult.error) throw paymentsResult.error;

				// Convert and sum expenses
				for (const expense of expensesResult.data || []) {
					const convertedAmount = await convertCurrency(
						parseFloat(expense.amount.toString()),
						expense.currency as any,
						baseCurrency,
						tenant.id,
						selectedLocation!,
					);
					totalExpenses += convertedAmount;
					totalTransactions++;
				}

				// Convert and sum payments
				for (const payment of paymentsResult.data || []) {
					const convertedAmount = await convertCurrency(
						parseFloat(payment.amount.toString()),
						payment.currency as any,
						baseCurrency,
						tenant.id,
						selectedLocation!,
					);
					totalPayments += convertedAmount;
					totalTransactions++;
				}
			}

			const netProfit = totalPayments - totalExpenses;
			const profitMargin =
				totalPayments > 0 ? (netProfit / totalPayments) * 100 : 0;

			setSummary({
				totalExpenses,
				totalPayments,
				netProfit,
				profitMargin,
				totalTransactions,
			});
		} catch (error) {
			console.error("Error fetching financial summary:", error);
		} finally {
			setLoading(false);
		}
	}, [tenant?.id, selectedLocation, dateFrom, dateTo, baseCurrency]);

	useEffect(() => {
		if (tenant?.id) {
			fetchFinancialSummary();
		}
	}, [fetchFinancialSummary, tenant?.id]);

	if (loading) {
		return (
			<div className="grid grid-cols-1 md:grid-cols-4 gap-6">
				{[...Array(4)].map((_, i) => (
					<Card key={i} className="animate-pulse">
						<CardContent className="p-3 sm:p-4 md:p-6">
							<div className="h-16 bg-gray-200 rounded"></div>
						</CardContent>
					</Card>
				))}
			</div>
		);
	}

	return (
		<div
			className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
			data-testid="financial-summary-cards"
		>
			<Card className="bg-green-50 border-green-200">
				<CardContent className="p-1 sm:p-2 lg:p-4">
					<div className="flex items-center justify-between">
						<div>
							<p className="text-xs sm:text-sm font-medium text-green-600">
								{t("reports.comprehensive.summary.totalIncome")}
							</p>
							<p className="text-sm sm:text-base lg:text-lg font-bold text-green-900">
								{formatCurrency(summary.totalPayments, baseCurrency)}
							</p>
						</div>
					</div>
				</CardContent>
			</Card>

			<Card className="bg-blue-50 border-blue-200">
				<CardContent className="p-1 sm:p-2 lg:p-4">
					<div className="flex items-center justify-between">
						<div>
							<p className="text-xs sm:text-sm font-medium text-blue-600">
								{t("reports.comprehensive.summary.reservationPayments")}
							</p>
							<p className="text-sm sm:text-base lg:text-lg font-bold text-blue-900">
								{formatCurrency(summary.totalPayments, baseCurrency)}
							</p>
						</div>
					</div>
				</CardContent>
			</Card>

			<Card className="bg-red-50 border-red-200">
				<CardContent className="p-1 sm:p-2 lg:p-4">
					<div className="flex items-center justify-between">
						<div>
							<p className="text-xs sm:text-sm font-medium text-red-600">
								{t("reports.comprehensive.summary.totalExpenses")}
							</p>
							<p className="text-sm sm:text-base lg:text-lg font-bold text-red-900">
								{formatCurrency(summary.totalExpenses, baseCurrency)}
							</p>
						</div>
					</div>
				</CardContent>
			</Card>

			<Card
				className={`${summary.netProfit >= 0 ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"}`}
			>
				<CardContent className="p-1 sm:p-2 lg:p-4">
					<div className="flex items-center justify-between">
						<div>
							<p
								className={`text-xs sm:text-sm font-medium ${summary.netProfit >= 0 ? "text-emerald-600" : "text-red-600"}`}
							>
								{t("reports.comprehensive.summary.netProfit")}
							</p>
							<p
								className={`text-sm sm:text-base lg:text-lg font-bold ${summary.netProfit >= 0 ? "text-emerald-900" : "text-red-900"}`}
							>
								{formatCurrency(summary.netProfit, baseCurrency)}
							</p>
							<p
								className={`text-xs sm:text-sm ${summary.netProfit >= 0 ? "text-emerald-600" : "text-red-600"}`}
							>
								{summary.profitMargin.toFixed(1)}% margin
							</p>
						</div>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
