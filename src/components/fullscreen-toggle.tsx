import { Maximize, Minimize } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";

const FullscreenToggle = () => {
	const [isFullscreen, setIsFullscreen] = useState(false);

	// Check if the browser supports fullscreen API
	const isFullscreenSupported = () => {
		return !!(
			document.fullscreenEnabled ||
			(document as any).webkitFullscreenEnabled ||
			(document as any).mozFullScreenEnabled ||
			(document as any).msFullscreenEnabled
		);
	};

	// Update fullscreen state when it changes
	useEffect(() => {
		const handleFullscreenChange = () => {
			setIsFullscreen(
				!!(
					document.fullscreenElement ||
					(document as any).webkitFullscreenElement ||
					(document as any).mozFullScreenElement ||
					(document as any).msFullscreenElement
				),
			);
		};

		// Add event listeners for different browsers
		document.addEventListener("fullscreenchange", handleFullscreenChange);
		document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
		document.addEventListener("mozfullscreenchange", handleFullscreenChange);
		document.addEventListener("MSFullscreenChange", handleFullscreenChange);

		// Check initial state
		handleFullscreenChange();

		return () => {
			// Clean up event listeners
			document.removeEventListener("fullscreenchange", handleFullscreenChange);
			document.removeEventListener(
				"webkitfullscreenchange",
				handleFullscreenChange,
			);
			document.removeEventListener(
				"mozfullscreenchange",
				handleFullscreenChange,
			);
			document.removeEventListener(
				"MSFullscreenChange",
				handleFullscreenChange,
			);
		};
	}, []);

	const toggleFullscreen = async () => {
		if (!isFullscreenSupported()) {
			console.warn("Fullscreen API is not supported in this browser");
			return;
		}

		try {
			if (isFullscreen) {
				// Exit fullscreen
				if (document.exitFullscreen) {
					await document.exitFullscreen();
				} else if ((document as any).webkitExitFullscreen) {
					await (document as any).webkitExitFullscreen();
				} else if ((document as any).mozCancelFullScreen) {
					await (document as any).mozCancelFullScreen();
				} else if ((document as any).msExitFullscreen) {
					await (document as any).msExitFullscreen();
				}
			} else {
				// Enter fullscreen
				const docEl = document.documentElement;
				if (docEl.requestFullscreen) {
					await docEl.requestFullscreen();
				} else if ((docEl as any).webkitRequestFullscreen) {
					await (docEl as any).webkitRequestFullscreen();
				} else if ((docEl as any).mozRequestFullScreen) {
					await (docEl as any).mozRequestFullScreen();
				} else if ((docEl as any).msRequestFullscreen) {
					await (docEl as any).msRequestFullscreen();
				}
			}
		} catch (error) {
			console.error("Error toggling fullscreen:", error);
		}
	};

	// Don't render if fullscreen is not supported
	if (!isFullscreenSupported()) {
		return null;
	}

	return (
		<TooltipProvider>
			<Tooltip>
				<TooltipTrigger asChild>
					<Button
						variant="ghost"
						size="icon"
						onClick={toggleFullscreen}
						className="h-9 w-9"
					>
						{isFullscreen ? (
							<Minimize className="h-4 w-4" />
						) : (
							<Maximize className="h-4 w-4" />
						)}
						<span className="sr-only">
							{isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
						</span>
					</Button>
				</TooltipTrigger>
				<TooltipContent>
					<p>{isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}</p>
				</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	);
};

export default FullscreenToggle;
