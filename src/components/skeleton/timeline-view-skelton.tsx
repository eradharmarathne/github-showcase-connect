import { Skeleton } from "@/components/ui/skeleton";

export function TimelineViewSkeleton() {
	// 30 days, 5 room rows, 3 room types for skeleton
	const days = Array.from({ length: 30 });
	const roomTypes = ["Deluxe", "Standard", "Suite"];
	const roomsPerType = 2;

	return (
		<div className="border rounded-lg overflow-hidden bg-background flex flex-col h-[calc(100vh-180px)] w-full">
			{/* Calendar Header Skeleton */}
			<div className="border-b bg-muted/50 sticky top-0 z-20">
				<div className="flex w-full">
					<div className="w-24 sm:w-28 md:w-32 shrink-0 px-1.5 sm:px-2 py-1.5 border-r flex items-center bg-muted/50">
						<Skeleton className="h-4 w-16" />
					</div>
					<div className="flex flex-1 bg-muted/50">
						{days.map((_, i) => (
							<div key={i} className="flex-1 min-w-[32px] sm:min-w-[40px] px-0.5 py-0.5 text-center border-r last:border-r-0">
								<Skeleton className="h-3 w-8 mx-auto mb-1" />
								<Skeleton className="h-3 w-6 mx-auto" />
							</div>
						))}
					</div>
				</div>
			</div>

			{/* Room Rows Skeleton */}
			<div className="overflow-y-auto flex-1">
				{roomTypes.map((type, idx) => (
					<div key={type}>
						{/* Room Type Header */}
						<div className="bg-muted/80 border-b border-t px-2 py-1 z-10">
							<Skeleton className="h-3 w-20" />
						</div>
						{/* Room Rows */}
						{Array.from({ length: roomsPerType }).map((_, rIdx) => (
							<div key={rIdx} className="flex w-full border-b items-center">
								<div className="w-24 sm:w-28 md:w-32 shrink-0 px-1.5 sm:px-2 py-2 border-r">
									<Skeleton className="h-4 w-16" />
								</div>
								<div className="flex flex-1">
									{days.map((_, dIdx) => (
										<div key={dIdx} className="flex-1 min-w-[32px] sm:min-w-[40px] px-0.5 py-2 border-r last:border-r-0">
											<Skeleton className="h-4 w-full" />
										</div>
									))}
								</div>
							</div>
						))}
					</div>
				))}
			</div>

			{/* Legend Skeleton */}
			<div className="p-2 sm:p-3 bg-muted/50 border-t">
				<div className="flex gap-2">
					<Skeleton className="h-4 w-16" />
					<Skeleton className="h-4 w-16" />
					<Skeleton className="h-4 w-16" />
				</div>
			</div>
		</div>
	);
}
