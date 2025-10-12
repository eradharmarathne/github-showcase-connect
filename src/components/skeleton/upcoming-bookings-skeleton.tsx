import { Calendar, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

interface UpcomingBookingsSkeletonProps {
	hasCalendarPermission: boolean;
}

export function UpcomingBookingsSkeleton({
	hasCalendarPermission,
}: UpcomingBookingsSkeletonProps) {
	return (
		<div className="bg-card border rounded-lg">
			<div className="flex flex-row items-center justify-between p-4 sm:p-6">
				<div className="flex items-center gap-2 text-lg font-semibold">
					<Calendar className="size-4 sm:size-5 text-primary" />
					<Skeleton className="h-4 sm:h-5 w-28 sm:w-36" />
				</div>
				{hasCalendarPermission && (
					<Button variant="outline" size="sm" disabled className="hidden sm:flex">
						<Eye className="size-4" />
						<Skeleton className="h-4 w-16" />
					</Button>
				)}
			</div>
			<div className="p-4 sm:p-6 pt-0 space-y-3 lg:space-y-4">
				{/* Generate 3 booking skeleton items */}
				{Array.from({ length: 3 }).map((_, index) => (
					<div
						key={index}
						className="p-3 lg:p-4 rounded-lg bg-background/50 border border-border/50"
					>
						<div className="flex flex-col space-y-2">
							<div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
								<div className="min-w-0 flex-1">
									<Skeleton className="h-4 sm:h-5 w-32 sm:w-40 mb-2" />
									<Skeleton className="h-3 sm:h-4 w-40 sm:w-48 mb-1" />
									<Skeleton className="h-3 w-24 sm:w-32" />
								</div>
								<div className="flex flex-wrap items-center gap-2">
									<Skeleton className="h-4 sm:h-5 w-14 sm:w-16" />
									<Skeleton className="h-4 sm:h-5 w-16 sm:w-20" />
								</div>
							</div>
							<div className="flex justify-end">
								<Skeleton className="h-5 sm:h-6 w-20 sm:w-24" />
							</div>
						</div>
					</div>
				))}
			</div>
		</div>
	);
}
