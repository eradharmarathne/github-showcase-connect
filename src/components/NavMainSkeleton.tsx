import {
	SidebarGroup,
	SidebarGroupLabel,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";

export function NavMainSkeleton() {
	return (
		<SidebarGroup>
			<SidebarGroupLabel><Skeleton className="h-4 w-20" /></SidebarGroupLabel>
			<SidebarMenu>
				{/* Generate 6 nav item skeletons */}
				{Array.from({ length: 12 }).map((_, index) => (
					<SidebarMenuItem key={index}>
						<SidebarMenuButton>
							<Skeleton className="size-4 rounded" />
							<Skeleton className="h-4 w-32" />
						</SidebarMenuButton>
					</SidebarMenuItem>
				))}
			</SidebarMenu>
		</SidebarGroup>
	);
}
