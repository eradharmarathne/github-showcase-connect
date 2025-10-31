import { format } from "date-fns";
import { Calendar, Clock, DollarSign, Wifi } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ExternalBooking, SyncStats } from "@/types/booking-channels";

interface BookingChannelsStatsProps {
	syncStats: SyncStats;
	bookings: ExternalBooking[];
}

export function BookingChannelsStats({
	syncStats,
	bookings,
}: BookingChannelsStatsProps) {
	const { t } = useTranslation();

	const totalRevenue = bookings.reduce(
		(sum, booking) => sum + (booking.total_amount || 0),
		0,
	);

	return (
		<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
						{t("bookingChannels.stats.externalBookingsSynced")}
					</p>
				</CardContent>
			</Card>

			<Card>
				<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
					<CardTitle className="text-sm md:text-base lg:text-lg font-medium">
						{t("bookingChannels.stats.lastSync")}
					</CardTitle>
					<Clock className="size-4 text-muted-foreground" />
				</CardHeader>
				<CardContent>
					<div className="text-lg sm:text-2xl font-bold">
						{syncStats.recentSync
							? format(new Date(syncStats.recentSync), "MMM dd")
							: t("bookingChannels.stats.never")}
					</div>
					<p className="text-xs text-muted-foreground">
						{syncStats.recentSync
							? format(new Date(syncStats.recentSync), "HH:mm")
							: t("bookingChannels.stats.noSyncYet")}
					</p>
				</CardContent>
			</Card>

			<Card>
				<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
					<CardTitle className="text-sm md:text-base lg:text-lg font-medium">
						{t("bookingChannels.stats.revenue")}
					</CardTitle>
					<DollarSign className="size-4 text-muted-foreground" />
				</CardHeader>
				<CardContent>
					<div className="text-lg sm:text-2xl font-bold">
						${totalRevenue.toLocaleString()}
					</div>
					<p className="text-xs text-muted-foreground">
						{t("bookingChannels.stats.totalBookingValue")}
					</p>
				</CardContent>
			</Card>

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
