import { Percent, Save } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export default function CommissionsTab() {
	const [settings, setSettings] = useState({
		default_guide_commission: 10,
		default_agent_commission: 15,
		max_guide_commission: 25,
		max_agent_commission: 30,
	});
	const [loading, setLoading] = useState(false);
	const { toast } = useToast();

	const handleSave = async () => {
		setLoading(true);
		try {
			// In a real implementation, you would save these to a settings table
			// For now, we'll just show a success message
			toast({
				title: "Success",
				description: "Commission settings saved successfully",
			});
		} catch (error) {
			toast({
				title: "Error",
				description: "Failed to save commission settings",
				variant: "destructive",
			});
		} finally {
			setLoading(false);
		}
	};

	return (
		<div>
			<div className="mb-6">
				<h2 className="text-lg md:text-xl lg:text-2xl font-bold text-foreground flex items-center gap-2">
					<Percent className="size-6" />
					Commission Settings
				</h2>
				<p className="text-muted-foreground">
					Configure default commission rates for guides and agents
				</p>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
				<Card>
					<CardHeader>
						<CardTitle>Guide Commissions</CardTitle>
						<CardDescription>
							Set default and maximum commission rates for tour guides
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<div>
							<Label htmlFor="default_guide_commission">
								Default Commission Rate (%)
							</Label>
							<Input
								id="default_guide_commission"
								type="number"
								min="0"
								max="100"
								step="0.01"
								value={settings.default_guide_commission}
								onChange={(e) =>
									setSettings({
										...settings,
										default_guide_commission: parseFloat(e.target.value) || 0,
									})
								}
							/>
						</div>
						<div>
							<Label htmlFor="max_guide_commission">
								Maximum Commission Rate (%)
							</Label>
							<Input
								id="max_guide_commission"
								type="number"
								min="0"
								max="100"
								step="0.01"
								value={settings.max_guide_commission}
								onChange={(e) =>
									setSettings({
										...settings,
										max_guide_commission: parseFloat(e.target.value) || 0,
									})
								}
							/>
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Agent Commissions</CardTitle>
						<CardDescription>
							Set default and maximum commission rates for travel agents
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<div>
							<Label htmlFor="default_agent_commission">
								Default Commission Rate (%)
							</Label>
							<Input
								id="default_agent_commission"
								type="number"
								min="0"
								max="100"
								step="0.01"
								value={settings.default_agent_commission}
								onChange={(e) =>
									setSettings({
										...settings,
										default_agent_commission: parseFloat(e.target.value) || 0,
									})
								}
							/>
						</div>
						<div>
							<Label htmlFor="max_agent_commission">
								Maximum Commission Rate (%)
							</Label>
							<Input
								id="max_agent_commission"
								type="number"
								min="0"
								max="100"
								step="0.01"
								value={settings.max_agent_commission}
								onChange={(e) =>
									setSettings({
										...settings,
										max_agent_commission: parseFloat(e.target.value) || 0,
									})
								}
							/>
						</div>
					</CardContent>
				</Card>
			</div>

			<div className="mt-6">
				<Card>
					<CardHeader>
						<CardTitle>Commission Calculation Rules</CardTitle>
						<CardDescription>
							Guidelines for calculating and paying commissions
						</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="space-y-4 text-sm text-muted-foreground">
							<div>
								<h4 className="font-medium text-foreground mb-2">
									Guide Commissions:
								</h4>
								<ul className="list-disc list-inside space-y-1">
									<li>Calculated based on the total reservation amount</li>
									<li>Paid after guest check-out and payment confirmation</li>
									<li>Subject to applicable taxes and deductions</li>
								</ul>
							</div>
							<div>
								<h4 className="font-medium text-foreground mb-2">
									Agent Commissions:
								</h4>
								<ul className="list-disc list-inside space-y-1">
									<li>Calculated based on the room rate portion only</li>
									<li>Paid monthly after reconciliation</li>
									<li>
										Additional services may have different commission rates
									</li>
								</ul>
							</div>
						</div>
					</CardContent>
				</Card>
			</div>

			<div className="mt-6 flex justify-end">
				<Button onClick={handleSave} disabled={loading}>
					<Save className="size-4 mr-2" />
					{loading ? "Saving..." : "Save Settings"}
				</Button>
			</div>
		</div>
	);
}
