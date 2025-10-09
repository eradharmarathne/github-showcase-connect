import { Clock, Shield, TrendingUp, User, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useUserStats } from "./hooks";

export function UserStats() {
	const { stats, loading } = useUserStats();

	if (loading) {
		return (
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
				{[...Array(5)].map((_, i) => (
					<Card key={i} className="bg-card border">
						<CardContent className="p-4 sm:p-6">
							<div className="flex items-center justify-between">
								<div>
									<div className="h-4 bg-muted rounded animate-pulse w-20 mb-2" />
									<div className="h-6 bg-muted rounded animate-pulse w-12" />
								</div>
								<div className="w-5 h-5 bg-muted rounded animate-pulse" />
							</div>
						</CardContent>
					</Card>
				))}
			</div>
		);
	}

	return (
		<div className="space-y-4">
			<h3 className="text-base md:text-lg lg:text-xl font-semibold">
				User Statistics
			</h3>
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
				<Card className="bg-card border">
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Total Users</CardTitle>
						<Users className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">{stats.totalUsers}</div>
						<p className="text-xs text-muted-foreground">
							All registered users
						</p>
					</CardContent>
				</Card>

				<Card className="bg-card border">
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">
							Administrators
						</CardTitle>
						<Shield className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">{stats.totalAdmins}</div>
						<p className="text-xs text-muted-foreground">
							{stats.totalUsers > 0
								? Math.round((stats.totalAdmins / stats.totalUsers) * 100)
								: 0}
							% of total users
						</p>
					</CardContent>
				</Card>

				<Card className="bg-card border">
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Regular Users</CardTitle>
						<User className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">{stats.totalRegularUsers}</div>
						<p className="text-xs text-muted-foreground">
							Standard access level
						</p>
					</CardContent>
				</Card>

				<Card className="bg-card border">
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Recent Users</CardTitle>
						<Clock className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">{stats.recentUsers}</div>
						<p className="text-xs text-muted-foreground">
							Added in last 7 days
						</p>
					</CardContent>
				</Card>

				<Card className="bg-card border">
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">
							Avg Permissions
						</CardTitle>
						<TrendingUp className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">{stats.averagePermissions}</div>
						<p className="text-xs text-muted-foreground">
							Per user access level
						</p>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
