import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function AccountsReportsSkeleton() {
	return (
		<div className="space-y-6 px-2 sm:px-4">
			{/* Account Summary Cards Skeleton */}
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
				{Array.from({ length: 4 }).map((_, i) => (
					<Card key={i}>
						<CardHeader className="pb-2">
							<div className="flex items-center gap-2">
								<Skeleton className="h-4 w-4 rounded" />
								<Skeleton className="h-4 w-28" />
							</div>
						</CardHeader>
						<CardContent>
							<Skeleton className="h-8 w-24 mb-1" />
							<Skeleton className="h-3 w-16" />
						</CardContent>
					</Card>
				))}
			</div>

			{/* Account Transactions Table Skeleton */}
			<Card>
				<CardHeader>
					<Skeleton className="h-6 w-40" />
					<Skeleton className="h-4 w-56" />
				</CardHeader>
				<CardContent>
					<div className="space-y-4">
						{/* Table Header */}
						<div className="grid grid-cols-6 gap-4 pb-2 border-b">
							<Skeleton className="h-4 w-16" />
							<Skeleton className="h-4 w-20" />
							<Skeleton className="h-4 w-16" />
							<Skeleton className="h-4 w-18" />
							<Skeleton className="h-4 w-14" />
							<Skeleton className="h-4 w-12" />
						</div>
						{/* Table Rows */}
						{Array.from({ length: 10 }).map((_, i) => (
							<div
								key={i}
								className="grid grid-cols-6 gap-4 py-3 border-b last:border-b-0"
							>
								<Skeleton className="h-4 w-20" />
								<Skeleton className="h-4 w-24" />
								<Skeleton className="h-4 w-16" />
								<Skeleton className="h-4 w-12" />
								<Skeleton className="h-4 w-16" />
								<Skeleton className="h-4 w-8" />
							</div>
						))}
					</div>
				</CardContent>
			</Card>

			{/* Account Balance Chart Skeleton */}
			<Card>
				<CardHeader>
					<Skeleton className="h-6 w-44" />
				</CardHeader>
				<CardContent>
					<Skeleton className="h-64 w-full" />
				</CardContent>
			</Card>
		</div>
	);
}