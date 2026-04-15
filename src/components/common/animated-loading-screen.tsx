import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

interface AnimatedLoadingScreenProps {
	message?: string;
	showLogo?: boolean;
	className?: string;
}

export function AnimatedLoadingScreen({
	message,
	showLogo = true,
	className = "",
}: AnimatedLoadingScreenProps) {
	const { t } = useTranslation();
	const [dots, setDots] = useState("");

	useEffect(() => {
		const interval = setInterval(() => {
			setDots((prev) => (prev === "..." ? "" : prev + "."));
		}, 500);
		return () => clearInterval(interval);
	}, []);

	return (
		<div
			className={`fixed inset-0 z-50 flex items-center justify-center bg-black ${className}`}
		>
			<div className="flex flex-col items-center space-y-8">
				{showLogo && (
					<div className="relative flex items-center justify-center w-32 h-32">
						{/* Concentric pulse rings */}
						<div className="absolute inset-0 rounded-full border-2 border-yellow-500/30 animate-pulse-ring" />
						<div
							className="absolute inset-0 rounded-full border-2 border-yellow-400/20 animate-pulse-ring"
							style={{ animationDelay: "0.5s" }}
						/>
						<div
							className="absolute inset-0 rounded-full border border-yellow-300/10 animate-pulse-ring"
							style={{ animationDelay: "1s" }}
						/>

						{/* Spinning ring */}
						<div className="absolute inset-2 rounded-full animate-spin-slow">
							<svg className="w-full h-full" viewBox="0 0 100 100">
								<circle
									cx="50"
									cy="50"
									r="46"
									fill="none"
									stroke="rgba(234,179,8,0.15)"
									strokeWidth="2"
								/>
								<circle
									cx="50"
									cy="50"
									r="46"
									fill="none"
									stroke="#eab308"
									strokeWidth="2.5"
									strokeLinecap="round"
									strokeDasharray="70 220"
								/>
							</svg>
						</div>

						{/* CC Monogram */}
						<div className="relative z-10 flex items-center justify-center w-16 h-16 rounded-full bg-yellow-500 shadow-lg shadow-yellow-500/30">
							<span className="text-2xl font-bold text-black tracking-tight">
								CC
							</span>
						</div>
					</div>
				)}

				{/* Shiny brand name */}
				<h1 className="text-3xl font-bold tracking-wide animate-shimmer animate-glow-pulse">
					CheckingCheckout
				</h1>

				{/* Loading text */}
				<div className="text-center space-y-1">
					<p className="text-sm text-gray-400">
						{message || t("common.loading")}
						<span className="inline-block w-6 text-left">{dots}</span>
					</p>
				</div>

				{/* Bouncing dots */}
				<div className="flex space-x-2">
					<div className="w-2 h-2 rounded-full bg-yellow-500 animate-bounce-dot" />
					<div
						className="w-2 h-2 rounded-full bg-yellow-400 animate-bounce-dot"
						style={{ animationDelay: "0.2s" }}
					/>
					<div
						className="w-2 h-2 rounded-full bg-yellow-300 animate-bounce-dot"
						style={{ animationDelay: "0.4s" }}
					/>
				</div>
			</div>
		</div>
	);
}
