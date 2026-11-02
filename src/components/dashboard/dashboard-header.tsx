import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { MonthlyRecapDialog } from "@/components/recap/monthly-recap-dialog";

export function DashboardHeader() {
	const { t } = useTranslation();

	return (
		<div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
			<motion.div
				initial={{ opacity: 0, y: 12 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] as const }}
				className="flex flex-col space-y-2"
			>
				<h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-foreground">
					{t("dashboard.header.welcome")}
				</h1>
				<p className="text-sm lg:text-base text-muted-foreground">
					{t("dashboard.header.subtitle")}
				</p>
			</motion.div>
			<MonthlyRecapDialog />
		</div>
	);
}
