import { Calendar, Download, Percent, UserCheck, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { CommissionReportsSkeleton } from "@/components/reports";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

type CommissionData = {
	reservation_id: string;
	reservation_number: string;
	guest_name: string;
	check_in_date: string;
	check_out_date: string;
	total_amount: number;
	guide_id?: string;
	guide_name?: string;
	guide_commission: number;
	agent_id?: string;
	agent_name?: string;
	agent_commission: number;
	status: string;
};

export default function CommissionReports() {
	const { t } = useTranslation();
	const [commissions, setCommissions] = useState<CommissionData[]>([]);
	const [loading, setLoading] = useState(true);
	const [dateFrom, setDateFrom] = useState("");
	const [dateTo, setDateTo] = useState("");
	const [filterType, setFilterType] = useState("all");
	const [selectedPerson, setSelectedPerson] = useState("");
	const [guides, setGuides] = useState<any[]>([]);
	const [agents, setAgents] = useState<any[]>([]);
	const { toast } = useToast();

	useEffect(() => {
		fetchData();
		fetchGuides();
		fetchAgents();
	}, []);

	const fetchData = async () => {
		setLoading(true);
		try {
			const { data, error } = await supabase
				.from("reservations")
				.select(`
          id,
          reservation_number,
          guest_name,
          check_in_date,
          check_out_date,
          total_amount,
          guide_id,
          guide_commission,
          agent_id,
          agent_commission,
          status,
          guides!guide_id(name),
          agents!agent_id(name)
        `)
				.or("guide_id.not.is.null,agent_id.not.is.null")
				.order("check_in_date", { ascending: false });

			if (error) throw error;

			const formattedData =
				data?.map((item: any) => ({
					reservation_id: item.id,
					reservation_number: item.reservation_number,
					guest_name: item.guest_name,
					check_in_date: item.check_in_date,
					check_out_date: item.check_out_date,
					total_amount: item.total_amount,
					guide_id: item.guide_id,
					guide_name: item.guides?.name,
					guide_commission: item.guide_commission || 0,
					agent_id: item.agent_id,
					agent_name: item.agents?.name,
					agent_commission: item.agent_commission || 0,
					status: item.status,
				})) || [];

			setCommissions(formattedData);
		} catch (error) {
			toast({
				title: "Error",
				description: "Failed to fetch commission data",
				variant: "destructive",
			});
		} finally {
			setLoading(false);
		}
	};

	const fetchGuides = async () => {
		const { data } = await supabase
			.from("guides")
			.select("id, name")
			.eq("is_active", true)
			.order("name");
		setGuides(data || []);
	};

	const fetchAgents = async () => {
		const { data } = await supabase
			.from("agents")
			.select("id, name")
			.eq("is_active", true)
			.order("name");
		setAgents(data || []);
	};

	const applyFilters = () => {
		let filtered = [...commissions];

		// Date filter
		if (dateFrom) {
			filtered = filtered.filter((item) => item.check_in_date >= dateFrom);
		}
		if (dateTo) {
			filtered = filtered.filter((item) => item.check_in_date <= dateTo);
		}

		// Type and person filter
		if (filterType === "guide" && selectedPerson) {
			filtered = filtered.filter((item) => item.guide_id === selectedPerson);
		} else if (filterType === "agent" && selectedPerson) {
			filtered = filtered.filter((item) => item.agent_id === selectedPerson);
		} else if (filterType === "guide") {
			filtered = filtered.filter((item) => item.guide_id);
		} else if (filterType === "agent") {
			filtered = filtered.filter((item) => item.agent_id);
		}

		return filtered;
	};

	const filteredCommissions = applyFilters();

	const calculateTotals = () => {
		const totals = filteredCommissions.reduce(
			(acc, item) => {
				acc.totalGuideCommission += item.guide_commission;
				acc.totalAgentCommission += item.agent_commission;
				acc.totalReservationValue += item.total_amount;
				return acc;
			},
			{
				totalGuideCommission: 0,
				totalAgentCommission: 0,
				totalReservationValue: 0,
			},
		);

		return totals;
	};

	const totals = calculateTotals();

	const exportData = () => {
		const csvContent = [
			[
				t("reports.commission.table.headers.reservation"),
				t("reports.commission.table.headers.guest"),
				t("reports.commission.details.checkIn"),
				t("reports.commission.details.checkOut"),
				t("reports.commission.table.headers.totalAmount"),
				t("reports.commission.table.headers.guide"),
				t("reports.commission.table.headers.guideCommission"),
				t("reports.commission.table.headers.agent"),
				t("reports.commission.table.headers.agentCommission"),
				t("reports.commission.table.headers.status"),
			],
			...filteredCommissions.map((item) => [
				item.reservation_number,
				item.guest_name,
				item.check_in_date,
				item.check_out_date,
				item.total_amount,
				item.guide_name || "",
				item.guide_commission,
				item.agent_name || "",
				item.agent_commission,
				item.status,
			]),
		]
			.map((row) => row.join(","))
			.join("\n");

		const blob = new Blob([csvContent], { type: "text/csv" });
		const url = window.URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `commission-report-${new Date().toISOString().split("T")[0]}.csv`;
		a.click();
		window.URL.revokeObjectURL(url);
	};

	if (loading) {
		return <CommissionReportsSkeleton />;
	}

	return (
		<div className="space-y-6 px-2 sm:px-4">
			<div className="flex flex-col gap-y-2 sm:flex-row justify-between items-start sm:items-center">
				<div>
					<h2 className="text-lg md:text-xl lg:text-2xl font-bold text-foreground flex items-center gap-2">
						<Percent className="size-6" />
						{t("reports.commission.title")}
					</h2>
					<p className="text-muted-foreground">
						{t("reports.commission.subtitle")}
					</p>
				</div>
				<Button onClick={exportData} variant="outline">
					<Download className="size-4 mr-2" />
					{t("reports.common.export.csv")}
				</Button>
			</div>

			{/* Summary Cards */}
			<div className="grid grid-cols-1 md:grid-cols-4 gap-4">
				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="text-sm md:text-base lg:text-lg font-medium flex items-center gap-2">
							<UserCheck className="size-4" />
							{t("reports.commission.summary.guideCommissions")}
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="text-md sm:text-2xl font-bold">
							LKR {totals.totalGuideCommission.toFixed(2)}
						</div>
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="text-sm md:text-base lg:text-lg font-medium flex items-center gap-2">
							<Users className="size-4" />
							{t("reports.commission.summary.agentCommissions")}
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="text-md sm:text-2xl font-bold">
							LKR {totals.totalAgentCommission.toFixed(2)}
						</div>
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="text-sm md:text-base lg:text-lg font-medium">
							{t("reports.commission.summary.totalCommissions")}
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="text-md sm:text-2xl font-bold">
							LKR{" "}
							{(
								totals.totalGuideCommission + totals.totalAgentCommission
							).toFixed(2)}
						</div>
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="text-sm md:text-base lg:text-lg font-medium">
							{t("reports.commission.summary.reservationValue")}
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="text-md sm:text-2xl font-bold">
							LKR {totals.totalReservationValue.toFixed(2)}
						</div>
					</CardContent>
				</Card>
			</div>

			{/* Filters */}
			<Card>
				<CardHeader>
					<CardTitle>{t("reports.commission.filters.title")}</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="grid grid-cols-1 md:grid-cols-5 gap-4">
						<div>
							<Label htmlFor="date_from">
								{t("reports.commission.filters.fromDate")}
							</Label>
							<Input
								id="date_from"
								type="date"
								value={dateFrom}
								onChange={(e) => setDateFrom(e.target.value)}
							/>
						</div>
						<div>
							<Label htmlFor="date_to">
								{t("reports.commission.filters.toDate")}
							</Label>
							<Input
								id="date_to"
								type="date"
								value={dateTo}
								onChange={(e) => setDateTo(e.target.value)}
							/>
						</div>
						<div>
							<Label htmlFor="filter_type">
								{t("reports.commission.filters.type")}
							</Label>
							<Select
								value={filterType}
								onValueChange={(value) => {
									setFilterType(value);
									setSelectedPerson("");
								}}
							>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">
										{t("reports.commission.filters.types.all")}
									</SelectItem>
									<SelectItem value="guide">
										{t("reports.commission.filters.types.guide")}
									</SelectItem>
									<SelectItem value="agent">
										{t("reports.commission.filters.types.agent")}
									</SelectItem>
								</SelectContent>
							</Select>
						</div>
						<div>
							<Label htmlFor="selected_person">
								{filterType === "guide"
									? t("reports.commission.filters.guide")
									: filterType === "agent"
										? t("reports.commission.filters.agent")
										: t("reports.commission.filters.person")}
							</Label>
							<Select
								value={selectedPerson}
								onValueChange={setSelectedPerson}
								disabled={filterType === "all"}
							>
								<SelectTrigger>
									<SelectValue
										placeholder={
											filterType === "guide"
												? t("reports.commission.filters.selectGuide")
												: filterType === "agent"
													? t("reports.commission.filters.selectAgent")
													: t("reports.commission.filters.selectPerson")
										}
									/>
								</SelectTrigger>
								<SelectContent>
									{filterType === "guide" &&
										guides.map((guide) => (
											<SelectItem key={guide.id} value={guide.id}>
												{guide.name}
											</SelectItem>
										))}
									{filterType === "agent" &&
										agents.map((agent) => (
											<SelectItem key={agent.id} value={agent.id}>
												{agent.name}
											</SelectItem>
										))}
								</SelectContent>
							</Select>
						</div>
						<div className="flex items-end">
							<Button onClick={fetchData} className="w-full">
								Refresh Data
							</Button>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Commission Table */}
			<Card>
				<CardHeader>
					<CardTitle>{t("reports.commission.table.title")}</CardTitle>
					<CardDescription>
						{t("reports.commission.table.subtitle", {
							count: filteredCommissions.length,
						})}
					</CardDescription>
				</CardHeader>
				<CardContent>
					{/* Desktop table */}

					<div className="hidden md:block">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>
										{t("reports.commission.table.headers.reservation")}
									</TableHead>
									<TableHead>
										{t("reports.commission.table.headers.guest")}
									</TableHead>
									<TableHead>
										{t("reports.commission.table.headers.dates")}
									</TableHead>
									<TableHead>
										{t("reports.commission.table.headers.totalAmount")}
									</TableHead>
									<TableHead>
										{t("reports.commission.table.headers.guide")}
									</TableHead>
									<TableHead>
										{t("reports.commission.table.headers.guideCommission")}
									</TableHead>
									<TableHead>
										{t("reports.commission.table.headers.agent")}
									</TableHead>
									<TableHead>
										{t("reports.commission.table.headers.agentCommission")}
									</TableHead>
									<TableHead>
										{t("reports.commission.table.headers.status")}
									</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{filteredCommissions.map((item) => (
									<TableRow key={item.reservation_id}>
										<TableCell className="font-medium">
											{item.reservation_number}
										</TableCell>
										<TableCell>{item.guest_name}</TableCell>
										<TableCell>
											<div className="text-sm">
												<div>
													{new Date(item.check_in_date).toLocaleDateString()}
												</div>
												<div className="text-muted-foreground">
													{t("reports.commission.table.to")}{" "}
													{new Date(item.check_out_date).toLocaleDateString()}
												</div>
											</div>
										</TableCell>
										<TableCell>LKR {item.total_amount.toFixed(2)}</TableCell>
										<TableCell>{item.guide_name || "-"}</TableCell>
										<TableCell>
											{item.guide_commission > 0
												? `LKR ${item.guide_commission.toFixed(2)}`
												: "-"}
										</TableCell>
										<TableCell>{item.agent_name || "-"}</TableCell>
										<TableCell>
											{item.agent_commission > 0
												? `LKR ${item.agent_commission.toFixed(2)}`
												: "-"}
										</TableCell>
										<TableCell>
											<Badge
												variant={
													item.status === "confirmed"
														? "default"
														: item.status === "checked_out"
															? "secondary"
															: item.status === "cancelled"
																? "destructive"
																: "outline"
												}
											>
												{item.status}
											</Badge>
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</div>

					{/* Mobile cards */}
					<div className="md:hidden space-y-3">
						{filteredCommissions.map((item) => (
							<div
								key={item.reservation_id}
								className="p-3 rounded-lg border bg-card"
							>
								<div className="flex items-center justify-between">
									<div>
										<p className="font-medium">{item.guest_name}</p>
										<p className="text-xs text-muted-foreground">
											{new Date(item.check_in_date).toLocaleDateString()} →{" "}
											{new Date(item.check_out_date).toLocaleDateString()}
										</p>
										<p className="text-xs text-muted-foreground">
											{t("reports.commission.table.mobile.res")}{" "}
											{item.reservation_number}
										</p>
									</div>
									<div className="text-right">
										<p className="text-xs text-muted-foreground">
											{t("reports.commission.table.mobile.total")}
										</p>
										<p className="text-base font-semibold">
											LKR {item.total_amount.toFixed(2)}
										</p>
									</div>
								</div>
								<div className="grid grid-cols-2 gap-2 mt-3 text-xs">
									<div className="p-2 rounded bg-muted/40">
										<p className="text-muted-foreground">
											{t("reports.commission.table.mobile.guide")}
										</p>
										<p>{item.guide_name || "-"}</p>
										<p className="font-medium">
											{item.guide_commission > 0
												? `LKR ${item.guide_commission.toFixed(2)}`
												: "-"}
										</p>
									</div>
									<div className="p-2 rounded bg-muted/40">
										<p className="text-muted-foreground">
											{t("reports.commission.table.mobile.agent")}
										</p>
										<p>{item.agent_name || "-"}</p>
										<p className="font-medium">
											{item.agent_commission > 0
												? `LKR ${item.agent_commission.toFixed(2)}`
												: "-"}
										</p>
									</div>
								</div>
								<div className="flex justify-end mt-2">
									<Badge
										variant={
											item.status === "confirmed"
												? "default"
												: item.status === "checked_out"
													? "secondary"
													: item.status === "cancelled"
														? "destructive"
														: "outline"
										}
									>
										{item.status}
									</Badge>
								</div>
							</div>
						))}
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
