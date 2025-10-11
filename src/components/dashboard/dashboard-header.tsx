import { useTranslation } from "react-i18next";
import { Tables } from "@/integrations/supabase/types";

export function DashboardHeader() {
	const { t } = useTranslation();

	return (
		<div className="flex flex-col space-y-2">
			<h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-foreground">
				{t("dashboard.header.welcome")}
			</h1>
			<p className="text-sm lg:text-base text-muted-foreground">
				{t("dashboard.header.subtitle")}
			</p>
		</div>
	);
}
