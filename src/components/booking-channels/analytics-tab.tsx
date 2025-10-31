import { Badge } from "@/components/ui/badge";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { getSourceColor, getStatusColor } from "@/lib/booking-channels/helpers";
import type { SyncStats } from "@/types/booking-channels";

interface AnalyticsTabProps {
	syncStats: SyncStats;
}

export function AnalyticsTab({ syncStats }: AnalyticsTabProps) {
	return (
		<Card>
			<CardHeader>
				<CardTitle>Booking Analytics</CardTitle>
				<CardDescription>
					Insights and trends from your external bookings
				</CardDescription>
			</CardHeader>
			<CardContent>
				<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
					<div>
						<h4 className="text-sm md:text-base lg:text-lg font-medium text-muted-foreground mb-3">
							Source Breakdown
						</h4>
						<div className="space-y-2">
							{Object.entries(syncStats.sourceBreakdown).map(
								([source, count]) => (
									<div
										key={source}
										className="flex items-center justify-between"
									>
										<div className="flex items-center gap-2">
											<Badge className={getSourceColor(source)}>
												{source.replace("_", ".")}
											</Badge>
										</div>
										<span className="text-sm font-medium">
											{count} bookings
										</span>
									</div>
								),
							)}
						</div>
					</div>

					<div>
						<h4 className="text-sm md:text-base lg:text-lg font-medium text-muted-foreground mb-3">
							Status Breakdown
						</h4>
						<div className="space-y-2">
							{Object.entries(syncStats.statusBreakdown).map(
								([status, count]) => (
									<div
										key={status}
										className="flex items-center justify-between"
									>
										<div className="flex items-center gap-2">
											<Badge className={getStatusColor(status)}>
												{status.replace("_", " ")}
											</Badge>
										</div>
										<span className="text-sm font-medium">
											{count} bookings
										</span>
									</div>
								),
							)}
						</div>
					</div>
				</div>
			</CardContent>
		</Card>
	);
}
