import { BarChart3, Building2, Calendar, Home, Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link, useLocation } from "react-router";
import { cn } from "@/lib/utils";

export function MobileBottomNav() {
	const location = useLocation();
	const { t } = useTranslation();

	const navItems = [
		{ name: t("pageTitle.dashboard"), href: "/dashboard", icon: Home },
		{ name: t("pageTitle.reservations"), href: "/reservations", icon: Plus },
		{ name: t("pageTitle.calendar"), href: "/calendar", icon: Calendar },
		{ name: t("pageTitle.reports"), href: "/reports", icon: BarChart3 },
		{ name: t("pageTitle.accounts"), href: "/accounts", icon: Building2 },
	];

	return (
		<div className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border lg:hidden">
			<div className="grid grid-cols-5 h-16">
				{navItems.map((item) => {
					const isActive = location.pathname === item.href;
					return (
						<Link
							key={item.name}
							to={item.href}
							className={cn(
								"flex flex-col items-center justify-center gap-1 text-xs transition-colors",
								isActive
									? "text-primary bg-primary/10"
									: "text-muted-foreground hover:text-foreground",
							)}
						>
							<item.icon className={cn("size-4", isActive && "text-primary")} />
							<span className="font-medium text-xs sm:text-base">
								{item.name}
							</span>
						</Link>
					);
				})}
			</div>
		</div>
	);
}
