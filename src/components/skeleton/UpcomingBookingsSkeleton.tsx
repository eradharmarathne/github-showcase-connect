import { Calendar, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface UpcomingBookingsSkeletonProps {
	hasCalendarPermission: boolean;
}

export function UpcomingBookingsSkeleton({
	hasCalendarPermission,
}: UpcomingBookingsSkeletonProps) {
	return (
		<Card className="bg-card border">
			<CardHeader className="flex flex-row items-center justify-between">
				<CardTitle className="flex items-center gap-2">
					<Calendar className="size-5 text-primary" />
					Upcoming Bookings
				</CardTitle>
				{hasCalendarPermission && (
					<Button variant="outline" size="sm" disabled>
						<Eye className="size-4" />
						View All
					</Button>
				)}
			</CardHeader>
			<CardContent className="space-y-3 lg:space-y-4">
				{/* Generate 3 booking skeleton items */}
				{Array.from({ length: 3 }).map((_, index) => (
					<div
						key={index}
						className="p-3 lg:p-4 rounded-lg bg-background/50 border border-border/50"
					>
						<div className="flex flex-col space-y-2">
							<div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
								<div className="min-w-0 flex-1">
									<Skeleton className="h-5 w-40 mb-2" />
									<Skeleton className="h-4 w-48 mb-1" />
									<Skeleton className="h-3 w-32" />
								</div>
								<div className="flex flex-wrap items-center gap-2">
									<Skeleton className="h-5 w-16" />
									<Skeleton className="h-5 w-20" />
								</div>
							</div>
							<div className="flex justify-end">
								<Skeleton className="h-6 w-24" />
							</div>
						</div>
					</div>
				))}
			</CardContent>
		</Card>
	);
}
