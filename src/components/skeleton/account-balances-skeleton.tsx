import { DollarSign } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export function AccountBalancesSkeleton() {
	return (
		<div className="bg-card border rounded-lg">
			<div className="p-6">
				<div className="flex items-center gap-2 mb-6">
					<DollarSign className="size-5 text-primary" />
					<span className="text-lg font-semibold">Account Balances</span>
				</div>
			</div>
			<div className="p-6 pt-0 space-y-3 lg:space-y-4">
				{/* Generate 3 account skeleton items */}
				{Array.from({ length: 3 }).map((_, index) => (
					<div
						key={index}
						className="flex items-center justify-between p-3 rounded-lg bg-background/50 border border-border/50"
					>
						<div className="min-w-0 flex-1">
							<Skeleton className="h-5 w-32 mb-2" />
							<Skeleton className="h-4 w-24" />
						</div>
						<div className="text-right ml-4">
							<Skeleton className="h-6 w-28 mb-2" />
							<Skeleton className="h-5 w-12" />
						</div>
					</div>
				))}
			</div>
		</div>
	);
}
