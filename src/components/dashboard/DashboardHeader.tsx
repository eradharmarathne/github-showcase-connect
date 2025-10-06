import { Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { DashboardHeaderSkeleton } from "@/components/skeleton/DashboardHeaderSkeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";

type Location = Tables<"locations">;

interface DashboardHeaderProps {
	selectedLocation: string;
	selectedMonth: string;
	setSelectedMonth: (value: string) => void;
	hasIncomePermission: boolean;
	hasExpensePermission: boolean;
	onLocationsLoad?: (locations: Location[]) => void;
}

export function DashboardHeader({
	selectedLocation,
	selectedMonth,
	setSelectedMonth,
	hasIncomePermission,
	hasExpensePermission,
	onLocationsLoad,
}: DashboardHeaderProps) {
	const [loading, setLoading] = useState(true);
	const [locations, setLocations] = useState<Location[]>([]);
	const { tenant } = useAuth();
	const { t } = useTranslation();

	// Location selection is now handled by sidebar
	useEffect(() => {
		const fetchLocations = async () => {
			if (!tenant?.id) {
				setLoading(false);
				return;
			}

			try {
				const { data: locationsData } = await supabase
					.from("locations")
					.select("*")
					.eq("tenant_id", tenant.id)
					.eq("is_active", true);

				const fetchedLocations = locationsData || [];
				setLocations(fetchedLocations);

				// Pass locations to parent if callback provided
				if (onLocationsLoad) {
					onLocationsLoad(fetchedLocations);
				}
			} catch (error) {
				console.error("Error fetching locations:", error);
			} finally {
				setLoading(false);
			}
		};

		fetchLocations();
	}, [tenant?.id, onLocationsLoad]);

	if (loading) {
		return (
			<DashboardHeaderSkeleton
				hasIncomePermission={hasIncomePermission}
				hasExpensePermission={hasExpensePermission}
			/>
		);
	}
	return (
		<div className="flex flex-col space-y-4">
			<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
				<div>
					<h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-foreground">
						{t("dashboard.header.welcome")}
					</h1>
					<p className="text-sm lg:text-base text-muted-foreground">
						{t("dashboard.header.subtitle")}
					</p>
				</div>
				<div className="flex flex-col sm:flex-row gap-2">
					{hasIncomePermission && (
						<Button
							asChild
							variant="default"
							size="sm"
							className="w-full sm:w-auto"
						>
							<Link to="/reservations">
								<Plus className="size-4" />
								{t("dashboard.header.addIncome")}
							</Link>
						</Button>
					)}
					{hasExpensePermission && (
						<Button
							asChild
							variant="outline"
							size="sm"
							className="w-full sm:w-auto"
						>
							<Link to="/expense">
								<Plus className="size-4" />
								{t("dashboard.header.addExpense")}
							</Link>
						</Button>
					)}
				</div>
			</div>

			{/* Filters Row */}
			<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
				{/* Location selector removed - now handled by sidebar */}
				<div className="space-y-1">
					<Label className="text-xs">{t("dashboard.header.monthFilter")}</Label>
					<Input
						type="month"
						value={selectedMonth}
						onChange={(e) => setSelectedMonth(e.target.value)}
						className="h-9 w-fit min-w-40"
					/>
				</div>
			</div>
		</div>
	);
}
