import { LanguagesIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Outlet, useLocation } from "react-router";
import { AppSidebar } from "@/components/app-sidebar";
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { MobileBottomNav } from "@/components/ui/mobile-bottom-nav";
import { Separator } from "@/components/ui/separator";
import {
	SidebarInset,
	SidebarProvider,
	SidebarTrigger,
} from "@/components/ui/sidebar";
import { useLocationContext } from "@/context/LocationContext";
import { useIsMobile } from "@/hooks/use-mobile";
import LanguageDropdown from "./dropdown-language";
import ProfileDropdown from "./dropdown-profile";
import FullscreenToggle from "./FullscreenToggle";
import ProfileAvatarButton from "./ProfileAvatarButton";
import ThemeSwitcher from "./ThemeSwitcher";
import { Button } from "./ui/button";

export function Layout() {
	const { selectedLocation, setSelectedLocation, locations, loading } =
		useLocationContext();
	const isMobile = useIsMobile();
	const location = useLocation();
	const { t } = useTranslation();

	// Get page title based on current route
	const getPageTitle = () => {
		const path = location.pathname;
		const searchParams = new URLSearchParams(location.search);

		switch (path) {
			case "/dashboard":
				return t("pageTitle.dashboard");
			case "/calendar":
				return t("pageTitle.calendar");
			case "/reservations":
				return t("pageTitle.reservations");
			case "/reservations/compact":
				return t("pageTitle.quickBooking");
			case "/expense":
				return t("pageTitle.expense");
			case "/accounts":
				return t("pageTitle.accounts");
			case "/payments/new":
				return t("pageTitle.paymentForm");
			case "/reports": {
				const tab = searchParams.get("tab");
				switch (tab) {
					case "comprehensive":
						return t("pageTitle.comprehensiveReports");
					case "accounts":
						return t("pageTitle.accountReports");
					case "commission":
						return t("pageTitle.commissionReports");
					case "balance":
						return t("pageTitle.balanceSheet");
					case "enhanced":
						return t("pageTitle.enhancedFinancialReports");
					default:
						return t("pageTitle.reports");
				}
			}
			case "/financial-reports":
				return t("pageTitle.financialReports");
			case "/users":
				return t("pageTitle.users");
			case "/settings":
				return t("pageTitle.settings");
			case "/master-files": {
				const masterTab = searchParams.get("tab");
				switch (masterTab) {
					case "locations":
						return t("pageTitle.masterFilesLocations");
					case "rooms":
						return t("pageTitle.masterFilesRooms");
					case "guides":
						return t("pageTitle.masterFilesGuides");
					case "agents":
						return t("pageTitle.masterFilesAgents");
					case "commissions":
						return t("pageTitle.masterFilesCommissions");
					default:
						return t("pageTitle.masterFiles");
				}
			}
			case "/room-management":
				return t("pageTitle.roomManagement");
			case "/booking-channels":
				return t("pageTitle.bookingChannels");
			default:
				if (path.startsWith("/reservations/")) {
					return t("pageTitle.reservationDetails");
				}
				return t("pageTitle.hotelManagement");
		}
	};

	return (
		<SidebarProvider>
			<AppSidebar
				locations={locations}
				selectedLocation={selectedLocation}
				onLocationChange={setSelectedLocation}
				locationsLoading={loading}
			/>
			<SidebarInset>
				{/* Header */}
				<header className="bg-card sticky w-full top-0 z-10 border-b">
					<div className="mx-auto flex w-full items-center justify-between gap-6 px-4 sm:px-6 md:px-8 py-2 sm:py-3">
						<div className="flex items-center gap-2 px-0 sm:px-2 md:px-4">
							<SidebarTrigger className="-ml-1" />
							<Separator orientation="vertical" className="mr-2 h-4" />
							<Breadcrumb>
								<BreadcrumbList>
									<BreadcrumbItem className="hidden md:block">
										<BreadcrumbLink href="/dashboard">
											<span>{t("breadcrumb.home")}</span>
										</BreadcrumbLink>
									</BreadcrumbItem>
									<BreadcrumbSeparator className="hidden md:block" />
									<BreadcrumbItem>
										<BreadcrumbPage className="text-md font-normal">
											{getPageTitle()}
										</BreadcrumbPage>
									</BreadcrumbItem>
								</BreadcrumbList>
							</Breadcrumb>
						</div>
						<div className="flex items-center gap-1.5">
							<FullscreenToggle />
							<ThemeSwitcher />
							<LanguageDropdown
								trigger={
									<Button variant="ghost" size="icon">
										<LanguagesIcon />
									</Button>
								}
							/>
							<ProfileDropdown trigger={<ProfileAvatarButton />} />
						</div>
					</div>
				</header>

				{/* Main Content */}
				<div className="flex flex-1 flex-col gap-4 px-0 sm:px-4 md:px-6 pt-0">
					<Outlet />
				</div>
			</SidebarInset>

			{/* Mobile Bottom Navigation */}
			{isMobile && <MobileBottomNav />}
		</SidebarProvider>
	);
}
