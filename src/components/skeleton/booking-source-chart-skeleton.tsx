import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslation } from "react-i18next";

export function BookingSourceChartSkeleton() {
	const { t } = useTranslation();

	return (
		<Card className="bg-card border">
			<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
				<CardTitle className="text-sm font-medium">
					{t("dashboard.bookingSources.title")}
				</CardTitle>
			</CardHeader>
			<CardContent>
				<div className="h-[400px] flex items-center justify-center">
					<Skeleton className="h-[350px] w-full rounded" />
				</div>
			</CardContent>
		</Card>
	);
}