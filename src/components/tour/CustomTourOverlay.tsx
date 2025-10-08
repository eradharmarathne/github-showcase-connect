import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import React, { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardFooter,
	CardHeader,
} from "@/components/ui/card";

interface TourStep {
	id: string;
	title: string;
	content: string;
	targetElement?: string;
	position?: "top" | "bottom" | "left" | "right";
	showSkip?: boolean;
	showBack?: boolean;
	showNext?: boolean;
	showFinish?: boolean;
	customButtons?: Array<{
		label: string;
		onClick: () => void;
		variant?: "default" | "outline" | "secondary" | "destructive" | "ghost";
	}>;
}

interface CustomTourOverlayProps {
	isOpen: boolean;
	step: TourStep | null;
	currentStepIndex: number;
	totalSteps: number;
	onNext: () => void;
	onBack: () => void;
	onSkip: () => void;
	onFinish: () => void;
	onClose: () => void;
}

export const CustomTourOverlay: React.FC<CustomTourOverlayProps> = ({
	isOpen,
	step,
	currentStepIndex,
	totalSteps,
	onNext,
	onBack,
	onSkip,
	onFinish,
	onClose,
}) => {
	const overlayRef = useRef<HTMLDivElement>(null);
	const cardRef = useRef<HTMLDivElement>(null);

	// Calculate position based on target element
	const getCardPosition = () => {
		if (!step?.targetElement) {
			return {
				top: "50%",
				left: "50%",
				transform: "translate(-50%, -50%)",
			};
		}

		const targetEl = document.querySelector(step.targetElement);
		if (!targetEl) {
			return {
				top: "50%",
				left: "50%",
				transform: "translate(-50%, -50%)",
			};
		}

		const rect = targetEl.getBoundingClientRect();
		const cardHeight = 300; // Approximate card height
		const cardWidth = 400; // Approximate card width
		const padding = 20;

		let top = rect.top;
		let left = rect.left;
		let transform = "";

		switch (step.position) {
			case "top":
				top = rect.top - cardHeight - padding;
				left = rect.left + rect.width / 2;
				transform = "translateX(-50%)";
				break;
			case "bottom":
				top = rect.bottom + padding;
				left = rect.left + rect.width / 2;
				transform = "translateX(-50%)";
				break;
			case "left":
				top = rect.top + rect.height / 2;
				left = rect.left - cardWidth - padding;
				transform = "translateY(-50%)";
				break;
			case "right":
				top = rect.top + rect.height / 2;
				left = rect.right + padding;
				transform = "translateY(-50%)";
				break;
			default:
				top = rect.bottom + padding;
				left = rect.left + rect.width / 2;
				transform = "translateX(-50%)";
		}

		// Ensure card stays within viewport
		const maxTop = window.innerHeight - cardHeight - padding;
		const maxLeft = window.innerWidth - cardWidth - padding;

		top = Math.max(padding, Math.min(top, maxTop));
		left = Math.max(padding, Math.min(left, maxLeft));

		return {
			top: `${top}px`,
			left: `${left}px`,
			transform,
		};
	};

	// Highlight target element
	useEffect(() => {
		if (!step?.targetElement) return;

		const targetEl = document.querySelector(step.targetElement);
		if (!targetEl) return;

		// Add highlight class
		targetEl.classList.add("tour-highlight");

		// Scroll element into view
		targetEl.scrollIntoView({
			behavior: "smooth",
			block: "center",
			inline: "center",
		});

		return () => {
			targetEl.classList.remove("tour-highlight");
		};
	}, [step?.targetElement]);

	// Handle keyboard navigation
	useEffect(() => {
		if (!isOpen) return;

		const handleKeyDown = (e: KeyboardEvent) => {
			switch (e.key) {
				case "Escape":
					onClose();
					break;
				case "ArrowRight":
				case "Enter":
					if (step?.showNext) {
						e.preventDefault();
						onNext();
					} else if (step?.showFinish) {
						e.preventDefault();
						onFinish();
					}
					break;
				case "ArrowLeft":
					if (step?.showBack) {
						e.preventDefault();
						onBack();
					}
					break;
			}
		};

		document.addEventListener("keydown", handleKeyDown);
		return () => document.removeEventListener("keydown", handleKeyDown);
	}, [isOpen, step, onNext, onBack, onFinish, onClose]);

	// Prevent body scroll when tour is open
	useEffect(() => {
		if (isOpen) {
			document.body.style.overflow = "hidden";
		} else {
			document.body.style.overflow = "auto";
		}

		return () => {
			document.body.style.overflow = "auto";
		};
	}, [isOpen]);

	if (!isOpen || !step) return null;

	const cardPosition = getCardPosition();

	return (
		<AnimatePresence>
			<motion.div
				ref={overlayRef}
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				exit={{ opacity: 0 }}
				className="fixed inset-0 z-[9999] bg-black/50"
				onClick={(e) => {
					if (e.target === overlayRef.current) {
						onClose();
					}
				}}
			>
				<motion.div
					ref={cardRef}
					initial={{ opacity: 0, scale: 0.9, y: 20 }}
					animate={{ opacity: 1, scale: 1, y: 0 }}
					exit={{ opacity: 0, scale: 0.9, y: 20 }}
					className="absolute w-96 max-w-[90vw]"
					style={cardPosition}
				>
					<Card className="border-2 border-primary/20 bg-background/95">
						<CardHeader className="pb-3">
							<div className="flex items-start justify-between">
								<div className="flex-1">
									<h3 className="text-lg font-semibold leading-tight">
										{step.title}
									</h3>
									<div className="flex items-center gap-2 mt-2">
										<div className="text-xs text-muted-foreground">
											Step {currentStepIndex + 1} of {totalSteps}
										</div>
										<div className="flex-1 bg-muted rounded-full h-1">
											<div
												className="bg-primary h-1 rounded-full transition-all duration-300"
												style={{
													width: `${((currentStepIndex + 1) / totalSteps) * 100}%`,
												}}
											/>
										</div>
									</div>
								</div>
								<Button
									variant="ghost"
									size="sm"
									onClick={onClose}
									className="h-8 w-8 p-0 ml-2"
								>
									<X className="h-4 w-4" />
								</Button>
							</div>
						</CardHeader>

						<CardContent className="py-3">
							<div
								className="text-sm text-muted-foreground leading-relaxed"
								dangerouslySetInnerHTML={{ __html: step.content }}
							/>
						</CardContent>

						<CardFooter className="pt-3 gap-2">
							{step.showSkip && (
								<Button variant="ghost" size="sm" onClick={onSkip}>
									Skip Tour
								</Button>
							)}

							<div className="flex-1" />

							{step.showBack && (
								<Button variant="outline" size="sm" onClick={onBack}>
									Back
								</Button>
							)}

							{step.customButtons?.map((button, index) => (
								<Button
									key={index}
									variant={button.variant || "default"}
									size="sm"
									onClick={button.onClick}
								>
									{button.label}
								</Button>
							))}

							{step.showNext && (
								<Button size="sm" onClick={onNext}>
									Next
								</Button>
							)}

							{step.showFinish && (
								<Button size="sm" onClick={onFinish}>
									Finish
								</Button>
							)}
						</CardFooter>
					</Card>
				</motion.div>
			</motion.div>
		</AnimatePresence>
	);
};
