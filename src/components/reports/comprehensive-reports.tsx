import { Download } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ComprehensiveReportsSkeleton } from "@/components/reports";
import { AccountDetails } from "@/components/reports/comprehensive/AccountDetails";
import { FinancialSummaryCards } from "@/components/reports/comprehensive/FinancialSummaryCards";
import { ReportFilters } from "@/components/reports/comprehensive/ReportFilters";
import { useLocationContext } from "@/context/location-context";
import { useTenant } from "@/hooks/use-tenant";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/utils/currency";

export default function ComprehensiveReports() {
	const { t } = useTranslation();
	const { tenant } = useTenant();
	const { selectedLocation } = useLocationContext();
	const [dateFrom, setDateFrom] = useState("");
	const [dateTo, setDateTo] = useState("");
	const [baseCurrency, setBaseCurrency] = useState<string>("LKR");

	const exportToCSV = async () => {
		if (!tenant?.id) return;

		try {
			// Fetch accounts data for export
			const { data: accountsData, error } = await supabase
				.from("accounts")
				.select("*")
				.eq("tenant_id", tenant.id)
				.order("name");

			if (error) throw error;

			const csvContent = [
				[
					"Account",
					"Currency",
					"Initial Balance",
					"Current Balance",
					"Total Expenses",
					"Total Payments",
					"Net Change",
				],
				...accountsData.map((acc: any) => [
					acc.name,
					acc.currency,
					acc.initial_balance,
					acc.current_balance,
					0, // Will be calculated in real implementation
					0, // Will be calculated in real implementation
					acc.current_balance - acc.initial_balance,
				]),
			]
				.map((row) => row.join(","))
				.join("\n");

			const blob = new Blob([csvContent], { type: "text/csv" });
			const url = window.URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = `comprehensive-financial-report-${new Date().toISOString().split("T")[0]}.csv`;
			a.click();
			window.URL.revokeObjectURL(url);
		} catch (error) {
			console.error("Error exporting CSV:", error);
		}
	};

	const handleRefresh = () => {
		// This will trigger re-renders in child components due to dependency changes
		window.location.reload();
	};

	if (!tenant?.id) {
		return <ComprehensiveReportsSkeleton />;
	}

	return (
		<div className="space-y-6 px-0 sm:px-4 md:px-6">
			{/* Filters */}
			<ReportFilters
				dateFrom={dateFrom}
				setDateFrom={setDateFrom}
				dateTo={dateTo}
				setDateTo={setDateTo}
				baseCurrency={baseCurrency}
				setBaseCurrency={setBaseCurrency}
				onRefresh={handleRefresh}
				onExport={exportToCSV}
			/>

			{/* Financial Summary */}
			<FinancialSummaryCards
				baseCurrency={baseCurrency}
				dateFrom={dateFrom}
				dateTo={dateTo}
			/>

			{/* Account Details */}
			<AccountDetails
				baseCurrency={baseCurrency}
				dateFrom={dateFrom}
				dateTo={dateTo}
			/>
		</div>
	);
}
