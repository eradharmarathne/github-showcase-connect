import { Skeleton } from "@/components/ui/skeleton";

export function IncomeExpenseChartSkeleton() {
	return (
		<div className="space-y-4 w-full flex-1">
			{/* Summary Cards */}
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
				{[1, 2, 3].map((i) => (
					<div key={i} className="bg-card border rounded-lg">
						<div className="pb-2 p-6">
							<Skeleton className="h-4 w-20" />
						</div>
						<div className="px-6 pb-6">
							<Skeleton className="h-8 w-24 mb-2" />
							<Skeleton className="h-3 w-3/4" />
						</div>
					</div>
				))}
			</div>
			{/* Chart */}
			<div className="bg-card border rounded-lg">
				<div className="pt-4 sm:pt-6 p-6">
					<Skeleton className="h-[300px] w-full" />
				</div>
			</div>
		</div>
	);
}
