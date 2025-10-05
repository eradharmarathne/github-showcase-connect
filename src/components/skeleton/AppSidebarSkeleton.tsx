import * as React from "react";
import { LocationSwitcherSkeleton } from "@/components/skeleton/LocationSwitcherSkeleton";
import { NavMainSkeleton } from "@/components/skeleton/NavMainSkeleton";
import { NavProjectsSkeleton } from "@/components/skeleton/NavProjectsSkeleton";
import { NavUserSkeleton } from "@/components/skeleton/NavUserSkeleton";
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
