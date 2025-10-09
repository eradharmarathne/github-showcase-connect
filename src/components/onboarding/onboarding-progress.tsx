import { Check, LoaderCircleIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
	Stepper,
	StepperContent,
	StepperIndicator,
	StepperItem,
	StepperNav,
	StepperPanel,
	StepperSeparator,
	StepperTitle,
	StepperTrigger,
} from "@/components/ui/stepper";
import { STEPS } from "./constants";
import { OnboardingProgressProps } from "./types";

export function OnboardingProgress({
	currentStep,
	totalSteps,
}: OnboardingProgressProps) {
	return (
		<div className="mb-8 pt-8">
			<Stepper
				value={currentStep}
				indicators={{
					completed: <Check className="size-4" />,
					loading: <LoaderCircleIcon className="size-4 animate-spin" />,
				}}
				className="space-y-8"
			>
				<StepperNav className="gap-3 mb-15">
					{STEPS.map((step, index) => {
						return (
							<StepperItem
								key={index}
								step={index + 1}
								className="relative mx-auto w-full flex-1 items-start"
							>
								<StepperTrigger
									className="flex flex-col items-start justify-center gap-2.5 grow"
									asChild
								>
									<StepperIndicator className="size-8 border-2 data-[state=completed]:text-white data-[state=completed]:bg-green-500 data-[state=inactive]:bg-transparent data-[state=inactive]:border-border data-[state=inactive]:text-muted-foreground">
										<step.icon className="size-4" />
									</StepperIndicator>
									<div className="flex flex-col items-start gap-1">
										<div className="text-[10px] font-semibold uppercase text-muted-foreground">
											Step {index + 1}
										</div>
										<StepperTitle className="text-start text-base font-semibold group-data-[state=inactive]/step:text-muted-foreground">
											{step.title}
										</StepperTitle>
										<div>
											<Badge
												variant="default"
												className="hidden rounded-md hover:bg-blue-200 group-data-[state=active]/step:inline-flex bg-blue-100 text-blue-800 border-blue-200 text-xs"
											>
												In Progress
											</Badge>

											<Badge
												variant="default"
												className="hidden rounded-md group-data-[state=completed]/step:inline-flex bg-green-100 text-green-800 border-green-200 text-xs"
											>
												Completed
											</Badge>

											<Badge
												variant="secondary"
												className="hidden rounded-md group-data-[state=inactive]/step:inline-flex text-muted-foreground text-xs"
											>
												Pending
											</Badge>
										</div>
									</div>
								</StepperTrigger>

								{STEPS.length > index + 1 && (
									<StepperSeparator className="absolute top-4 inset-x-0 start-9 m-0 group-data-[orientation=horizontal]/stepper-nav:w-[calc(100%-2rem)] group-data-[orientation=horizontal]/stepper-nav:flex-none group-data-[state=completed]/step:bg-green-500" />
								)}
							</StepperItem>
						);
					})}
				</StepperNav>

				<StepperPanel className="hidden">
					{/* We don't need the panel content as we handle it in the main component */}
					{STEPS.map((step, index) => (
						<StepperContent key={index} value={index + 1} />
					))}
				</StepperPanel>
			</Stepper>
		</div>
	);
}
