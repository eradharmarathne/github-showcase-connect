import { motion } from "framer-motion";
import { BedDouble, CalendarDays, ChartLine, ConciergeBell } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

interface AnimatedLoadingScreenProps {
	message?: string;
	showLogo?: boolean;
	className?: string;
}

const STEPS = [
	{ icon: ConciergeBell, text: "Opening the front desk" },
	{ icon: BedDouble, text: "Checking your rooms" },
	{ icon: CalendarDays, text: "Loading today's bookings" },
	{ icon: ChartLine, text: "Preparing your numbers" },
];

const ORBIT = [BedDouble, CalendarDays, ChartLine, ConciergeBell];
const ease = [0.22, 1, 0.36, 1] as const;

export function AnimatedLoadingScreen({
	message,
	showLogo = true,
	className = "",
}: AnimatedLoadingScreenProps) {
	const { t } = useTranslation();
	const [step, setStep] = useState(0);

	useEffect(() => {
		const id = setInterval(() => setStep((s) => (s + 1) % STEPS.length), 1400);
		return () => clearInterval(id);
	}, []);

	const StepIcon = STEPS[step].icon;

	return (
		<motion.div
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			exit={{ opacity: 0 }}
			className={`fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-black ${className}`}
		>
			{/* Ambient moving glows */}
			<motion.div
				className="absolute -left-24 top-1/4 h-80 w-80 rounded-full bg-yellow-500/15 blur-3xl"
				animate={{ x: [0, 120, 0], y: [0, -40, 0] }}
				transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
			/>
			<motion.div
				className="absolute -right-24 bottom-1/4 h-72 w-72 rounded-full bg-amber-400/10 blur-3xl"
				animate={{ x: [0, -100, 0], y: [0, 50, 0] }}
				transition={{ duration: 11, repeat: Infinity, ease: "easeInOut" }}
			/>
			{/* Subtle grid */}
			<div
				className="absolute inset-0 opacity-[0.07]"
				style={{
					backgroundImage:
						"linear-gradient(rgba(234,179,8,.6) 1px, transparent 1px), linear-gradient(90deg, rgba(234,179,8,.6) 1px, transparent 1px)",
					backgroundSize: "48px 48px",
					maskImage: "radial-gradient(circle at center, black 20%, transparent 70%)",
					WebkitMaskImage: "radial-gradient(circle at center, black 20%, transparent 70%)",
				}}
			/>

			<div className="relative flex flex-col items-center px-6">
				{showLogo && (
					<div className="relative flex h-44 w-44 items-center justify-center">
						{/* Orbiting hotel icons */}
						<motion.div
							className="absolute inset-0"
							animate={{ rotate: 360 }}
							transition={{ duration: 14, repeat: Infinity, ease: "linear" }}
						>
							{ORBIT.map((Icon, i) => {
								const a = (i / ORBIT.length) * Math.PI * 2;
								return (
									<motion.div
										key={i}
										className="absolute flex h-9 w-9 items-center justify-center rounded-xl border border-yellow-500/30 bg-black/70 text-yellow-400 shadow-lg shadow-yellow-500/10"
										style={{
											left: `calc(50% + ${Math.cos(a) * 80}px - 18px)`,
											top: `calc(50% + ${Math.sin(a) * 80}px - 18px)`,
										}}
										animate={{ rotate: -360 }}
										transition={{ duration: 14, repeat: Infinity, ease: "linear" }}
									>
										<Icon className="h-4 w-4" />
									</motion.div>
								);
							})}
						</motion.div>

						{/* Drawn ring */}
						<svg className="absolute h-28 w-28 -rotate-90" viewBox="0 0 100 100">
							<circle cx="50" cy="50" r="46" fill="none" stroke="rgba(234,179,8,0.15)" strokeWidth="2" />
							<motion.circle
								cx="50"
								cy="50"
								r="46"
								fill="none"
								stroke="#eab308"
								strokeWidth="3"
								strokeLinecap="round"
								initial={{ pathLength: 0 }}
								animate={{ pathLength: [0, 1, 0], rotate: [0, 360] }}
								style={{ originX: "50%", originY: "50%" }}
								transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
							/>
						</svg>

						{/* Monogram */}
						<motion.div
							initial={{ scale: 0, rotate: -90 }}
							animate={{ scale: [1, 1.06, 1], rotate: 0 }}
							transition={{
								scale: { duration: 2, repeat: Infinity, ease: "easeInOut" },
								rotate: { type: "spring", stiffness: 160, damping: 12 },
							}}
							className="relative z-10 flex h-16 w-16 items-center justify-center rounded-full bg-yellow-500 shadow-[0_0_40px_rgba(234,179,8,0.45)]"
						>
							<span className="text-2xl font-bold tracking-tight text-black">CC</span>
						</motion.div>
					</div>
				)}

				<motion.h1
					initial={{ opacity: 0, y: 12, letterSpacing: "0.3em" }}
					animate={{ opacity: 1, y: 0, letterSpacing: "0.05em" }}
					transition={{ duration: 0.9, ease }}
					className="mt-6 text-3xl font-bold animate-shimmer"
				>
					CheckingCheckout
				</motion.h1>

				{/* Rotating step text */}
				<div className="mt-5 h-6 overflow-hidden">
					<motion.div
						key={step}
						initial={{ y: 20, opacity: 0 }}
						animate={{ y: 0, opacity: 1 }}
						transition={{ duration: 0.4, ease }}
						className="flex items-center gap-2 text-sm text-gray-300"
					>
						<StepIcon className="h-4 w-4 text-yellow-400" />
						<span>{message && step === 0 ? message : STEPS[step].text || t("common.loading")}</span>
					</motion.div>
				</div>

				{/* Progress shimmer bar */}
				<div className="relative mt-6 h-1 w-56 overflow-hidden rounded-full bg-white/10">
					<motion.div
						className="absolute inset-y-0 w-1/3 rounded-full bg-gradient-to-r from-transparent via-yellow-400 to-transparent"
						animate={{ x: ["-100%", "300%"] }}
						transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
					/>
				</div>
			</div>
		</motion.div>
	);
}
