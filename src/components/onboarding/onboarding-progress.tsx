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

export function OnboardingProgress({ currentStep }: OnboardingProgressProps) {
	return (
		<div className="mb-2 sm:mb-8 pt-0 sm:pt-8">
			<Stepper
				value={currentStep}
				indicators={{
					completed: <Check className="size-3 sm:size-4" />,
					loading: (
						<LoaderCircleIcon className="size-3 sm:size-4 animate-spin" />
					),
				}}
				className="space-y-4 sm:space-y-8"
			>
				<StepperNav className="gap-1 sm:gap-3 mb-2 sm:mb-15">
					{STEPS.map((step, index) => {
						return (
							<StepperItem
								key={index}
								step={index + 1}
								className="relative mx-auto w-full flex-1 items-start"
							>
								<StepperTrigger
									className="flex flex-col items-center sm:items-start justify-center gap-1.5 sm:gap-2.5 grow"
									asChild
								>
									<StepperIndicator className="size-6 sm:size-8 border-2 data-[state=completed]:text-white data-[state=completed]:bg-green-500 data-[state=inactive]:bg-transparent data-[state=inactive]:border-border data-[state=inactive]:text-muted-foreground">
										<step.icon className="size-3 sm:size-4" />
									</StepperIndicator>
									<div className="flex flex-col items-center sm:items-start gap-0.5 sm:gap-1">
										<div className="text-[8px] sm:text-[10px] hidden sm:flex font-semibold uppercase text-muted-foreground">
											Step {index + 1}
										</div>
										<StepperTitle className="text-center sm:text-start hidden sm:flex text-xs sm:text-base font-semibold group-data-[state=inactive]/step:text-muted-foreground">
											{step.title}
										</StepperTitle>
										<div className="hidden sm:visible">
											<Badge
												variant="default"
												className="hidden sm:inline-flex rounded-md hover:bg-blue-200 group-data-[state=active]/step:inline-flex bg-blue-100 text-blue-800 border-blue-200 text-xs"
											>
												In Progress
											</Badge>

											<Badge
												variant="default"
												className="hidden sm:inline-flex rounded-md group-data-[state=completed]/step:inline-flex bg-green-100 text-green-800 border-green-200 text-xs"
											>
												Completed
											</Badge>

											<Badge
												variant="secondary"
												className="hidden sm:inline-flex rounded-md group-data-[state=inactive]/step:inline-flex text-muted-foreground text-xs"
											>
												Pending
											</Badge>
										</div>
									</div>
								</StepperTrigger>

								{STEPS.length > index + 1 && (
									<>
										{/* Mobile: centered separator */}
										<StepperSeparator className="sm:hidden absolute top-3 left-[calc(50%+0.75rem)] right-[calc(-50%+0.75rem)] m-0 group-data-[state=completed]/step:bg-green-500" />
										{/* Desktop: left-aligned separator */}
										<StepperSeparator className="hidden sm:block absolute top-4 inset-x-0 start-9 m-0 w-[calc(100%-2rem)] group-data-[state=completed]/step:bg-green-500" />
									</>
								)}
							</StepperItem>
						);
					})}
				</StepperNav>

				<StepperPanel className="hidden">
					{/* We don't need the panel content as we handle it in the main component */}
					{STEPS.map((_, index) => (
						<StepperContent key={index} value={index + 1} />
					))}
				</StepperPanel>
			</Stepper>
		</div>
	);
}
