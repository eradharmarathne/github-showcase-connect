import { Skeleton } from "@/components/ui/skeleton";

export function ComprehensiveReportsSkeleton() {
	return (
		<div className="space-y-6 px-4">
			{/* Summary Cards Skeleton */}
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
				{Array.from({ length: 4 }).map((_, i) => (
					<div key={i}>
						<div className="pb-2">
							<Skeleton className="h-4 w-24" />
						</div>
						<div className="p-6 pt-0">
							<Skeleton className="h-8 w-32 mb-2" />
							<Skeleton className="h-3 w-20" />
						</div>
					</div>
				))}
			</div>

			{/* Charts Skeleton */}
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				<div className="border rounded-lg bg-card">
					<div className="p-6">
						<Skeleton className="h-6 w-40" />
					</div>
					<div className="p-6 pt-0">
						<Skeleton className="h-64 w-full" />
					</div>
				</div>
				<div className="border rounded-lg bg-card">
					<div className="p-6">
						<Skeleton className="h-6 w-40" />
					</div>
					<div className="p-6 pt-0">
						<Skeleton className="h-64 w-full" />
					</div>
				</div>
			</div>

			{/* Table Skeleton */}
			<div className="border rounded-lg bg-card">
				<div className="p-6">
					<Skeleton className="h-6 w-32" />
					<Skeleton className="h-4 w-48" />
				</div>
				<div className="p-6 pt-0">
					<div className="space-y-4">
						{Array.from({ length: 8 }).map((_, i) => (
							<div key={i} className="flex justify-between items-center">
								<div className="flex items-center gap-3">
									<Skeleton className="h-10 w-10 rounded" />
									<div>
										<Skeleton className="h-4 w-24 mb-1" />
										<Skeleton className="h-3 w-16" />
									</div>
								</div>
								<Skeleton className="h-6 w-20" />
							</div>
						))}
					</div>
				</div>
			</div>
		</div>
	);
}
