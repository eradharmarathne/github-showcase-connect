import { Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { FEATURES } from "./constants";
import { OnboardingStepProps } from "./types";

export function FeaturesStep({ formData, setFormData }: OnboardingStepProps) {
	const handleFeatureToggle = (featureId: string, essential: boolean) => {
		if (essential) return; // Don't allow toggling essential features

		setFormData((prev) => ({
			...prev,
			selectedFeatures: prev.selectedFeatures.includes(featureId)
				? prev.selectedFeatures.filter((id) => id !== featureId)
				: [...prev.selectedFeatures, featureId],
		}));
	};

	return (
		<div className="space-y-6">

			<div className="grid gap-4">
				{FEATURES.map((feature) => (
					<div
						key={feature.id}
						className={`flex items-start space-x-3 p-4 rounded-lg border ${
							formData.selectedFeatures.includes(feature.id)
								? "border-primary bg-primary/5"
								: "border-border"
						} ${feature.essential ? "bg-muted/50" : ""}`}
					>
						<Checkbox
							id={feature.id}
							checked={formData.selectedFeatures.includes(feature.id)}
							onCheckedChange={() =>
								handleFeatureToggle(feature.id, feature.essential)
							}
							disabled={feature.essential}
						/>
						<div className="flex-1 grid gap-1.5 leading-none">
							<div className="flex items-center gap-2">
								<feature.icon className="h-4 w-4" />
								<Label
									htmlFor={feature.id}
									className={`text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 ${
										feature.essential ? "text-muted-foreground" : ""
									}`}
								>
									{feature.label}
									{feature.essential && (
										<span className="text-xs ml-2 px-2 py-0.5 bg-primary/10 text-primary rounded">
											Essential
										</span>
									)}
								</Label>
							</div>
							<p className="text-xs text-muted-foreground">
								{feature.description}
							</p>
						</div>
					</div>
				))}
			</div>

			<div className="grid md:grid-cols-2 gap-4">
				<div>
					<Label htmlFor="currency">Preferred Currency</Label>
					<Select
						value={formData.currency}
						onValueChange={(value) =>
							setFormData((prev) => ({ ...prev, currency: value }))
						}
					>
						<SelectTrigger>
							<SelectValue placeholder="Select currency" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="USD">USD - US Dollar</SelectItem>
							<SelectItem value="EUR">EUR - Euro</SelectItem>
							<SelectItem value="GBP">GBP - British Pound</SelectItem>
							<SelectItem value="LKR">LKR - Sri Lankan Rupee</SelectItem>
						</SelectContent>
					</Select>
				</div>
			</div>
		</div>
	);
}
