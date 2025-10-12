import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Cell, Pie, PieChart } from "recharts";
import { BookingSourceChartSkeleton } from "@/components/skeleton/booking-source-chart-skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
} from "@/components/ui/chart";
import { useAuth } from "@/context/auth-context";
import { supabase } from "@/integrations/supabase/client";

interface BookingSourceData {
	source: string;
	count: number;
	percentage: number;
}

interface BookingSourceChartProps {
	selectedLocation: string;
	selectedMonth: string;
}

// Color mapping for specific booking sources
const SOURCE_COLORS: Record<string, string> = {
	direct: "hsl(220, 70%, 50%)", // Blue - Primary booking channel
	airbnb: "hsl(0, 82%, 60%)", // Airbnb red
	booking_com: "hsl(220, 100%, 40%)", // Booking.com blue
	expedia: "hsl(45, 100%, 50%)", // Expedia yellow
	agoda: "hsl(340, 82%, 52%)", // Agoda pink/magenta
	beds24: "hsl(120, 60%, 45%)", // Green
	manual: "hsl(270, 60%, 55%)", // Purple
	online: "hsl(190, 70%, 50%)", // Cyan
	phone: "hsl(30, 80%, 55%)", // Orange
	email: "hsl(280, 60%, 60%)", // Violet
	walk_in: "hsl(160, 60%, 45%)", // Teal
	ical: "hsl(25, 70%, 55%)", // Brown/orange
};

// Fallback colors for any unmapped sources
const FALLBACK_COLORS = [
	"hsl(210, 40%, 70%)",
	"hsl(160, 40%, 70%)",
	"hsl(30, 40%, 70%)",
	"hsl(270, 40%, 70%)",
	"hsl(120, 40%, 70%)",
	"hsl(60, 40%, 70%)",
	"hsl(330, 40%, 70%)",
];

// Mapping for display names
const SOURCE_DISPLAY_NAMES: Record<string, string> = {
	direct: "Direct",
	airbnb: "Airbnb",
	booking_com: "Booking.com",
	expedia: "Expedia",
	agoda: "Agoda",
	beds24: "Beds24",
	manual: "Manual",
	online: "Online",
	phone: "Phone",
	email: "Email",
	walk_in: "Walk-in",
	ical: "iCal",
};

export function BookingSourceChart({
	selectedLocation,
	selectedMonth,
}: BookingSourceChartProps) {
	const { tenant } = useAuth();
	const { t } = useTranslation();
	const [sourceData, setSourceData] = useState<BookingSourceData[]>([]);
	const [loading, setLoading] = useState(false);
	const [totalBookings, setTotalBookings] = useState(0);
	// Shortcut action handlers

	useEffect(() => {
		const fetchBookingSourceData = async () => {
			if (!tenant?.id) return;

			setLoading(true);
			try {
				let query = supabase
					.from("reservations")
					.select("booking_source")
					.eq("tenant_id", tenant.id)
					.not("booking_source", "is", null); // Filter by location if selected
				if (selectedLocation) {
					query = query.eq("location_id", selectedLocation);
				}

				// Filter by month if selected
				if (selectedMonth) {
					const startDate = `${selectedMonth}-01`;
					const year = parseInt(selectedMonth.split("-")[0]);
					const month = parseInt(selectedMonth.split("-")[1]);
					const endDate = new Date(year, month, 0).toISOString().split("T")[0];
					query = query
						.gte("check_in_date", startDate)
						.lte("check_in_date", endDate);
				} else {
					// Default to current month if no month selected
					const now = new Date();
					const startDate = new Date(now.getFullYear(), now.getMonth(), 1)
						.toISOString()
						.split("T")[0];
					const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0)
						.toISOString()
						.split("T")[0];
					query = query
						.gte("check_in_date", startDate)
						.lte("check_in_date", endDate);
				}

				const { data: reservations, error } = await query;

				if (error) throw error;

				// Process the data to count booking sources
				const sourceCounts: Record<string, number> = {};
				reservations?.forEach((reservation) => {
					const source = reservation.booking_source || "direct";
					sourceCounts[source] = (sourceCounts[source] || 0) + 1;
				});

				const total = Object.values(sourceCounts).reduce(
					(sum, count) => sum + count,
					0,
				);
				setTotalBookings(total);

				// Convert to chart data format
				const chartData: BookingSourceData[] = Object.entries(sourceCounts)
					.map(([source, count]) => ({
						source: SOURCE_DISPLAY_NAMES[source] || source,
						count,
						percentage: total > 0 ? (count / total) * 100 : 0,
					}))
					.sort((a, b) => b.count - a.count); // Sort by count descending

				setSourceData(chartData);
			} catch (error) {
				console.error("Error fetching booking source data:", error);
			} finally {
				setLoading(false);
			}
		};

		fetchBookingSourceData();
	}, [selectedLocation, selectedMonth, tenant?.id]);

	if (loading) {
		return <BookingSourceChartSkeleton />;
	}

	if (sourceData.length === 0) {
		return (
			<Card className="bg-card border">
				<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
					<CardTitle className="text-sm font-medium">
						{t("dashboard.bookingSources.title")}
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="h-[400px] flex items-center justify-center text-muted-foreground">
						{t("dashboard.bookingSources.noData")}
					</div>
				</CardContent>
			</Card>
		);
	}

	return (
		<Card className="bg-card border w-full sm:w-fit h-fit">
			<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
				<CardTitle className="text-sm font-medium">
					Booking Sources & Quick Actions
				</CardTitle>
			</CardHeader>
			<CardContent>
				<div className="flex justify-center flex-col flex-1">
					<ChartContainer
						config={{}}
						className="mx-auto aspect-square h-[220px]"
					>
						<PieChart>
							<Pie
								data={sourceData}
								cx="50%"
								cy="50%"
								innerRadius={50}
								outerRadius={90}
								paddingAngle={2}
								dataKey="count"
							>
								{sourceData.map((entry, index) => (
									<Cell
										key={`cell-${index}`}
										fill={
											SOURCE_COLORS[entry.source] ||
											FALLBACK_COLORS[index % FALLBACK_COLORS.length]
										}
									/>
								))}
							</Pie>
							<ChartTooltip
								content={
									<ChartTooltipContent
										labelFormatter={(value) => value}
										formatter={(value, name, entry) => [
											`${entry.payload.count} bookings (${entry.payload.percentage.toFixed(1)}%)`,
											entry.payload.source,
										]}
									/>
								}
							/>
						</PieChart>
					</ChartContainer>

					{/* Legend */}
					<div className="mt-2 flex-1">
						<div className="grid grid-cols-1 gap-1 text-xs">
							{sourceData.map((entry, index) => (
								<div key={entry.source} className="flex items-center gap-2">
									<div
										className="w-2 h-2 rounded-full flex-shrink-0"
										style={{
											backgroundColor:
												SOURCE_COLORS[entry.source] ||
												FALLBACK_COLORS[index % FALLBACK_COLORS.length],
										}}
									/>
									<span className="truncate text-xs">
										{entry.source}: {entry.count} ({entry.percentage.toFixed(1)}
										%)
									</span>
								</div>
							))}
						</div>
						<span className="text-xs text-muted-foreground">
							{totalBookings} total bookings
						</span>
					</div>
				</div>
			</CardContent>
		</Card>
	);
}
