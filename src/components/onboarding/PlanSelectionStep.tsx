import { Calendar, CreditCard, Crown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PlanSelectionStepProps } from "./types";

export function PlanSelectionStep({
  formData,
  setFormData,
  plans,
  selectedPlanId,
  setSelectedPlanId,
  processingPayment,
  onStartTrial,
  onPayNow,
}: PlanSelectionStepProps) {
  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <CreditCard className="h-12 w-12 text-primary mx-auto mb-4" />
        <h2 className="text-lg sm:text-2xl font-bold mb-2">
          Choose Your Plan
        </h2>
        <p className="text-muted-foreground">
          Start with a 7-day free trial, then choose the plan that fits
          your needs
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.isArray(plans) ? (
          plans.map((plan) => (
            <Card
              key={plan.id}
              className={`cursor-pointer transition-all hover:shadow-md ${
                selectedPlanId === plan.id
                  ? "ring-2 ring-primary border-primary"
                  : ""
              }`}
              onClick={() => setSelectedPlanId(plan.id)}
            >
              <CardContent className="p-6 space-y-4">
                <div className="text-center">
                  {plan.name === "Professional" && (
                    <Crown className="h-8 w-8 text-primary mx-auto mb-2" />
                  )}
                  <h3 className="text-lg font-semibold">{plan.name}</h3>
                  {plan.name === "Professional" && (
                    <Badge variant="secondary" className="mt-1">
                      Most Popular
                    </Badge>
                  )}
                </div>

                <div className="text-center">
                  <div className="text-3xl font-bold">
                    ${(plan.price_cents / 100).toFixed(0)}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    per month
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  {plan.features && Array.isArray(plan.features) && (
                    <ul className="space-y-1">
                      {plan.features.map((feature: string, index: number) => (
                        <li key={index} className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="col-span-full text-center text-muted-foreground">
            Loading plans...
          </div>
        )}
      </div>

      {selectedPlanId && (
        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
          <Button
            size="lg"
            variant="outline"
            onClick={onStartTrial}
            disabled={processingPayment}
            className="flex items-center gap-2"
          >
            {processingPayment ? "Starting Trial..." : "Start 7-Day Free Trial"}
            <Calendar className="h-4 w-4" />
          </Button>
          <Button
            size="lg"
            onClick={onPayNow}
            disabled={processingPayment}
            className="flex items-center gap-2"
          >
            {processingPayment ? "Processing..." : "Pay Now & Get Started"}
            <CreditCard className="h-4 w-4" />
          </Button>
        </div>
      )}

      <div className="text-center text-sm text-muted-foreground">
        <p>✨ 7-day free trial • Cancel anytime • No hidden fees</p>
      </div>
    </div>
  );
}