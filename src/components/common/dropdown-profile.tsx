import {
	CirclePlusIcon,
	CreditCardIcon,
	LogOutIcon,
	SettingsIcon,
	SquarePenIcon,
	UserIcon,
	UsersIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import { useNavigate } from "react-router";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/context/auth-context";
import { usePermissions } from "@/hooks/use-permissions";

type Props = {
	trigger: ReactNode;
	defaultOpen?: boolean;
	align?: "start" | "center" | "end";
};

const ProfileDropdown = ({ trigger, defaultOpen, align = "end" }: Props) => {
	const navigate = useNavigate();
	const { profile, signOut, tenant, user } = useAuth();
	const { hasPermission, isTenantOwner } = usePermissions();

	const handleSignOut = async () => {
		await signOut();
		navigate("/auth");
	};

	const handleNavigation = (path: string) => {
		navigate(path);
	};

	// Get user initials for avatar fallback
	const getInitials = (name: string) => {
		return name
			.split(" ")
			.map((n) => n[0])
			.join("")
			.toUpperCase()
			.slice(0, 2);
	};

	const userName = profile?.name || user?.email?.split("@")[0] || "User";
	const userEmail = profile?.email || user?.email || "";
	const userInitials = getInitials(userName);

	return (
		<DropdownMenu defaultOpen={defaultOpen}>
			<DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
			<DropdownMenuContent className="w-80" align={align || "end"}>
				<DropdownMenuLabel className="flex items-center gap-4 px-4 py-2.5 font-normal">
					<div className="relative">
						<Avatar className="size-10">
							<AvatarImage src="" alt={userName} />
							<AvatarFallback>{userInitials}</AvatarFallback>
						</Avatar>
						<span className="ring-transparent absolute right-0 bottom-0 block size-2 rounded-full bg-green-600" />
					</div>
					<div className="flex flex-1 flex-col items-start">
						<span className="text-foreground text-sm font-semibold">
							{userName}
						</span>
						<span className="text-muted-foreground text-sm">{userEmail}</span>
					</div>
				</DropdownMenuLabel>

				<DropdownMenuSeparator />

				<DropdownMenuGroup>
					<DropdownMenuItem
						className="px-4 py-2.5 text-sm cursor-pointer"
						onClick={() => handleNavigation("/settings")}
					>
						<UserIcon className="text-foreground size-5" />
						<span>My Profile</span>
					</DropdownMenuItem>
					{(hasPermission("access_settings") || isTenantOwner) && (
						<DropdownMenuItem
							className="px-4 py-2.5 text-sm cursor-pointer"
							onClick={() => handleNavigation("/settings")}
						>
							<SettingsIcon className="text-foreground size-5" />
							<span>Settings</span>
						</DropdownMenuItem>
					)}
					{(hasPermission("access_settings") || isTenantOwner) && (
						<DropdownMenuItem
							className="px-4 py-2.5 text-sm cursor-pointer"
							onClick={() => handleNavigation("/billing")}
						>
							<CreditCardIcon className="text-foreground size-5" />
							<span>Billing & Subscription</span>
						</DropdownMenuItem>
					)}
				</DropdownMenuGroup>

				<DropdownMenuSeparator />

				<DropdownMenuGroup>
					{(hasPermission("access_users") || isTenantOwner) && (
						<DropdownMenuItem
							className="px-4 py-2.5 text-sm cursor-pointer"
							onClick={() => handleNavigation("/users")}
						>
							<UsersIcon className="text-foreground size-5" />
							<span>Manage Users</span>
						</DropdownMenuItem>
					)}
					{(hasPermission("access_master_files") || isTenantOwner) && (
						<DropdownMenuItem
							className="px-4 py-2.5 text-sm cursor-pointer"
							onClick={() => handleNavigation("/master-files")}
						>
							<SquarePenIcon className="text-foreground size-5" />
							<span>Master Files</span>
						</DropdownMenuItem>
					)}
					{(hasPermission("access_booking_channels") || isTenantOwner) && (
						<DropdownMenuItem
							className="px-4 py-2.5 text-sm cursor-pointer"
							onClick={() => handleNavigation("/booking-channels")}
						>
							<CirclePlusIcon className="text-foreground size-5" />
							<span>Booking Channels</span>
						</DropdownMenuItem>
					)}
				</DropdownMenuGroup>

				<DropdownMenuSeparator />

				<DropdownMenuItem
					className="px-4 py-2.5 text-sm text-destructive focus:text-destructive cursor-pointer"
					onClick={handleSignOut}
				>
					<LogOutIcon className="size-5" />
					<span>Logout</span>
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
};

export default ProfileDropdown;
