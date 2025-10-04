import { TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTranslation } from "react-i18next";

interface ReservationsHeaderProps {
	activeTab: string;
	onTabChange: (value: string) => void;
}

export function ReservationsHeader({
	activeTab,
	onTabChange,
}: ReservationsHeaderProps) {
	const { t } = useTranslation();

	return (
		<div className="container mx-auto p-4 sm:p-6">
			<div className="mb-6">
				<h1 className="text-2xl font-bold">{t("reservations.title")}</h1>
				<p className="text-muted-foreground">
					{t("reservations.subtitle")}
				</p>
			</div>

			<TabsList className="grid w-full grid-cols-2">
				<TabsTrigger value="reservations">{t("reservations.tabs.reservations")}</TabsTrigger>
				<TabsTrigger value="payments">{t("reservations.tabs.payments")}</TabsTrigger>
			</TabsList>
		</div>
	);
}
