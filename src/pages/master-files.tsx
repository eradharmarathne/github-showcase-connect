import {
	Bed,
	Building2,
	ChevronDown,
	ChevronRight,
	MapPin,
	Percent,
	UserCheck,
	Users,
} from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router";
import AgentsTab from "@/components/master-files/AgentsTab";
import CommissionsTab from "@/components/master-files/CommissionsTab";
import GuidesTab from "@/components/master-files/GuidesTab";
import LocationsTab from "@/components/master-files/LocationsTab";
import RoomsTab from "@/components/master-files/RoomsTab";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

export default function MasterFiles() {
	const [searchParams, setSearchParams] = useSearchParams();
	const activeTab = searchParams.get("tab") || "locations";
	const { t } = useTranslation();

	const masterFilesTabs = [
		{
			id: "locations",
			name: t("masterFiles.locations.title"),
			icon: MapPin,
			description: t("masterFiles.locations.description"),
		},
		{
			id: "rooms",
			name: t("masterFiles.rooms.title"),
			icon: Bed,
			description: t("masterFiles.rooms.description"),
		},
		{
			id: "guides",
			name: t("masterFiles.guides.title"),
			icon: UserCheck,
			description: t("masterFiles.guides.description"),
		},
		{
			id: "agents",
			name: t("masterFiles.agents.title"),
			icon: Users,
			description: t("masterFiles.agents.description"),
		},
		{
			id: "commissions",
			name: t("masterFiles.commissions.title"),
			icon: Percent,
			description: t("masterFiles.commissions.description"),
		},
	];

	const handleTabChange = (value: string) => {
		setSearchParams({ tab: value });
	};

	const renderTabContent = () => {
		switch (activeTab) {
			case "locations":
				return <LocationsTab />;
			case "rooms":
				return <RoomsTab />;
			case "guides":
				return <GuidesTab />;
			case "agents":
				return <AgentsTab />;
			case "commissions":
				return <CommissionsTab />;
			default:
				return <LocationsTab />;
		}
	};

	return (
		<div className="px-4 sm:px-6 md:px-8 py-4 sm:py-6">
			<Card className="h-full">
				<CardHeader className="px-4 sm:px-6 py-4 sm:py-6">
					<CardTitle className="text-lg md:text-xl lg:text-2xl font-bold flex items-center gap-2 sm:gap-3">
						<Building2 className="size-5 sm:size-7 text-primary" />
						{t("masterFiles.title")}
					</CardTitle>
					<p className="text-sm sm:text-base text-muted-foreground">
						{t("masterFiles.subtitle")}
					</p>
				</CardHeader>
				<CardContent className="px-4 sm:px-6 md:px-8 py-4 sm:py-6">
					<Tabs
						value={activeTab}
						onValueChange={handleTabChange}
						className="space-y-4 sm:space-y-6"
					>
						{/* Mobile: Horizontal scroll, Desktop: Grid */}
						<div className="overflow-x-auto md:overflow-x-visible">
							<TabsList className="flex w-max md:grid md:w-full md:grid-cols-5 gap-1 sm:gap-2 h-auto p-1 min-w-max">
								{masterFilesTabs.map((tab) => {
									const Icon = tab.icon;
									return (
										<TabsTrigger
											key={tab.id}
											value={tab.id}
											className="flex items-center gap-1 sm:gap-2 p-2 sm:p-3 h-auto whitespace-nowrap data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
										>
											<Icon className="size-3 sm:size-4" />
											<span className="text-xs sm:text-sm font-medium">
												{tab.name}
											</span>
										</TabsTrigger>
									);
								})}
							</TabsList>
						</div>

						<div className="grid gap-6">
							{masterFilesTabs.map((tab) => (
								<TabsContent key={tab.id} value={tab.id} className="mt-0">
									{renderTabContent()}
								</TabsContent>
							))}
						</div>
					</Tabs>
				</CardContent>
			</Card>
		</div>
	);
}
