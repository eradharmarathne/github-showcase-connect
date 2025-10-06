import {
	BarChart3,
	BookOpen,
	Building2,
	Calendar,
	CreditCard,
	DollarSign,
	FileText,
	HelpCircle,
	MinusCircle,
	Play,
	Settings,
	Users,
	Wifi,
} from "lucide-react";
import React from "react";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { usePermissions } from "@/hooks/usePermissions";
import { useTour } from "./tour/TourProvider";
import {
	accountsTour,
	bookingChannelsTour,
	calendarTour,
	comprehensiveTour,
	dashboardTour,
	expenseTour,
	masterFilesTour,
	reportsTour,
	reservationsTour,
	settingsTour,
	usersTour,
} from "./tour/tours";

export const TourHelpButton: React.FC = () => {
	const { startTour, hasCompletedTour } = useTour();
	const { hasPermission } = usePermissions();

	const tourItems = [
		{
			id: "comprehensive-tour",
			label: "Complete App Tour",
			description: "Comprehensive walkthrough of all features and sections",
			icon: <BookOpen className="h-4 w-4" />,
			action: () => startTour(comprehensiveTour),
			show: true,
		},
		{
			id: "dashboard-tour",
			label: "Dashboard Tour",
			description: "Learn the dashboard basics and quick actions",
			icon: <BarChart3 className="h-4 w-4" />,
			action: () => startTour(dashboardTour),
			show: hasPermission("access_dashboard"),
		},
		{
			id: "reservations-tour",
			label: "Reservations Tour",
			description: "Master booking and guest management",
			icon: <Calendar className="h-4 w-4" />,
			action: () => startTour(reservationsTour),
			show: hasPermission("access_bookings"),
		},
		{
			id: "calendar-tour",
			label: "Calendar Tour",
			description: "Visual booking management and scheduling",
			icon: <Calendar className="h-4 w-4" />,
			action: () => startTour(calendarTour),
			show: hasPermission("access_calendar"),
		},
		{
			id: "reports-tour",
			label: "Financial Reports Tour",
			description: "Understand your financial reports and analytics",
			icon: <FileText className="h-4 w-4" />,
			action: () => startTour(reportsTour),
			show: hasPermission("access_reports"),
		},
		{
			id: "master-files-tour",
			label: "Master Files Tour",
			description: "Configure rooms, guides, and business settings",
			icon: <Settings className="h-4 w-4" />,
			action: () => startTour(masterFilesTour),
			show: hasPermission("access_master_files"),
		},
		{
			id: "accounts-tour",
			label: "Accounts Tour",
			description: "Manage financial accounts and banking",
			icon: <Building2 className="h-4 w-4" />,
			action: () => startTour(accountsTour),
			show: hasPermission("access_accounts"),
		},
		{
			id: "expense-tour",
			label: "Expense Management Tour",
			description: "Track and categorize business expenses",
			icon: <MinusCircle className="h-4 w-4" />,
			action: () => startTour(expenseTour),
			show: hasPermission("access_expenses"),
		},
		{
			id: "settings-tour",
			label: "Settings Tour",
			description: "Configure system settings and preferences",
			icon: <Settings className="h-4 w-4" />,
			action: () => startTour(settingsTour),
			show: hasPermission("access_settings"),
		},
		{
			id: "users-tour",
			label: "User Management Tour",
			description: "Manage team members and permissions",
			icon: <Users className="h-4 w-4" />,
			action: () => startTour(usersTour),
			show: hasPermission("access_users"),
		},
		{
			id: "booking-channels-tour",
			label: "Booking Channels Tour",
			description: "Connect with external booking platforms",
			icon: <Wifi className="h-4 w-4" />,
			action: () => startTour(bookingChannelsTour),
			show: hasPermission("access_booking_channels"),
		},
	];

	const availableTours = tourItems.filter((item) => item.show);

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="ghost" size="sm" className="h-9 w-9 p-0">
					<HelpCircle className="h-4 w-4" />
					<span className="sr-only">Help and Tours</span>
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="w-80">
				<DropdownMenuLabel className="flex items-center gap-2">
					<Play className="h-4 w-4" />
					Interactive Tours
				</DropdownMenuLabel>
				<DropdownMenuSeparator />

				{availableTours.map((item) => (
					<DropdownMenuItem
						key={item.id}
						onClick={item.action}
						className="flex flex-col items-start gap-1 p-3 cursor-pointer"
					>
						<div className="flex items-center gap-2 w-full">
							{item.icon}
							<span className="font-medium">{item.label}</span>
							{hasCompletedTour(item.id) && (
								<span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full ml-auto">
									Completed
								</span>
							)}
						</div>
						<p className="text-xs text-muted-foreground leading-tight">
							{item.description}
						</p>
					</DropdownMenuItem>
				))}

				{!hasCompletedTour("comprehensive-tour") && (
					<>
						<DropdownMenuSeparator />
						<div className="p-3 bg-blue-50 m-1 rounded-lg">
							<p className="text-xs text-blue-700 font-medium">
								💡 New user? Start with the Complete App Tour!
							</p>
						</div>
					</>
				)}
			</DropdownMenuContent>
		</DropdownMenu>
	);
};
