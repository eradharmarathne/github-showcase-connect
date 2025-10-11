import { Skeleton } from "@/components/ui/skeleton";

export function CalendarSkeleton() {
	return (
		<div className="p-6 space-y-6 pt-8 animate-fade-in w-full px-2">
			{/* Header */}
			<div className="flex justify-between items-center">
				<div className="space-y-2">
					<Skeleton className="h-8 w-32" />
					<Skeleton className="h-4 w-48" />
				</div>
				<Skeleton className="h-10 w-40" />
			</div>

			{/* Calendar Controls */}
			<div className="flex justify-between items-center">
				<Skeleton className="h-10 w-48" />
				<div className="flex items-center gap-2">
					<Skeleton className="h-10 w-10" />
					<Skeleton className="h-6 w-32" />
					<Skeleton className="h-10 w-10" />
				</div>
			</div>

			{/* Calendar Grid */}
			<div className="border rounded-lg bg-card">
				<div className="p-0">
					{/* Calendar Header */}
					<div className="grid grid-cols-7 border-b">
						{Array.from({ length: 7 }).map((_, index) => (
							<div key={index} className="p-3 text-center border-r">
								<Skeleton className="h-4 w-8 mx-auto" />
							</div>
						))}
					</div>

					{/* Calendar Days */}
					{Array.from({ length: 6 }).map((_, weekIndex) => (
						<div key={weekIndex} className="grid grid-cols-7">
							{Array.from({ length: 7 }).map((_, dayIndex) => (
								<div
									key={dayIndex}
									className="min-h-24 p-2 border-r border-b space-y-1"
								>
									<Skeleton className="h-4 w-6" />
									{Math.random() > 0.7 && (
										<div className="space-y-1">
											<Skeleton className="h-4 w-full bg-blue-200" />
											{Math.random() > 0.5 && (
												<Skeleton className="h-4 w-full bg-green-200" />
											)}
										</div>
									)}
								</div>
							))}
						</div>
					))}
				</div>
			</div>

			{/* Legend */}
			<div className="border rounded-lg bg-card">
				<div className="p-6">
					<div className="text-lg font-semibold mb-4">
						<Skeleton className="h-5 w-16" />
					</div>
				</div>
				<div className="p-6 pt-0">
					<div className="flex flex-wrap gap-4">
						{Array.from({ length: 6 }).map((_, index) => (
							<div key={index} className="flex items-center gap-2">
								<Skeleton className="h-4 w-4 rounded" />
								<Skeleton className="h-4 w-20" />
							</div>
						))}
					</div>
				</div>
			</div>
		</div>
	);
}
