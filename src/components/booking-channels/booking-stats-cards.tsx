import { Calendar, Clock, DollarSign, Wifi } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { SyncStats } from "@/types/booking-channels";

interface BookingStatsCardsProps {
	syncStats: SyncStats;
	lastSyncTime: Date | null;
}

export function BookingStatsCards({
	syncStats,
	lastSyncTime,
}: BookingStatsCardsProps) {
	const { t } = useTranslation();

	const totalValue = 0; // TODO: Calculate total booking value

	return (
		<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
			{/* Total Bookings */}
			<Card>
				<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
					<CardTitle className="text-sm md:text-base lg:text-lg font-medium">
						{t("bookingChannels.stats.totalBookings")}
					</CardTitle>
					<Calendar className="size-4 text-muted-foreground" />
				</CardHeader>
				<CardContent>
					<div className="text-lg sm:text-2xl font-bold">
						{syncStats.totalBookings}
					</div>
					<p className="text-xs text-muted-foreground">
						{t("bookingChannels.stats.fromAllSources")}
					</p>
				</CardContent>
			</Card>

			{/* Last Sync Time */}
			<Card>
				<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
					<CardTitle className="text-sm md:text-base lg:text-lg font-medium">
						{t("bookingChannels.stats.lastSync")}
					</CardTitle>
					<Clock className="size-4 text-muted-foreground" />
				</CardHeader>
				<CardContent>
					<div className="text-lg sm:text-2xl font-bold">
						{lastSyncTime
							? lastSyncTime.toLocaleTimeString([], {
									hour: "2-digit",
									minute: "2-digit",
								})
							: "Never"}
					</div>
					<p className="text-xs text-muted-foreground">
						{t("bookingChannels.stats.lastSyncTime")}
					</p>
				</CardContent>
			</Card>

			{/* Total Value */}
			<Card>
				<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
					<CardTitle className="text-sm md:text-base lg:text-lg font-medium">
						{t("bookingChannels.stats.totalValue")}
					</CardTitle>
					<DollarSign className="size-4 text-muted-foreground" />
				</CardHeader>
				<CardContent>
					<div className="text-lg sm:text-2xl font-bold">
						{totalValue.toLocaleString()}
					</div>
					<p className="text-xs text-muted-foreground">
						{t("bookingChannels.stats.totalBookingValue")}
					</p>
				</CardContent>
			</Card>

			{/* Active Sources */}
			<Card>
				<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
					<CardTitle className="text-sm md:text-base lg:text-lg font-medium">
						{t("bookingChannels.stats.activeSources")}
					</CardTitle>
					<Wifi className="size-4 text-muted-foreground" />
				</CardHeader>
				<CardContent>
					<div className="text-lg sm:text-2xl font-bold">
						{Object.keys(syncStats.sourceBreakdown).length}
					</div>
					<p className="text-xs text-muted-foreground">
						{t("bookingChannels.stats.bookingChannels")}
					</p>
				</CardContent>
			</Card>
		</div>
	);
}
