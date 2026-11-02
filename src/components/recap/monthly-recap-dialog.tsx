import { Player } from "@remotion/player";
import { useQuery } from "@tanstack/react-query";
import { endOfMonth, format, getDaysInMonth, startOfMonth, subMonths } from "date-fns";
import { Clapperboard, Loader2 } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/context/auth-context";
import { useLocationContext } from "@/context/location-context";
import { supabase } from "@/integrations/supabase/client";
import { getCurrencySymbol } from "@/utils/currency";
import {
	MonthlyRecapComposition,
	RECAP_DURATION,
	RECAP_FPS,
	type RecapData,
} from "./monthly-recap-composition";

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function useRecapData(monthKey: string, enabled: boolean) {
	const { tenant } = useAuth();
	const { selectedLocation, getSelectedLocationData } = useLocationContext();

	return useQuery({
		queryKey: ["monthly-recap", tenant?.id, selectedLocation, monthKey],
		enabled: enabled && !!tenant?.id,
		queryFn: async (): Promise<RecapData> => {
			const monthDate = new Date(`${monthKey}-01T00:00:00`);
			const start = format(startOfMonth(monthDate), "yyyy-MM-dd");
			const end = format(endOfMonth(monthDate), "yyyy-MM-dd");

			let q = supabase
				.from("reservations")
				.select("check_in_date, nights, adults, children, total_amount, currency, booking_source, status")
				.eq("tenant_id", tenant!.id)
				.gte("check_in_date", start)
				.lte("check_in_date", end)
				.neq("status", "cancelled")
				.limit(1000);
			if (selectedLocation) q = q.eq("location_id", selectedLocation);
			const { data, error } = await q;
			if (error) throw error;

			let rq = supabase.from("rooms").select("id", { count: "exact", head: true }).eq("tenant_id", tenant!.id);
			if (selectedLocation) rq = rq.eq("location_id", selectedLocation);
			const { count: roomCount } = await rq;

			const rows = data || [];
			const currencyCount = new Map<string, number>();
			const sourceCount = new Map<string, number>();
			const dayCount = new Array(7).fill(0);
			let nights = 0;
			let guests = 0;
			for (const r of rows) {
				nights += r.nights || 0;
				guests += (r.adults || 0) + (r.children || 0);
				currencyCount.set(r.currency, (currencyCount.get(r.currency) || 0) + 1);
				const src = (r.booking_source || "direct").replace(/_/g, " ");
				sourceCount.set(src, (sourceCount.get(src) || 0) + 1);
				dayCount[new Date(`${r.check_in_date}T00:00:00`).getDay()]++;
			}
			const mainCurrency =
				[...currencyCount.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || "LKR";
			const revenue = rows
				.filter((r) => r.currency === mainCurrency)
				.reduce((s, r) => s + Number(r.total_amount || 0), 0);
			const sources = [...sourceCount.entries()]
				.map(([name, count]) => ({ name, count }))
				.sort((a, b) => b.count - a.count);
			const maxDay = Math.max(...dayCount);
			const capacity = (roomCount || 0) * getDaysInMonth(monthDate);

			return {
				hotelName: getSelectedLocationData()?.name || tenant!.name || "Your hotel",
				monthLabel: format(monthDate, "MMMM yyyy"),
				bookings: rows.length,
				nights,
				guests,
				revenue: Math.round(revenue),
				currencySymbol: getCurrencySymbol(mainCurrency),
				occupancy: capacity > 0 ? Math.min(100, Math.round((nights / capacity) * 100)) : null,
				topSource: sources[0]?.name || null,
				topSourceShare: rows.length ? Math.round(((sources[0]?.count || 0) / rows.length) * 100) : 0,
				busiestDay: maxDay > 0 ? WEEKDAYS[dayCount.indexOf(maxDay)] : null,
				sources,
			};
		},
	});
}

export function MonthlyRecapDialog() {
	const [open, setOpen] = useState(false);
	const months = useMemo(
		() =>
			Array.from({ length: 12 }, (_, i) => {
				const d = subMonths(new Date(), i);
				return { key: format(d, "yyyy-MM"), label: format(d, "MMMM yyyy") };
			}),
		[],
	);
	const [monthKey, setMonthKey] = useState(months[0].key);
	const { data, isLoading, error } = useRecapData(monthKey, open);

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button variant="outline" className="gap-2">
					<Clapperboard className="h-4 w-4 text-primary" />
					Monthly recap
				</Button>
			</DialogTrigger>
			<DialogContent className="max-w-4xl p-4 sm:p-6">
				<DialogHeader>
					<DialogTitle>Monthly recap video</DialogTitle>
					<DialogDescription>
						A short animated summary of your bookings, nights and income.
					</DialogDescription>
				</DialogHeader>
				<Select value={monthKey} onValueChange={setMonthKey}>
					<SelectTrigger className="w-full sm:w-56">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						{months.map((m) => (
							<SelectItem key={m.key} value={m.key}>
								{m.label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
				<div className="overflow-hidden rounded-xl border bg-muted aspect-video">
					{isLoading || !data ? (
						<div className="flex h-full items-center justify-center text-muted-foreground">
							{error ? (
								"Couldn't load this month's numbers."
							) : (
								<Loader2 className="h-6 w-6 animate-spin" />
							)}
						</div>
					) : (
						<Player
							key={monthKey}
							component={MonthlyRecapComposition}
							inputProps={data}
							durationInFrames={RECAP_DURATION}
							fps={RECAP_FPS}
							compositionWidth={1920}
							compositionHeight={1080}
							style={{ width: "100%", height: "100%" }}
							controls
							autoPlay
							loop
							acknowledgeRemotionLicense
						/>
					)}
				</div>
			</DialogContent>
		</Dialog>
	);
}
