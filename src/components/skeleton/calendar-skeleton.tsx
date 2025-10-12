import { Skeleton } from "@/components/ui/skeleton";

export function CalendarSkeleton() {
	return (
		<div className="p-2 sm:p-4 space-y-4 pb-20 pt-8 animate-fade-in w-full">
			{/* Header */}
			<div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
				<div className="space-y-2">
					<Skeleton className="h-6 sm:h-8 w-48" />
					<Skeleton className="h-4 w-64" />
				</div>
				<div className="flex items-center gap-2">
					<Skeleton className="h-10 w-40" />
				</div>
			</div>

			{/* Controls */}
			<div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
				<div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full md:w-auto">
					<Skeleton className="w-full sm:w-48 h-10" />
					<Skeleton className="w-full sm:w-32 h-10" />
				</div>

				{/* Month Navigation */}
				<div className="flex items-center gap-2 w-full md:w-auto justify-center md:justify-end">
					<Skeleton className="h-10 w-10" />
					<Skeleton className="h-6 w-32" />
					<Skeleton className="h-10 w-10" />
				</div>
			</div>

			{/* Timeline View */}
			<div className="bg-background rounded-lg border overflow-hidden">
				<div className="overflow-x-auto">
					<div className="min-w-full">
						{/* Calendar Header */}
						<div className="grid grid-cols-[150px_1fr] border-b bg-gray-50">
							<div className="p-3 font-semibold border-r text-sm">
								<Skeleton className="h-4 w-12" />
							</div>
							<div
								className="grid gap-0"
								style={{ gridTemplateColumns: "repeat(31, minmax(40px, 1fr))" }}
							>
								{Array.from({ length: 31 }).map((_, index) => (
									<div key={index} className="p-2 text-center text-xs border-r">
										<Skeleton className="h-3 w-4 mx-auto mb-1" />
										<Skeleton className="h-3 w-6 mx-auto" />
									</div>
								))}
							</div>
						</div>

						{/* Room Rows */}
						{Array.from({ length: 8 }).map((_, roomIndex) => (
							<div
								key={roomIndex}
								className="grid grid-cols-[150px_1fr] border-b hover:bg-gray-50/50"
							>
								{/* Room Info */}
								<div className="p-2 border-r">
									<div className="flex flex-col gap-1">
										<div className="flex gap-1 items-center">
											<Skeleton className="h-4 w-12" />
											<Skeleton className="h-3 w-16" />
										</div>
										<Skeleton className="h-5 w-20 rounded-full" />
									</div>
								</div>

								{/* Calendar Days for this Room */}
								<div
									className="grid gap-0"
									style={{
										gridTemplateColumns: "repeat(31, minmax(40px, 1fr))",
									}}
								>
									{Array.from({ length: 31 }).map((_, dayIndex) => (
										<div
											key={dayIndex}
											className="h-16 border-r border-gray-200 relative flex items-center justify-center"
										>
											{Math.random() > 0.7 && (
												<Skeleton className="absolute inset-1 bg-blue-200 rounded" />
											)}
											{Math.random() > 0.85 && (
												<Skeleton className="h-4 w-4 rounded-full" />
											)}
										</div>
									))}
								</div>
							</div>
						))}
					</div>
				</div>

				{/* Legend */}
				<div className="p-4 bg-gray-50 border-t">
					<div className="flex flex-wrap gap-4 text-sm">
						{Array.from({ length: 5 }).map((_, index) => (
							<div key={index} className="flex items-center gap-2">
								<Skeleton className="h-4 w-4 rounded" />
								<Skeleton className="h-4 w-16" />
							</div>
						))}
					</div>
				</div>
			</div>
		</div>
	);
}
