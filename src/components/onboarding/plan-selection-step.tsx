import { ArrowRight, BadgeCheck, CreditCard, Crown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { PlanSelectionStepProps } from "./types";

export function PlanSelectionStep({
	formData,
	setFormData,
	plans,
	selectedPlanId,
	setSelectedPlanId,
	processingPayment,
	onPayNow,
}: PlanSelectionStepProps) {
	return (
		<div className="space-y-6">
			<div className="text-start mb-8">
				<p className="text-muted-foreground">
					Start with a 14-day free trial. Choose the plan that fits your needs.
				</p>
			</div>

			<div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
				{Array.isArray(plans) ? (
					plans.map((plan) => {
						const isPopular = plan.name === "Professional";
						const isSelected = selectedPlanId === plan.id;

						return (
							<Card
								key={plan.id}
								className={cn(
									"relative w-full text-left cursor-pointer transition-all hover:shadow-lg",
									isPopular && "ring-2 ring-primary",
									isSelected && "ring-2 ring-primary border-primary shadow-lg",
								)}
								onClick={() => setSelectedPlanId(plan.id)}
							>
								{isPopular && (
									<Badge className="-translate-x-1/2 -translate-y-1/2 absolute top-0 left-1/2 rounded-full">
										Most Popular
									</Badge>
								)}

								<CardHeader className="pb-4">
									<div className="flex items-center gap-2 mb-2">
										{isPopular && <Crown className="h-5 w-5 text-primary" />}
										<CardTitle className="font-medium text-lg md:text-xl lg:text-2xl">
											{plan.name}
										</CardTitle>
									</div>
									<CardDescription>
										<p className="text-sm text-muted-foreground mb-3">
											{plan.description ||
												`Perfect for ${plan.name.toLowerCase()} needs`}
										</p>
										<div className="text-3xl font-bold text-foreground">
											${(plan.price_cents / 100).toFixed(0)}
											<span className="text-sm font-normal text-muted-foreground">
												/month, billed {plan.billing_interval || "monthly"}.
											</span>
										</div>
									</CardDescription>
								</CardHeader>

								<CardContent className="grid gap-3 pb-6">
									{/* Plan Limits */}
									{(plan.max_locations || plan.max_rooms) && (
										<div className="border-b border-border pb-3 mb-3">
											{plan.max_locations && (
												<div className="flex items-center gap-2 text-sm text-muted-foreground">
													<BadgeCheck className="h-4 w-4" />
													{plan.max_locations === -1
														? "Unlimited locations"
														: `Up to ${plan.max_locations} locations`}
												</div>
											)}
											{plan.max_rooms && (
												<div className="flex items-center gap-2 text-sm text-muted-foreground">
													<BadgeCheck className="h-4 w-4" />
													{plan.max_rooms === -1
														? "Unlimited rooms"
														: `Up to ${plan.max_rooms} rooms`}
												</div>
											)}
										</div>
									)}

									{/* Features */}
									{plan.feature_list &&
										Array.isArray(plan.feature_list) &&
										plan.feature_list.map((feature: string, index: number) => (
											<div
												className="flex items-center gap-2 text-muted-foreground text-sm"
												key={index}
											>
												<BadgeCheck className="h-4 w-4 text-primary" />
												{feature}
											</div>
										))}
								</CardContent>

								<CardFooter className="pt-0">
									<div className="w-full space-y-2">
										{isSelected && (
											<div className="text-center text-sm text-primary font-medium mb-2">
												✓ Selected Plan
											</div>
										)}
										<Button
											className="w-full"
											variant={
												isSelected
													? "default"
													: isPopular
														? "default"
														: "secondary"
											}
											size="lg"
										>
											{isSelected ? "Selected" : "Choose Plan"}
											{!isSelected && <ArrowRight className="ml-2 h-4 w-4" />}
										</Button>
									</div>
								</CardFooter>
							</Card>
						);
					})
				) : (
					<div className="col-span-full text-center text-muted-foreground py-8">
						<div className="animate-pulse">Loading plans...</div>
					</div>
				)}
			</div>

			{selectedPlanId && (
				<div className="bg-muted/50 rounded-lg p-6 sm:p-8 space-y-4">
					<div className="text-center">
						<h3 className="text-base md:text-lg lg:text-xl font-semibold mb-2">
							Ready to get started?
						</h3>
						<p className="text-sm text-muted-foreground">
							Subscribe now and get 14 days free trial
						</p>
					</div>

					<div className="flex justify-center">
						<Button
							size="lg"
							onClick={onPayNow}
							disabled={processingPayment}
							className="flex items-center gap-2 py-3 px-8"
						>
							{processingPayment ? "Processing..." : "Subscribe & Start Trial"}
							<CreditCard className="h-4 w-4" />
						</Button>
					</div>

					<div className="text-center text-xs text-muted-foreground">
						<p>
							✨ Subscribe now for 14-day free trial • Secure payment • Cancel anytime • No
							hidden fees
						</p>
					</div>
				</div>
			)}

			<div className="text-center text-sm text-muted-foreground mt-4">
				<p>
					Need help choosing?{" "}
					<a
						href="mailto:checkingcheckout@netronk.com"
						className="text-primary cursor-pointer hover:underline"
					>
						Contact our sales team
					</a>
				</p>
			</div>
		</div>
	);
}
