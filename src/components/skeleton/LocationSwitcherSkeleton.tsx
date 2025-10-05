import { ChevronsUpDown, MapPin } from "lucide-react";
import Logo from "@/components/ui/logo";
import {
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";

export function LocationSwitcherSkeleton() {
	return (
		<SidebarMenu>
			<SidebarMenuItem>
				<SidebarMenuButton
					size="lg"
					className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
				>
					<div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
						<div className="size-4">
							<Logo />
						</div>
					</div>
					<div className="grid flex-1 text-left text-sm leading-tight">
						<Skeleton className="h-4 w-24 mb-1" />
						<Skeleton className="h-3 w-20" />
					</div>
					<ChevronsUpDown className="ml-auto size-4" />
				</SidebarMenuButton>
			</SidebarMenuItem>
		</SidebarMenu>
	);
}
