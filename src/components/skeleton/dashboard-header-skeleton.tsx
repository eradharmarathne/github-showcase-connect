import { Skeleton } from "@/components/ui/skeleton";

export function DashboardHeaderSkeleton() {
	return (
		<div className="flex flex-col space-y-4">
			<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
				<div>
					<Skeleton className="h-8 w-48 mb-2" />
					<Skeleton className="h-4 w-64" />
				</div>
				<div className="flex flex-col sm:flex-row gap-2">
					<Skeleton className="h-10 w-40" />
					<Skeleton className="h-10 w-40" />
				</div>
			</div>
		</div>
	);
}
