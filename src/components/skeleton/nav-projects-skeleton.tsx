import {
	SidebarGroup,
	SidebarGroupLabel,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";

export function NavProjectsSkeleton() {
	return (
		<SidebarGroup className="group-data-[collapsible=icon]:hidden">
			<SidebarGroupLabel>
				<Skeleton className="h-4 w-24" />
			</SidebarGroupLabel>
			<SidebarMenu>
				{/* Generate 3 quick action skeletons */}
				{Array.from({ length: 3 }).map((_, index) => (
					<SidebarMenuItem key={index}>
						<SidebarMenuButton>
							<Skeleton className="size-4 rounded" />
							<Skeleton className="h-4 w-16" />
						</SidebarMenuButton>
					</SidebarMenuItem>
				))}
			</SidebarMenu>
		</SidebarGroup>
	);
}
