import {
	AbsoluteFill,
	interpolate,
	Sequence,
	spring,
	useCurrentFrame,
	useVideoConfig,
} from "remotion";

export type RecapData = {
	hotelName: string;
	monthLabel: string;
	bookings: number;
	nights: number;
	guests: number;
	revenue: number;
	currencySymbol: string;
	occupancy: number | null;
	topSource: string | null;
	topSourceShare: number;
	busiestDay: string | null;
	sources: { name: string; count: number }[];
};

export const SCENE = 75; // frames per scene at 30fps
export const RECAP_SCENES = 6;
export const RECAP_FPS = 30;
export const RECAP_DURATION = SCENE * RECAP_SCENES;

const GOLD = "hsl(45 93% 52%)";
const INK = "hsl(222 30% 6%)";

function useEnter(delay = 0) {
	const frame = useCurrentFrame();
	const { fps } = useVideoConfig();
	return spring({ frame: frame - delay, fps, config: { damping: 14, stiffness: 120 } });
}

function Count({ to, prefix = "", suffix = "", delay = 0 }: { to: number; prefix?: string; suffix?: string; delay?: number }) {
	const frame = useCurrentFrame();
	const v = interpolate(frame - delay, [0, 40], [0, to], {
		extrapolateLeft: "clamp",
		extrapolateRight: "clamp",
		easing: (t) => 1 - Math.pow(1 - t, 3),
	});
	return (
		<span style={{ fontVariantNumeric: "tabular-nums" }}>
			{prefix}
			{Math.round(v).toLocaleString()}
			{suffix}
		</span>
	);
}

function Background() {
	const frame = useCurrentFrame();
	const x = Math.sin(frame / 40) * 120;
	const y = Math.cos(frame / 55) * 80;
	return (
		<AbsoluteFill style={{ background: INK, overflow: "hidden" }}>
			<div
				style={{
					position: "absolute",
					width: 700,
					height: 700,
					borderRadius: "50%",
					left: 200 + x,
					top: -200 + y,
					background: "radial-gradient(circle, hsl(45 93% 52% / 0.28), transparent 65%)",
				}}
			/>
			<div
				style={{
					position: "absolute",
					width: 600,
					height: 600,
					borderRadius: "50%",
					right: 100 - x,
					bottom: -250 - y,
					background: "radial-gradient(circle, hsl(30 90% 50% / 0.18), transparent 65%)",
				}}
			/>
			<AbsoluteFill
				style={{
					backgroundImage:
						"linear-gradient(hsl(45 93% 52% / .07) 1px, transparent 1px), linear-gradient(90deg, hsl(45 93% 52% / .07) 1px, transparent 1px)",
					backgroundSize: "60px 60px",
				}}
			/>
		</AbsoluteFill>
	);
}

function Label({ children }: { children: React.ReactNode }) {
	const s = useEnter(0);
	return (
		<div
			style={{
				color: GOLD,
				fontSize: 30,
				letterSpacing: 8,
				textTransform: "uppercase",
				fontWeight: 600,
				opacity: s,
				transform: `translateY(${(1 - s) * 20}px)`,
			}}
		>
			{children}
		</div>
	);
}

function BigStat({ label, children, sub }: { label: string; children: React.ReactNode; sub?: string }) {
	const s = useEnter(6);
	const frame = useCurrentFrame();
	const out = interpolate(frame, [SCENE - 12, SCENE], [1, 0], { extrapolateLeft: "clamp" });
	return (
		<AbsoluteFill style={{ alignItems: "center", justifyContent: "center", opacity: out, color: "white", textAlign: "center" }}>
			<Label>{label}</Label>
			<div
				style={{
					fontSize: 190,
					fontWeight: 800,
					lineHeight: 1.05,
					marginTop: 20,
					transform: `scale(${0.6 + s * 0.4})`,
					opacity: s,
					textShadow: "0 0 60px hsl(45 93% 52% / 0.35)",
				}}
			>
				{children}
			</div>
			{sub && (
				<div style={{ fontSize: 36, color: "hsl(0 0% 100% / 0.7)", marginTop: 18, opacity: useEnter(18) }}>
					{sub}
				</div>
			)}
		</AbsoluteFill>
	);
}

function Intro({ d }: { d: RecapData }) {
	const s = useEnter(0);
	const t = useEnter(12);
	const frame = useCurrentFrame();
	const out = interpolate(frame, [SCENE - 12, SCENE], [1, 0], { extrapolateLeft: "clamp" });
	return (
		<AbsoluteFill style={{ alignItems: "center", justifyContent: "center", color: "white", opacity: out }}>
			<div
				style={{
					width: 150,
					height: 150,
					borderRadius: "50%",
					background: GOLD,
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					fontSize: 64,
					fontWeight: 800,
					color: INK,
					transform: `scale(${s}) rotate(${(1 - s) * -180}deg)`,
					boxShadow: "0 0 80px hsl(45 93% 52% / 0.5)",
				}}
			>
				CC
			</div>
			<div style={{ fontSize: 84, fontWeight: 800, marginTop: 40, opacity: t, transform: `translateY(${(1 - t) * 30}px)` }}>
				{d.monthLabel} Recap
			</div>
			<div style={{ fontSize: 40, color: GOLD, marginTop: 12, opacity: useEnter(22) }}>{d.hotelName}</div>
		</AbsoluteFill>
	);
}

