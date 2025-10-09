import { BarChart3, Edit, Eye, Shield, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useUsersData } from "@/hooks/use-users-data";
import type { User as UserType } from "./types";
import { permissionTypes } from "./types";

interface PermissionMatrixProps {
	onEditUser: (user: UserType) => void;
}

export function PermissionMatrix({ onEditUser }: PermissionMatrixProps) {
	const { users, loading } = useUsersData();

	const getPermissionCount = (permissions: any) => {
		return Object.values(permissions).filter(Boolean).length;
	};

	const getTotalPermissions = (user: UserType) => {
		let total = 0;
		Object.values(user.permissions).forEach((locationPerms: any) => {
			total += getPermissionCount(locationPerms);
		});
		return total;
	};

	const getPermissionPercentage = (user: UserType) => {
		const totalPossible =
			Object.keys(user.permissions).length * permissionTypes.length;
		const actualPermissions = getTotalPermissions(user);
		return totalPossible > 0
			? Math.round((actualPermissions / totalPossible) * 100)
			: 0;
	};

	if (loading) {
		return (
			<Card>
				<CardHeader>
					<CardTitle>Permission Matrix</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="space-y-4">
						{[...Array(2)].map((_, i) => (
							<div key={i} className="p-4 border rounded-lg animate-pulse">
								<div className="flex items-center gap-3 mb-3">
									<div className="w-6 h-6 bg-muted rounded-full" />
									<div className="h-4 bg-muted rounded w-32" />
									<div className="h-5 bg-muted rounded w-16 ml-auto" />
								</div>
								<div className="space-y-2">
									<div className="h-3 bg-muted rounded w-24" />
									<div className="grid grid-cols-4 gap-2">
										{[...Array(8)].map((_, j) => (
											<div key={j} className="h-8 bg-muted rounded" />
										))}
									</div>
								</div>
							</div>
						))}
					</div>
				</CardContent>
			</Card>
		);
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<Shield className="h-5 w-5" />
					Permission Matrix
				</CardTitle>
			</CardHeader>
			<CardContent>
				<Tabs defaultValue="overview" className="w-full">
					<TabsList className="grid w-full grid-cols-2">
						<TabsTrigger value="overview">Overview</TabsTrigger>
						<TabsTrigger value="detailed">Detailed View</TabsTrigger>
					</TabsList>

					<TabsContent value="overview" className="space-y-4">
						{users.map((user) => (
							<div
								key={user.id}
								className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
							>
								<div className="flex flex-wrap items-start sm:items-center gap-3 mb-3">
									<div className="p-1 bg-primary/10 rounded-full">
										<User className="size-4 text-primary" />
									</div>
									<div>
										<div className="font-medium">{user.name}</div>
										<div className="text-sm text-muted-foreground">
											{user.email}
										</div>
									</div>
									<div className="flex items-center gap-2 ml-auto">
										<Badge
											variant={user.is_tenant_admin ? "default" : "secondary"}
											className="flex items-center gap-1"
										>
											{user.is_tenant_admin ? (
												<>
													<Shield className="h-3 w-3" />
													Admin
												</>
											) : (
												<>
													<Eye className="h-3 w-3" />
													User
												</>
											)}
										</Badge>
										<Button
											variant="ghost"
											size="sm"
											onClick={() => onEditUser(user)}
										>
											<Edit className="h-4 w-4" />
										</Button>
									</div>
								</div>

								<div className="space-y-3">
									<div className="flex items-center gap-2">
										<BarChart3 className="h-4 w-4 text-muted-foreground" />
										<span className="text-sm text-muted-foreground">
											Permission Coverage: {getPermissionPercentage(user)}%
										</span>
									</div>

									<Progress
										value={getPermissionPercentage(user)}
										className="h-2"
									/>

									<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
										{Object.entries(user.permissions).map(
											([location, perms]) => (
												<div
													key={location}
													className="p-3 bg-muted/30 rounded border"
												>
													<h5 className="font-medium text-sm text-primary mb-2 flex items-center justify-between">
														{location}
														<Badge variant="outline" className="text-xs">
															{getPermissionCount(perms)}/
															{permissionTypes.length}
														</Badge>
													</h5>
													<div className="flex flex-wrap gap-1">
														{permissionTypes
															.filter(
																(permType) => (perms as any)[permType.key],
															)
															.map((permType) => (
																<Badge
																	key={permType.key}
																	variant="secondary"
																	className="text-xs"
																>
																	{permType.label.split(" ")[0]}
																</Badge>
															))}
													</div>
												</div>
											),
										)}
									</div>
								</div>
							</div>
						))}

						{users.length === 0 && (
							<div className="text-center py-8 text-muted-foreground">
								<Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
								<p>No permission data available</p>
								<p className="text-sm">Add users to see their permissions</p>
							</div>
						)}
					</TabsContent>

					<TabsContent value="detailed" className="space-y-4">
						{users.map((user) => (
							<div key={user.id} className="p-4 border rounded-lg">
								<div className="flex items-center gap-3 mb-4">
									<div className="p-1 bg-primary/10 rounded-full">
										<User className="size-4 text-primary" />
									</div>
									<div className="font-medium">{user.name}</div>
									<Badge
										variant={user.is_tenant_admin ? "default" : "secondary"}
										className="ml-auto"
									>
										{user.is_tenant_admin ? "Admin" : "User"}
									</Badge>
								</div>

								{Object.keys(user.permissions).length > 0 ? (
									Object.entries(user.permissions).map(([location, perms]) => (
										<div key={location} className="mb-4">
											<h5 className="font-medium text-sm text-primary mb-3 flex items-center justify-between">
												{location}
												<Badge variant="outline">
													{getPermissionCount(perms)}/{permissionTypes.length}{" "}
													permissions
												</Badge>
											</h5>
											<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
												{permissionTypes.map((permType) => (
													<div
														key={permType.key}
														className={`flex items-center gap-2 p-2 rounded border ${
															(perms as any)[permType.key]
																? "bg-green-50 border-green-200 text-green-800"
																: "bg-gray-50 border-gray-200 text-gray-500"
														}`}
													>
														<div
															className={`w-3 h-3 rounded-full ${
																(perms as any)[permType.key]
																	? "bg-green-500"
																	: "bg-gray-300"
															}`}
														/>
														<span className="text-xs font-medium">
															{permType.label}
														</span>
													</div>
												))}
											</div>
										</div>
									))
								) : (
									<div className="text-center py-4 text-muted-foreground">
										<p className="text-sm">
											No location permissions set up yet
										</p>
										<Button
											variant="outline"
											size="sm"
											className="mt-2"
											onClick={() => onEditUser(user)}
										>
											Configure Permissions
										</Button>
									</div>
								)}
							</div>
						))}
					</TabsContent>
				</Tabs>
			</CardContent>
		</Card>
	);
}
