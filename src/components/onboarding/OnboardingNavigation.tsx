import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OnboardingNavigationProps } from "./types";

export function OnboardingNavigation({
  currentStep,
  totalSteps,
  onNext,
  onPrevious,
  canProceed,
}: OnboardingNavigationProps) {
  if (currentStep >= totalSteps) return null;

  return (
    <div className="flex justify-between items-center mt-6">
      <Button
        variant="outline"
        onClick={onPrevious}
        disabled={currentStep === 1}
        className="flex items-center gap-2"
      >
        <ArrowLeft className="size-4" />
        Previous
      </Button>

      <Button
        onClick={onNext}
        disabled={!canProceed}
        className="flex items-center gap-2"
      >
        Next Step
        <ArrowRight className="size-4" />
      </Button>
    </div>
  );
}