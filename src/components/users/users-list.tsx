import { formatDistanceToNow } from "date-fns";
import {
	Clock,
	Edit,
	Mail,
	MapPin,
	Phone,
	Shield,
	Trash2,
	User,
	UserCheck,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import {
	type User as UsersDataUser,
	useUsersData,
} from "@/hooks/use-users-data";
import { supabase } from "@/integrations/supabase/client";

interface UsersListProps {
	onEditUser: (user: UsersDataUser) => void;
}

export function UsersList({ onEditUser }: UsersListProps) {
	const { users, loading, refetch, deleteUser } = useUsersData();
	const { toast } = useToast();

	const handleDeleteUser = async (userId: string) => {
		if (confirm("Are you sure you want to remove this user's access?")) {
			try {
				await deleteUser(userId);
				toast({
					title: "Success",
					description: "User deleted successfully",
				});
			} catch (error: any) {
				console.error("Failed to delete user:", error);
				toast({
					title: "Error",
					description:
						error.message || "Failed to delete user. Please try again.",
					variant: "destructive",
				});
			}
		}
	};

	const formatLastActivity = (lastSignIn: string | null | undefined) => {
		if (!lastSignIn) return "Never";
		try {
			return formatDistanceToNow(new Date(lastSignIn), { addSuffix: true });
		} catch {
			return "Unknown";
		}
	};

	const getUserInitials = (name: string) => {
		return name
			.split(" ")
			.map((n) => n[0])
			.join("")
			.toUpperCase()
			.slice(0, 2);
	};

	if (loading) {
		return (
			<Card>
				<CardHeader>
					<CardTitle>Team Members</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="space-y-4">
						{[...Array(3)].map((_, i) => (
							<div key={i} className="flex items-center space-x-4">
								<div className="w-10 h-10 bg-muted rounded-full animate-pulse" />
								<div className="space-y-2 flex-1">
									<div className="h-4 bg-muted rounded animate-pulse w-1/4" />
									<div className="h-3 bg-muted rounded animate-pulse w-1/3" />
								</div>
							</div>
						))}
					</div>
				</CardContent>
			</Card>
		);
	}

	return (
		<TooltipProvider>
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<User className="h-5 w-5" />
						Team Members ({users.length})
					</CardTitle>
				</CardHeader>
				<CardContent>
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>User</TableHead>
								<TableHead className="hidden sm:table-cell">Contact</TableHead>
								<TableHead>Role</TableHead>
								<TableHead>Locations</TableHead>
								<TableHead className="hidden md:table-cell">
									Last Active
								</TableHead>
								<TableHead>Actions</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{users.map((user) => (
								<TableRow key={user.id}>
									<TableCell>
										<div className="flex items-center gap-3">
											<Avatar className="h-10 w-10">
												<AvatarImage src={user.avatar_url} alt={user.name} />
												<AvatarFallback className="bg-primary/10 text-primary">
													{getUserInitials(user.name)}
												</AvatarFallback>
											</Avatar>
											<div>
												<div className="font-medium">{user.name}</div>
												<div className="text-sm text-muted-foreground sm:hidden">
													{user.email}
												</div>
												{user.tenant_role && (
													<Badge variant="outline" className="text-xs mt-1">
														{user.tenant_role
															.replace("tenant_", "")
															.replace("_", " ")}
													</Badge>
												)}
											</div>
										</div>
									</TableCell>
									<TableCell className="hidden sm:table-cell">
										<div className="space-y-1">
											<div className="flex items-center gap-1 text-sm">
												<Mail className="h-3 w-3" />
												{user.email}
											</div>
											{user.phone && (
												<div className="flex items-center gap-1 text-sm text-muted-foreground">
													<Phone className="h-3 w-3" />
													{user.phone}
												</div>
											)}
										</div>
									</TableCell>
									<TableCell>
										<Badge
											variant={user.is_tenant_admin ? "default" : "secondary"}
											className="flex items-center gap-1 w-fit"
										>
											{user.is_tenant_admin ? (
												<>
													<Shield className="h-3 w-3" />
													Administrator
												</>
											) : (
												<>
													<UserCheck className="h-3 w-3" />
													User
												</>
											)}
										</Badge>
									</TableCell>
									<TableCell>
										<Tooltip>
											<TooltipTrigger asChild>
												<div className="flex items-center gap-1">
													<MapPin className="h-3 w-3" />
													<span className="text-sm">
														{user.location_count || 0} location
														{(user.location_count || 0) !== 1 ? "s" : ""}
													</span>
												</div>
											</TooltipTrigger>
											<TooltipContent>
												<div className="space-y-1">
													<p className="font-medium">Locations:</p>
													{Object.keys(user.permissions).map((locationName) => (
														<p key={locationName} className="text-sm">
															• {locationName}
														</p>
													))}
												</div>
											</TooltipContent>
										</Tooltip>
									</TableCell>
									<TableCell className="text-sm text-muted-foreground hidden md:table-cell">
										<div className="flex items-center gap-1">
											<Clock className="h-3 w-3" />
											{formatLastActivity(user.last_sign_in_at)}
										</div>
									</TableCell>
									<TableCell>
										<div className="flex gap-1">
											<Tooltip>
												<TooltipTrigger asChild>
													<Button
														variant="ghost"
														size="sm"
														onClick={() => onEditUser(user)}
													>
														<Edit className="h-4 w-4" />
													</Button>
												</TooltipTrigger>
												<TooltipContent>Edit user permissions</TooltipContent>
											</Tooltip>
											<Tooltip>
												<TooltipTrigger asChild>
													<Button
														variant="ghost"
														size="sm"
														onClick={() => handleDeleteUser(user.id)}
														className="text-destructive hover:text-destructive"
													>
														<Trash2 className="h-4 w-4" />
													</Button>
												</TooltipTrigger>
												<TooltipContent>Remove user access</TooltipContent>
											</Tooltip>
										</div>
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
					{users.length === 0 && (
						<div className="text-center py-8 text-muted-foreground">
							<User className="h-12 w-12 mx-auto mb-4 opacity-50" />
							<p>No team members found</p>
							<p className="text-sm">Invite users to get started</p>
						</div>
					)}
				</CardContent>
			</Card>
		</TooltipProvider>
	);
}
