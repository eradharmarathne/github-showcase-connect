import {
	BookOpen,
	Calendar,
	DollarSign,
	HelpCircle,
	Play,
	Settings,
	Users,
	Wifi,
} from "lucide-react";
import React from "react";
import { useTourHelpers } from "@/components/TourManager";
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

export const TourHelpButton: React.FC = () => {
	const {
		startComprehensiveTour,
		hasCompletedTour,
	} = useTourHelpers();

	const { hasPermission } = usePermissions();

	const tourItems = [
		{
			id: "comprehensive-tour",
			label: "Complete App Tour",
			description: "Comprehensive walkthrough of all features and sections",
			icon: <BookOpen className="h-4 w-4" />,
			action: startComprehensiveTour,
			show: true,
		},
	];

	const availableTours = tourItems.filter((item) => item.show);

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button
					variant="ghost"
					size="icon"
					className="relative"
					title="Help & Tours"
				>
					<HelpCircle className="h-5 w-5" />
					{!hasCompletedTour("comprehensive-tour") && (
						<span className="absolute -top-1 -right-1 h-3 w-3 bg-primary rounded-full animate-pulse" />
					)}
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="w-64">
				<DropdownMenuLabel className="flex items-center gap-2">
					<HelpCircle className="h-4 w-4" />
					App Tours & Help
				</DropdownMenuLabel>
				<DropdownMenuSeparator />

				{availableTours.map((item) => (
					<DropdownMenuItem
						key={item.id}
						onClick={item.action}
						className="flex items-start gap-3 p-3 cursor-pointer"
					>
						<div className="flex-shrink-0 mt-0.5">{item.icon}</div>
						<div className="flex-1 min-w-0">
							<div className="flex items-center gap-2">
								<span className="font-medium text-sm">{item.label}</span>
								{hasCompletedTour(item.id as any) && (
									<span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">
										✓
									</span>
								)}
							</div>
							<p className="text-xs text-muted-foreground mt-0.5">
								{item.description}
							</p>
						</div>
					</DropdownMenuItem>
				))}

				{!hasCompletedTour("first-time-user") && (
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
