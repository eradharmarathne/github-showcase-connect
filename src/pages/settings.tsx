import { useTranslation } from "react-i18next";
import {
	CurrencyManagement,
	ExpenseManagement,
	FormFieldPreferences,
	IncomeManagement,
	LocationManagement,
	ProfileSettings,
} from "@/components/settings";
import { PrintSettingsTab } from "@/components/settings/print-settings-tab";
import { PublicBookingSettings } from "@/components/settings/public-booking-settings";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Settings() {
	const { t } = useTranslation();

	return (
		<div className="w-full pb-8 mx-auto p-6">
			<Tabs defaultValue="profile" className="w-full">
				<TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 lg:grid-cols-8 gap-1 h-auto p-1">
					<TabsTrigger value="profile" className="text-xs sm:text-sm px-2 py-2">
						{t("settings.profile")}
					</TabsTrigger>
					<TabsTrigger
						value="locations"
						className="text-xs sm:text-sm px-2 py-2"
					>
						{t("settings.locations")}
					</TabsTrigger>
					<TabsTrigger
						value="public-booking"
						className="text-xs sm:text-sm px-2 py-2"
					>
						Public Booking
					</TabsTrigger>
					<TabsTrigger
						value="form-fields"
						className="text-xs sm:text-sm px-2 py-2"
					>
						{t("settings.formFields")}
					</TabsTrigger>
					<TabsTrigger
						value="expenses"
						className="text-xs sm:text-sm px-2 py-2"
					>
						{t("settings.expenses")}
					</TabsTrigger>
					<TabsTrigger value="income" className="text-xs sm:text-sm px-2 py-2">
						{t("settings.income")}
					</TabsTrigger>
					<TabsTrigger
						value="currency"
						className="text-xs sm:text-sm px-2 py-2"
					>
						{t("settings.currency")}
					</TabsTrigger>
					<TabsTrigger
						value="print"
						className="text-xs sm:text-sm px-2 py-2"
					>
						Print Settings
					</TabsTrigger>
				</TabsList>

				<TabsContent value="profile">
					<ProfileSettings />
				</TabsContent>

				<TabsContent value="locations">
					<LocationManagement />
				</TabsContent>

				<TabsContent value="public-booking">
					<PublicBookingSettings />
				</TabsContent>

				<TabsContent value="form-fields">
					<FormFieldPreferences />
				</TabsContent>

				<TabsContent value="expenses">
					<ExpenseManagement />
				</TabsContent>

				<TabsContent value="income">
					<IncomeManagement />
				</TabsContent>

				<TabsContent value="currency">
					<CurrencyManagement />
				</TabsContent>

				<TabsContent value="print">
					<PrintSettingsTab />
				</TabsContent>
			</Tabs>
		</div>
	);
}