function Sources({ d }: { d: RecapData }) {
	const frame = useCurrentFrame();
	const { fps } = useVideoConfig();
	const max = Math.max(1, ...d.sources.map((x) => x.count));
	const out = interpolate(frame, [SCENE - 12, SCENE], [1, 0], { extrapolateLeft: "clamp" });
	return (
		<AbsoluteFill style={{ alignItems: "center", justifyContent: "center", color: "white", opacity: out }}>
			<Label>Where guests came from</Label>
			<div style={{ width: 1200, marginTop: 50, display: "flex", flexDirection: "column", gap: 26 }}>
				{d.sources.slice(0, 4).map((src, i) => {
					const p = spring({ frame: frame - 8 - i * 6, fps, config: { damping: 16 } });
					return (
						<div key={src.name} style={{ display: "flex", alignItems: "center", gap: 24 }}>
							<div style={{ width: 300, fontSize: 36, textAlign: "right", textTransform: "capitalize" }}>{src.name}</div>
							<div style={{ flex: 1, height: 52, borderRadius: 26, background: "hsl(0 0% 100% / 0.08)", overflow: "hidden" }}>
								<div
									style={{
										height: "100%",
										width: `${(src.count / max) * 100 * p}%`,
										borderRadius: 26,
										background: i === 0 ? GOLD : "hsl(45 93% 52% / 0.55)",
									}}
								/>
							</div>
							<div style={{ width: 90, fontSize: 36, fontWeight: 700 }}>{Math.round(src.count * p)}</div>
						</div>
					);
				})}
				{d.sources.length === 0 && <div style={{ fontSize: 40, textAlign: "center", opacity: 0.7 }}>No bookings yet</div>}
			</div>
		</AbsoluteFill>
	);
}

function Outro({ d }: { d: RecapData }) {
	const s = useEnter(0);
	return (
		<AbsoluteFill style={{ alignItems: "center", justifyContent: "center", color: "white", textAlign: "center" }}>
			<div style={{ fontSize: 80, fontWeight: 800, opacity: s, transform: `scale(${0.8 + s * 0.2})` }}>
				Great month, team!
			</div>
			<div style={{ fontSize: 38, color: "hsl(0 0% 100% / 0.75)", marginTop: 20, opacity: useEnter(10) }}>
				{d.busiestDay ? `Busiest check-in day: ${d.busiestDay}` : "Keep the bookings coming"}
			</div>
			<div style={{ fontSize: 30, color: GOLD, marginTop: 50, letterSpacing: 6, opacity: useEnter(20) }}>CHECKINGCHECKOUT</div>
		</AbsoluteFill>
	);
}

export function MonthlyRecapComposition(d: RecapData) {
	const frame = useCurrentFrame();
	const progress = frame / RECAP_DURATION;
	return (
		<AbsoluteFill style={{ fontFamily: "inherit" }}>
			<Background />
			<Sequence durationInFrames={SCENE}>
				<Intro d={d} />
			</Sequence>
			<Sequence from={SCENE} durationInFrames={SCENE}>
				<BigStat label="Bookings" sub={`${d.guests.toLocaleString()} guests welcomed`}>
					<Count to={d.bookings} delay={6} />
				</BigStat>
			</Sequence>
			<Sequence from={SCENE * 2} durationInFrames={SCENE}>
				<BigStat
					label="Nights sold"
					sub={d.occupancy !== null ? `${d.occupancy}% occupancy` : undefined}
				>
					<Count to={d.nights} delay={6} />
				</BigStat>
			</Sequence>
			<Sequence from={SCENE * 3} durationInFrames={SCENE}>
				<BigStat label="Booking value">
					<span style={{ fontSize: 140 }}>
						<Count to={d.revenue} prefix={`${d.currencySymbol} `} delay={6} />
					</span>
				</BigStat>
			</Sequence>
			<Sequence from={SCENE * 4} durationInFrames={SCENE}>
				<Sources d={d} />
			</Sequence>
			<Sequence from={SCENE * 5} durationInFrames={SCENE}>
				<Outro d={d} />
			</Sequence>
			<div
				style={{
					position: "absolute",
					left: 0,
					bottom: 0,
					height: 8,
					width: `${progress * 100}%`,
					background: GOLD,
				}}
			/>
		</AbsoluteFill>
	);
}
