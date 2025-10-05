import {
	BarChart3,
	CreditCard,
	Download,
	Filter,
	Percent,
	RefreshCw,
	TrendingUp,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router";
import {
	AccountsReports,
	CommissionReports,
	ComprehensiveReports,
	EnhancedFinancialReports,
} from "@/components/reports";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Reports() {
	const { t } = useTranslation();
	const [searchParams, setSearchParams] = useSearchParams();
	const activeTab = searchParams.get("tab") || "comprehensive";

	return (
		<div className="max-w-full pb-20 w-full mx-auto p-2 lg:p-6 space-y-4 animate-fade-in">
			{/* Reports Content */}
			<Card className="bg-card border">
				<CardHeader className="pb-3">
					<div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
						<div>
							<CardTitle className="text-base font-semibold">
								{t("reports.title")}
							</CardTitle>
							<CardDescription className="text-xs lg:text-sm">
								{t("reports.subtitle")}
							</CardDescription>
						</div>
						<div className="flex gap-2 w-full sm:w-auto">
							<Button
								variant="outline"
								size="sm"
								className="flex-1 sm:flex-none"
							>
								<Filter className="size-4 mr-2" />
								<span className="hidden sm:inline">{t("reports.buttons.filter")}</span>
							</Button>
							<Button
								variant="outline"
								size="sm"
								className="flex-1 sm:flex-none"
							>
								<Download className="size-4 mr-2" />
								<span className="hidden sm:inline">{t("reports.buttons.export")}</span>
							</Button>
							<Button
								variant="outline"
								size="sm"
								className="flex-1 sm:flex-none"
							>
								<RefreshCw className="size-4 mr-2" />
								<span className="hidden sm:inline">{t("reports.buttons.refresh")}</span>
							</Button>
						</div>
					</div>
				</CardHeader>

				<CardContent className="p-0">
					<Tabs
						value={activeTab}
						onValueChange={(value) => setSearchParams({ tab: value })}
						className="w-full"
					>
						{/* Mobile Tab Navigation */}
						<div className="lg:hidden px-4 pb-4">
							<TabsList className="grid w-full grid-cols-2 gap-2 h-auto p-0 bg-transparent">
								<TabsTrigger
									value="comprehensive"
									className="flex flex-col items-center gap-1 p-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
								>
									<BarChart3 className="size-4" />
									<span className="text-xs">{t("reports.tabs.mobile.overview")}</span>
								</TabsTrigger>
								<TabsTrigger
									value="detailed"
									className="flex flex-col items-center gap-1 p-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
								>
									<TrendingUp className="size-4" />
									<span className="text-xs">{t("reports.tabs.mobile.detailed")}</span>
								</TabsTrigger>
							</TabsList>

							<TabsList className="grid w-full grid-cols-2 gap-2 h-auto p-0 bg-transparent mt-2">
								<TabsTrigger
									value="accounts"
									className="flex flex-col items-center gap-1 p-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
								>
									<CreditCard className="size-4" />
									<span className="text-xs">{t("reports.tabs.mobile.accounts")}</span>
								</TabsTrigger>
								<TabsTrigger
									value="commission"
									className="flex flex-col items-center gap-1 p-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
								>
									<Percent className="size-4" />
									<span className="text-xs">{t("reports.tabs.mobile.commission")}</span>
								</TabsTrigger>
							</TabsList>
						</div>

						{/* Desktop Tab Navigation */}
						<div className="hidden lg:block px-6 pb-4">
							<TabsList className="grid w-full grid-cols-4 h-12">
								<TabsTrigger
									value="comprehensive"
									className="flex items-center gap-2 text-md"
								>
									<BarChart3 className="size-4" />
									{t("reports.tabs.desktop.financialOverview")}
								</TabsTrigger>
								<TabsTrigger
									value="detailed"
									className="flex items-center gap-2 text-md"
								>
									<TrendingUp className="size-4" />
									{t("reports.tabs.desktop.detailedReports")}
								</TabsTrigger>
								<TabsTrigger
									value="accounts"
									className="flex items-center gap-2 text-md"
								>
									<CreditCard className="size-4" />
									{t("reports.tabs.desktop.accountStatements")}
								</TabsTrigger>
								<TabsTrigger
									value="commission"
									className="flex items-center gap-2 text-md"
								>
									<Percent className="size-4" />
									{t("reports.tabs.desktop.commissions")}
								</TabsTrigger>
							</TabsList>
						</div>

						<div className="px-2 pb-2">
							<TabsContent value="comprehensive" className="mt-0">
								<ComprehensiveReports />
							</TabsContent>

							<TabsContent value="detailed" className="mt-0">
								<EnhancedFinancialReports />
							</TabsContent>

							<TabsContent value="accounts" className="mt-0">
								<AccountsReports />
							</TabsContent>

							<TabsContent value="commission" className="mt-0">
								<CommissionReports />
							</TabsContent>
						</div>
					</Tabs>
				</CardContent>
			</Card>
		</div>
	);
}

