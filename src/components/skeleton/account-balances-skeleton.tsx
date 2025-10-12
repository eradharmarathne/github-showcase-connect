import { DollarSign } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export function AccountBalancesSkeleton() {
	return (
		<div className="bg-card border rounded-lg">
			<div className="p-4 sm:p-6">
				<div className="flex items-center gap-2 mb-4 sm:mb-6">
					<DollarSign className="size-4 sm:size-5 text-primary" />
					<Skeleton className="h-4 sm:h-5 w-28 sm:w-32" />
				</div>
			</div>
			<div className="p-4 sm:p-6 pt-0 space-y-3 lg:space-y-4">
				{/* Generate 3 account skeleton items */}
				{Array.from({ length: 3 }).map((_, index) => (
					<div
						key={index}
						className="flex items-center justify-between p-3 rounded-lg bg-background/50 border border-border/50"
					>
						<div className="min-w-0 flex-1">
							<Skeleton className="h-4 sm:h-5 w-24 sm:w-32 mb-2" />
							<Skeleton className="h-3 sm:h-4 w-20 sm:w-24" />
						</div>
						<div className="text-right ml-4">
							<Skeleton className="h-5 sm:h-6 w-20 sm:w-28 mb-2" />
							<Skeleton className="h-4 sm:h-5 w-10 sm:w-12" />
						</div>
					</div>
				))}
			</div>
		</div>
	);
}
