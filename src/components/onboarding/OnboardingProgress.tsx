import { Progress } from "@/components/ui/progress";
import { STEPS } from "./constants";
import { OnboardingProgressProps } from "./types";

export function OnboardingProgress({
	currentStep,
	totalSteps,
}: OnboardingProgressProps) {
	return (
		<div className="text-center mb-8 pt-8">
			<div className="flex items-center justify-center gap-4 mb-4">
				{STEPS.map((step) => (
					<div key={step.id} className="flex items-center">
						<div
							className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium border-2 ${
								currentStep >= step.id
									? "bg-primary text-primary-foreground border-primary"
									: "bg-background text-muted-foreground border-muted-foreground/30"
							}`}
						>
							{step.id}
						</div>
						{step.id < STEPS.length && (
							<div
								className={`w-12 h-0.5 mx-2 ${
									currentStep > step.id
										? "bg-primary"
										: "bg-muted-foreground/30"
								}`}
							/>
						)}
					</div>
				))}
			</div>

			<Progress
				value={(currentStep / totalSteps) * 100}
				className="w-full max-w-md mx-auto mb-2"
			/>
			<p className="text-sm text-muted-foreground">
				Step {currentStep} of {totalSteps}:{" "}
				{STEPS[currentStep - 1]?.description}
			</p>
		</div>
	);
}
