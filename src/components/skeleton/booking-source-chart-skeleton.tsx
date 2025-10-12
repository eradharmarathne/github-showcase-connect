import { Skeleton } from "@/components/ui/skeleton";

export function BookingSourceChartSkeleton() {
	return (
		<div className="bg-card border w-full xl:w-fit h-fit rounded-lg">
			<div className="flex flex-row items-center justify-between space-y-0 pb-2 p-4 sm:p-6">
				<div className="text-sm font-medium">
					<Skeleton className="h-4 w-32 sm:w-48" />
				</div>
			</div>
			<div className="p-4 sm:p-6 pt-0">
				<div className="flex justify-center flex-col flex-1">
					{/* Pie Chart Skeleton */}
					<div className="mx-auto aspect-square h-[200px] sm:h-[220px] flex items-center justify-center">
						<div className="relative w-[160px] sm:w-[180px] h-[160px] sm:h-[180px]">
							{/* Outer circle skeleton */}
							<Skeleton className="w-full h-full rounded-full" />
							{/* Inner circle (donut hole) */}
							<div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
								<div className="w-[90px] sm:w-[100px] h-[90px] sm:h-[100px] bg-background rounded-full" />
							</div>
						</div>
					</div>

					{/* Legend Skeleton */}
					<div className="mt-2 flex-1">
						<div className="grid grid-cols-1 gap-1 text-xs">
							{/* Multiple legend items */}
							{[1, 2, 3, 4, 5].map((i) => (
								<div key={i} className="flex items-center gap-2">
									<Skeleton className="w-2 h-2 rounded-full flex-shrink-0" />
									<Skeleton className="h-3 w-20 sm:w-24" />
								</div>
							))}
						</div>
						{/* Total counter skeleton */}
						<div className="mt-2">
							<Skeleton className="h-3 w-16 sm:w-20" />
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
