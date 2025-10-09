import * as React from "react";
import { LocationSwitcherSkeleton } from "@/components/skeleton/location-switcher-skeleton";
import { NavMainSkeleton } from "@/components/skeleton/nav-main-skeleton";
import { NavProjectsSkeleton } from "@/components/skeleton/nav-projects-skeleton";
import { NavUserSkeleton } from "@/components/skeleton/nav-user-skeleton";
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarHeader,
	SidebarRail,
} from "@/components/ui/sidebar";

interface AppSidebarSkeletonProps
	extends React.ComponentProps<typeof Sidebar> {}

export function AppSidebarSkeleton({ ...props }: AppSidebarSkeletonProps) {
	return (
		<Sidebar collapsible="icon" {...props}>
			<SidebarHeader>
				<LocationSwitcherSkeleton />
			</SidebarHeader>
			<SidebarContent>
				<NavMainSkeleton />
				{/* <NavProjectsSkeleton /> */}
			</SidebarContent>
			<SidebarFooter>
				<NavUserSkeleton />
			</SidebarFooter>
			<SidebarRail />
		</Sidebar>
	);
}
