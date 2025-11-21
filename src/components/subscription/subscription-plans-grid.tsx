import { Bed, Building2, CheckCircle, CreditCard, Users } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PlanWithPolarProduct } from "@/types/subscription";

interface SubscriptionPlansGridProps {
	plans: PlanWithPolarProduct[];
	currentPlanId: string | null | undefined;
	onSubscribe: (plan: PlanWithPolarProduct) => void;
	processingPlanId: string | null;
}

export function SubscriptionPlansGrid({
	plans,
	currentPlanId,
	onSubscribe,
	processingPlanId,
}: SubscriptionPlansGridProps) {
	const { t } = useTranslation("common");

	return (
		<div className="space-y-4">
			<h2 className="text-lg md:text-xl lg:text-2xl font-semibold">
				{t("billing.plans.title")}
			</h2>
			<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
				{plans.map((plan) => {
					const isCurrentPlan = currentPlanId === plan.id;
					const price = plan.price_cents / 100;

					return (
						<Card
							key={plan.id}
							className={`relative ${isCurrentPlan ? "ring-0 ring-blue-500" : ""}`}
						>
							{isCurrentPlan && (
								<Badge className="absolute -top-2 -right-2 bg-blue-600">
									Current Plan
								</Badge>
							)}
							<CardHeader>
								<CardTitle className="flex items-center justify-between">
									<span>{plan.name}</span>
									<div className="text-right">
										<div className="text-2xl font-bold">
											${price.toFixed(2)}
										</div>
										<div className="text-sm text-muted-foreground">
											/{plan.billing_interval}
										</div>
									</div>
								</CardTitle>
								{plan.description && (
									<p className="text-sm text-muted-foreground">
										{plan.description}
									</p>
								)}
							</CardHeader>
							<CardContent className="space-y-4">
								{/* Plan Features */}
								<div className="space-y-2">
									{plan.max_locations && (
										<div className="flex items-center gap-2 text-sm">
											<Building2 className="size-4 text-muted-foreground" />
											<span>{plan.max_locations} locations</span>
										</div>
									)}
									{plan.max_rooms && (
										<div className="flex items-center gap-2 text-sm">
											<Bed className="size-4 text-muted-foreground" />
											<span>{plan.max_rooms} rooms</span>
										</div>
									)}
									<div className="flex items-center gap-2 text-sm">
										<Users className="size-4 text-muted-foreground" />
										<span>Unlimited users</span>
									</div>
									<div className="flex items-center gap-2 text-sm">
										<CheckCircle className="size-4 text-green-600" />
										<span>24/7 Support</span>
									</div>
								</div>

								{/* Action Button */}
								{!isCurrentPlan && (
									<Button
										className="w-full"
										onClick={() => onSubscribe(plan)}
										disabled={processingPlanId === plan.id}
									>
										<CreditCard className="size-4 mr-2" />
										{processingPlanId === plan.id
											? t("billing.plans.processing")
											: t("billing.plans.subscribe")}
									</Button>
								)}
							</CardContent>
						</Card>
					);
				})}
			</div>
		</div>
	);
}
