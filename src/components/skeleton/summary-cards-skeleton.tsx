import { ArrowDownCircle, ArrowUpCircle, TrendingUp } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export function SummaryCardsSkeleton() {
	return (
		<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
			{/* Income Card Skeleton */}
			<div className="bg-card border rounded-lg">
				<div className="flex flex-row items-center justify-between space-y-0 pb-2 p-6">
					<div className="text-sm font-medium text-muted-foreground">
						<Skeleton className="h-4 w-24" />
					</div>
					<ArrowUpCircle className="size-4 text-success" />
				</div>
				<div className="px-6 pb-6">
					<Skeleton className="h-8 w-32 mb-2" />
					<Skeleton className="h-3 w-20" />
				</div>
			</div>

			{/* Expenses Card Skeleton */}
			<div className="bg-card border rounded-lg">
				<div className="flex flex-row items-center justify-between space-y-0 pb-2 p-6">
					<div className="text-sm font-medium text-muted-foreground">
						<Skeleton className="h-4 w-28" />
					</div>
					<ArrowDownCircle className="size-4 text-destructive" />
				</div>
				<div className="px-6 pb-6">
					<Skeleton className="h-8 w-32 mb-2" />
					<Skeleton className="h-3 w-20" />
				</div>
			</div>

			{/* Profit Card Skeleton */}
			<div className="bg-card border rounded-lg">
				<div className="flex flex-row items-center justify-between space-y-0 pb-2 p-6">
					<div className="text-sm font-medium text-muted-foreground">
						<Skeleton className="h-4 w-24" />
					</div>
					<TrendingUp className="size-4 text-primary" />
				</div>
				<div className="px-6 pb-6">
					<Skeleton className="h-8 w-32 mb-2" />
					<Skeleton className="h-3 w-16" />
				</div>
			</div>
		</div>
	);
}
