import { AnimatePresence, motion } from "framer-motion";
import { Bell, BellOff, BellRing } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAuth } from "@/context/auth-context";
import { supabase } from "@/integrations/supabase/client";

const PREF_KEY = "cco-booking-alerts";

type NewBooking = {
	id: string;
	guest_name: string;
	check_in_date: string;
	check_out_date: string;
	reservation_number: string | null;
	booking_source: string | null;
	tenant_id: string;
};

function playChime() {
	try {
		const Ctx =
			window.AudioContext ||
			(window as unknown as { webkitAudioContext: typeof AudioContext })
				.webkitAudioContext;
		const ctx = new Ctx();
		[880, 1320].forEach((freq, i) => {
			const osc = ctx.createOscillator();
			const gain = ctx.createGain();
			osc.frequency.value = freq;
			osc.type = "sine";
			const t = ctx.currentTime + i * 0.18;
			gain.gain.setValueAtTime(0.0001, t);
			gain.gain.exponentialRampToValueAtTime(0.25, t + 0.02);
			gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
			osc.connect(gain).connect(ctx.destination);
			osc.start(t);
			osc.stop(t + 0.4);
		});
	} catch {
		// sound is optional
	}
}

const fmt = (d: string) =>
	new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric" });

/**
 * Bell button in the header. Listens for new bookings for the current hotel
 * and shows a sound + in-app toast + system notification while the app is open.
 */
export function BookingNotifications() {
	const { tenant } = useAuth();
	const [enabled, setEnabled] = useState(
		() => localStorage.getItem(PREF_KEY) !== "off",
	);
	const [permission, setPermission] = useState<NotificationPermission>(() =>
		"Notification" in window ? Notification.permission : "denied",
	);
	const [pulse, setPulse] = useState(false);
	const enabledRef = useRef(enabled);
	enabledRef.current = enabled;

	useEffect(() => {
		if (!tenant?.id) return;
		const channel = supabase
			.channel(`new-bookings-${tenant.id}-${Math.random().toString(36).slice(2)}`)
			.on(
				"postgres_changes",
				{
					event: "INSERT",
					schema: "public",
					table: "reservations",
					filter: `tenant_id=eq.${tenant.id}`,
				},
				(payload) => {
					if (!enabledRef.current) return;
					const b = payload.new as NewBooking;
					const title = "New booking";
					const body = `${b.guest_name} · ${fmt(b.check_in_date)} – ${fmt(b.check_out_date)}${b.booking_source ? ` · ${b.booking_source}` : ""}`;
					playChime();
					setPulse(true);
					window.setTimeout(() => setPulse(false), 4000);
					toast.success(title, { description: body });
					if ("Notification" in window && Notification.permission === "granted") {
						try {
							const n = new Notification(title, {
								body,
								icon: "/icons/icon-192.png",
								tag: b.id,
							});
							n.onclick = () => {
								window.focus();
								window.location.href = `/reservations/${b.id}`;
							};
						} catch {
							// some mobile browsers only allow notifications from a worker
						}
					}
				},
			)
			.subscribe();

		return () => {
			supabase.removeChannel(channel);
		};
	}, [tenant?.id]);

	const toggle = async () => {
		if (!enabled || permission !== "granted") {
			if ("Notification" in window && Notification.permission === "default") {
				const result = await Notification.requestPermission();
				setPermission(result);
			}
			setEnabled(true);
			localStorage.setItem(PREF_KEY, "on");
			toast.success("Booking alerts are on", {
				description:
					"You'll hear a sound and see an alert whenever a new booking arrives.",
			});
			return;
		}
		setEnabled(false);
		localStorage.setItem(PREF_KEY, "off");
		toast("Booking alerts are off");
	};

	const Icon = !enabled ? BellOff : pulse ? BellRing : Bell;
	const label = !enabled
		? "Turn on booking alerts"
		: permission === "granted"
			? "Booking alerts on"
			: "Allow booking alerts on this device";

	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<Button
					variant="ghost"
					size="icon"
					onClick={toggle}
					aria-label={label}
					className="relative"
				>
					<motion.span
						animate={pulse ? { rotate: [0, -18, 16, -10, 6, 0] } : { rotate: 0 }}
						transition={{ duration: 0.8 }}
						className="flex"
					>
						<Icon className={enabled ? "text-primary" : "text-muted-foreground"} />
					</motion.span>
					<AnimatePresence>
						{enabled && permission !== "granted" && (
							<motion.span
								initial={{ scale: 0 }}
								animate={{ scale: 1 }}
								exit={{ scale: 0 }}
								className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-destructive"
							/>
						)}
					</AnimatePresence>
				</Button>
			</TooltipTrigger>
			<TooltipContent>{label}</TooltipContent>
		</Tooltip>
	);
}
