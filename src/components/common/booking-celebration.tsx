import { AnimatePresence, motion } from "framer-motion";
import { CalendarCheck2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

export interface CelebrationDetail {
	guestName?: string;
	reference?: string;
	checkIn?: string;
	checkOut?: string;
}

const EVENT = "cco:booking-created";

/** Call after a booking is saved to play the success animation. */
export function celebrateBooking(detail: CelebrationDetail = {}) {
	window.dispatchEvent(new CustomEvent<CelebrationDetail>(EVENT, { detail }));
}

const COLORS = [
	"hsl(var(--primary))",
	"hsl(45 93% 58%)",
	"hsl(38 92% 50%)",
	"hsl(142 71% 45%)",
	"hsl(199 89% 48%)",
	"hsl(var(--foreground))",
];

const fmt = (d?: string) =>
	d
		? new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric" })
		: "";

function Confetti({ seed }: { seed: number }) {
	const pieces = useMemo(
		() =>
			Array.from({ length: 46 }, (_, i) => {
				const angle = (i / 46) * Math.PI * 2 + seed;
				const dist = 140 + ((i * 37) % 160);
				return {
					x: Math.cos(angle) * dist,
					y: Math.sin(angle) * dist - 60,
					rot: (i * 53) % 360,
					color: COLORS[i % COLORS.length],
					w: 6 + (i % 3) * 3,
					h: 10 + (i % 4) * 3,
					delay: (i % 8) * 0.015,
				};
			}),
		[seed],
	);
	return (
		<div className="pointer-events-none absolute left-1/2 top-1/2">
			{pieces.map((p, i) => (
				<motion.span
					key={i}
					className="absolute rounded-sm"
					style={{ width: p.w, height: p.h, background: p.color }}
					initial={{ x: 0, y: 0, opacity: 1, rotate: 0, scale: 0.4 }}
					animate={{
						x: p.x,
						y: [0, p.y, p.y + 220],
						opacity: [1, 1, 0],
						rotate: p.rot + 540,
						scale: 1,
					}}
					transition={{ duration: 1.8, delay: p.delay, ease: "easeOut" }}
				/>
			))}
		</div>
	);
}

/** Mount once near the app root. */
export function BookingCelebration() {
	const [detail, setDetail] = useState<CelebrationDetail | null>(null);
	const [seed, setSeed] = useState(0);

	useEffect(() => {
		const onEvent = (e: Event) => {
			setDetail((e as CustomEvent<CelebrationDetail>).detail || {});
			setSeed(Math.random() * 10);
		};
		window.addEventListener(EVENT, onEvent);
		return () => window.removeEventListener(EVENT, onEvent);
	}, []);

	useEffect(() => {
		if (!detail) return;
		const id = window.setTimeout(() => setDetail(null), 2600);
		return () => window.clearTimeout(id);
	}, [detail]);

	return (
		<AnimatePresence>
			{detail && (
				<motion.div
					key={seed}
					className="fixed inset-0 z-[100] flex items-center justify-center bg-background/60 backdrop-blur-sm"
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					exit={{ opacity: 0 }}
					onClick={() => setDetail(null)}
				>
					<Confetti seed={seed} />
					<motion.div
						initial={{ scale: 0.7, y: 30, opacity: 0 }}
						animate={{ scale: 1, y: 0, opacity: 1 }}
						exit={{ scale: 0.9, opacity: 0 }}
						transition={{ type: "spring", stiffness: 260, damping: 20 }}
						className="relative mx-4 w-full max-w-sm rounded-3xl border bg-card p-8 text-center shadow-2xl"
					>
						<div className="relative mx-auto mb-5 h-24 w-24">
							<motion.span
								className="absolute inset-0 rounded-full bg-primary/20"
								initial={{ scale: 0.6, opacity: 0 }}
								animate={{ scale: [0.6, 1.5], opacity: [0.8, 0] }}
								transition={{ duration: 1.2, repeat: 1 }}
							/>
							<motion.div
								className="absolute inset-0 flex items-center justify-center rounded-full bg-primary shadow-lg"
								initial={{ scale: 0, rotate: -120 }}
								animate={{ scale: 1, rotate: 0 }}
								transition={{ type: "spring", stiffness: 240, damping: 14, delay: 0.1 }}
							>
								<svg viewBox="0 0 52 52" className="h-12 w-12">
									<motion.path
										d="M14 27 l8 8 l17 -18"
										fill="none"
										stroke="hsl(var(--primary-foreground))"
										strokeWidth={5}
										strokeLinecap="round"
										strokeLinejoin="round"
										initial={{ pathLength: 0 }}
										animate={{ pathLength: 1 }}
										transition={{ duration: 0.45, delay: 0.4, ease: "easeOut" }}
									/>
								</svg>
							</motion.div>
						</div>
						<motion.h3
							className="text-2xl font-bold text-foreground"
							initial={{ opacity: 0, y: 10 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ delay: 0.5 }}
						>
							Booking confirmed!
						</motion.h3>
						{detail.guestName && (
							<motion.p
								className="mt-2 text-base text-foreground"
								initial={{ opacity: 0, y: 10 }}
								animate={{ opacity: 1, y: 0 }}
								transition={{ delay: 0.6 }}
							>
								{detail.guestName}
							</motion.p>
						)}
						{(detail.checkIn || detail.reference) && (
							<motion.div
								className="mt-4 inline-flex items-center gap-2 rounded-full bg-muted px-4 py-1.5 text-sm text-muted-foreground"
								initial={{ opacity: 0, scale: 0.9 }}
								animate={{ opacity: 1, scale: 1 }}
								transition={{ delay: 0.7 }}
							>
								<CalendarCheck2 className="h-4 w-4 text-primary" />
								{detail.checkIn && (
									<span>
										{fmt(detail.checkIn)} – {fmt(detail.checkOut)}
									</span>
								)}
								{detail.reference && <span className="font-medium">#{detail.reference}</span>}
							</motion.div>
						)}
					</motion.div>
				</motion.div>
			)}
		</AnimatePresence>
	);
}
