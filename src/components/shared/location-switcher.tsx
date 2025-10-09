import { ChevronsUpDown, MapPin } from "lucide-react";

import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuShortcut,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	useSidebar,
} from "@/components/ui/sidebar";
import Logo from "../ui/logo";
import { useLocationContext } from "@/context/LocationContext";
import { useCallback } from "react";

export function LocationSwitcher() {
	const { isMobile } = useSidebar();
	const { selectedLocation, setSelectedLocation, locations } = useLocationContext();

	const activeLocation = locations.find((loc) => loc.id === selectedLocation);

	const getLocationDisplayName = (location: typeof activeLocation) => {
		if (!location) return "Select Location";
		return location.name || "No Location";
	};

	const getLocationSubtext = (location: typeof activeLocation) => {
		if (!location) return "No location selected";
		return "Active Location";
	};

	const onLocationChange = useCallback(
		(locationId: string) => {
			setSelectedLocation(locationId);
		},
		[setSelectedLocation],
	);

	return (
		<SidebarMenu>
			<SidebarMenuItem>
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<SidebarMenuButton
							size="lg"
							className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
							data-testid="location-switcher"
						>
							<div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
								<Logo />
							</div>
							<div className="grid flex-1 text-left text-sm leading-tight">
								<span className="truncate font-semibold">
									{getLocationDisplayName(activeLocation)}
								</span>
								<span className="truncate text-xs">
									{getLocationSubtext(activeLocation)}
								</span>
							</div>
							<ChevronsUpDown className="ml-auto" />
						</SidebarMenuButton>
					</DropdownMenuTrigger>
					<DropdownMenuContent
						className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
						align="start"
						side={isMobile ? "bottom" : "right"}
						sideOffset={4}
					>
						<DropdownMenuLabel className="text-xs text-muted-foreground">
							Locations
						</DropdownMenuLabel>

						{/* Individual Locations */}
						{locations.map((location, index) => (
							<DropdownMenuItem
								key={location.id}
								onClick={() => onLocationChange(location.id)}
								className="gap-2 p-2"
							>
								<div className="flex size-6 items-center justify-center rounded-sm border">
									<MapPin className="size-4 shrink-0" />
								</div>
								{location.name}
								<DropdownMenuShortcut>⌘{index + 1}</DropdownMenuShortcut>
							</DropdownMenuItem>
						))}

						{locations.length === 0 && (
							<DropdownMenuItem disabled className="gap-2 p-2">
								<div className="flex size-6 items-center justify-center rounded-sm border bg-muted">
									<MapPin className="size-4 shrink-0 text-muted-foreground" />
								</div>
								<div className="font-medium text-muted-foreground">
									No locations available
								</div>
							</DropdownMenuItem>
						)}
					</DropdownMenuContent>
				</DropdownMenu>
			</SidebarMenuItem>
		</SidebarMenu>
	);
}
