import {
	BarChart3,
	Bed,
	Building,
	Building2,
	Calendar,
	CreditCard,
	DollarSign,
	FolderOpen,
	Home,
	MapPin,
	MinusCircle,
	Percent,
	Phone,
	Wifi,
} from "lucide-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "react-router";
import { NavMain } from "@/components/nav-main";
import { NavProjects } from "@/components/nav-projects";
import { LocationSwitcher } from "@/components/shared/location-switcher";
import { AppSidebarSkeleton } from "@/components/skeleton/app-sidebar-skeleton";
import {
	Sidebar,
	SidebarContent,
	SidebarHeader,
	SidebarRail,
} from "@/components/ui/sidebar";
import { usePermissions } from "@/hooks/use-permissions";
import { useProfile } from "@/hooks/use-profile";

export function AppSidebar(props: React.ComponentProps<typeof Sidebar>) {
	const { profile } = useProfile();
	const { hasAnyPermission, loading } = usePermissions();
	const location = useLocation();
	const { t } = useTranslation();

	// Main navigation items based on user permissions
	const getNavMainItems = () => {
		const items = [];

		// Core features
		if (hasAnyPermission(["access_dashboard"])) {
			items.push({
				title: t("navigation.dashboard"),
				url: "/dashboard",
				icon: Home,
				isActive: location.pathname === "/dashboard",
			});
		}

		if (hasAnyPermission(["access_calendar"])) {
			items.push({
				title: t("navigation.calendar"),
				url: "/calendar",
				icon: Calendar,
				isActive: location.pathname === "/calendar",
			});
		}

		// Reservations/Bookings
		if (hasAnyPermission(["access_bookings"])) {
			items.push({
				title: t("navigation.reservations"),
				url: "/reservations",
				icon: Building,
				isActive:
					location.pathname === "/reservations" ||
					location.pathname.startsWith("/reservations/"),
			});
		}

		// Expenses
		if (hasAnyPermission(["access_expenses"])) {
			items.push({
				title: t("navigation.expense"),
				url: "/expense",
				icon: CreditCard,
				isActive: location.pathname === "/expense",
			});
		}

		// Accounts
		if (hasAnyPermission(["access_accounts"])) {
			items.push({
				title: t("navigation.accounts"),
				url: "/accounts",
				icon: Building2,
				isActive: location.pathname === "/accounts",
			});
		}

		if (hasAnyPermission(["access_booking_channels"])) {
			items.push({
				title: t("navigation.bookingChannels"),
				url: "/booking-channels",
				icon: Wifi,
				isActive: location.pathname === "/booking-channels",
			});
		}

		// Reports with sub-items
		if (hasAnyPermission(["access_reports"])) {
			items.push({
				title: t("navigation.reports"),
				url: "/reports?tab=comprehensive",
				icon: BarChart3,
				isActive: location.pathname === "/reports",
			});
		}

		return items;
	};

	// Quick action projects
	const getProjectItems = () => {
		const projects = [];

		if (hasAnyPermission(["access_expenses"])) {
			projects.push({
				name: t("navigation.addExpense"),
				url: "/expense",
				icon: MinusCircle,
				isActive: location.pathname === "/expense",
			});
		}

		// Phone verification quick action - show for all users
		if (profile && !profile.is_phone_verified) {
			projects.push({
				name: t("navigation.verifyPhone"),
				url: "/settings?tab=profile",
				icon: Phone,
				isActive:
					location.pathname === "/settings" &&
					window.location.search.includes("tab=profile"),
			});
		}

		return projects;
	};

	return (
		<Sidebar
			collapsible="icon"
			{...props}
			className="z-20 bg-background text-foreground"
			data-testid="app-sidebar"
		>
			<SidebarHeader>
				<LocationSwitcher />
			</SidebarHeader>
			<SidebarContent>
				{loading ? (
					<AppSidebarSkeleton />
				) : (
					<>
						<NavMain items={getNavMainItems()} />
						<NavProjects projects={getProjectItems()} />
					</>
				)}
			</SidebarContent>
			<SidebarRail />
		</Sidebar>
	);
}
