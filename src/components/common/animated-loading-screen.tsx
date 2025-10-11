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

	// Animate dots
	useEffect(() => {
		const interval = setInterval(() => {
			setDots((prev) => {
				if (prev === "...") return "";
				return prev + ".";
			});
		}, 500);

		return () => clearInterval(interval);
	}, []);

	return (
		<div
			className={`fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center ${className}`}
		>
			<div className="flex flex-col items-center space-y-6 max-w-md mx-auto px-6">
				{showLogo && (
					<div className="relative">
						{/* Animated logo/icon */}
						<div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center animate-pulse">
							<div className="w-10 h-10 rounded-full bg-primary animate-spin">
								<div className="w-full h-full rounded-full border-4 border-primary-foreground border-t-transparent animate-spin" />
							</div>
						</div>

						{/* Ripple effect */}
						<div className="absolute inset-0 rounded-full bg-primary/10 animate-ping" />
						<div className="absolute inset-2 rounded-full bg-primary/20 animate-ping animation-delay-200" />
					</div>
				)}

				{/* Loading text */}
				<div className="text-center space-y-2">
					<h2 className="text-lg font-semibold text-foreground">
						{message || t("common.loading")}
						<span className="inline-block w-8 text-left">{dots}</span>
					</h2>
					<p className="text-sm text-muted-foreground">
						{t("common.pleaseWait")}
					</p>
				</div>

				{/* Progress bars */}
				<div className="w-full max-w-xs space-y-2">
					<div className="h-1 bg-muted rounded-full overflow-hidden">
						<div className="h-full bg-primary rounded-full animate-slide-right" />
					</div>
					<div className="h-1 bg-muted rounded-full overflow-hidden">
						<div
							className="h-full bg-primary/60 rounded-full animate-slide-right"
							style={{ animationDelay: "0.5s" }}
						/>
					</div>
					<div className="h-1 bg-muted rounded-full overflow-hidden">
						<div
							className="h-full bg-primary/30 rounded-full animate-slide-right"
							style={{ animationDelay: "1s" }}
						/>
					</div>
				</div>

				{/* Floating dots */}
				<div className="relative w-20 h-6">
					<div className="absolute left-0 w-2 h-2 bg-primary rounded-full animate-bounce" />
					<div
						className="absolute left-4 w-2 h-2 bg-primary/80 rounded-full animate-bounce"
						style={{ animationDelay: "0.1s" }}
					/>
					<div
						className="absolute left-8 w-2 h-2 bg-primary/60 rounded-full animate-bounce"
						style={{ animationDelay: "0.2s" }}
					/>
					<div
						className="absolute right-8 w-2 h-2 bg-primary/60 rounded-full animate-bounce"
						style={{ animationDelay: "0.3s" }}
					/>
					<div
						className="absolute right-4 w-2 h-2 bg-primary/80 rounded-full animate-bounce"
						style={{ animationDelay: "0.4s" }}
					/>
					<div
						className="absolute right-0 w-2 h-2 bg-primary rounded-full animate-bounce"
						style={{ animationDelay: "0.5s" }}
					/>
				</div>
			</div>
		</div>
	);
}
