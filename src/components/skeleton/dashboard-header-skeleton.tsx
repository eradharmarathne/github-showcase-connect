import { Skeleton } from "@/components/ui/skeleton";

export function DashboardHeaderSkeleton() {
	return (
		<div className="flex flex-col space-y-3 sm:space-y-4">
			<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
				<div>
					<Skeleton className="h-6 sm:h-8 w-40 sm:w-48 mb-2" />
					<Skeleton className="h-3 sm:h-4 w-48 sm:w-64" />
				</div>
				<div className="flex flex-col sm:flex-row gap-2">
					<Skeleton className="h-9 sm:h-10 w-full sm:w-40" />
					<Skeleton className="h-9 sm:h-10 w-full sm:w-40" />
				</div>
			</div>
		</div>
	);
}
