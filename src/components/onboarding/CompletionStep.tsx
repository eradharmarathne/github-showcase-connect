import { ArrowRight, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CompletionStepProps {
	loading: boolean;
	onComplete: () => void;
}

export function CompletionStep({ loading, onComplete }: CompletionStepProps) {
	return (
		<div className="text-center space-y-6">
			<CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
			<h2 className="text-lg sm:text-3xl font-bold">You're All Set! 🎉</h2>
			<p className="text-lg text-muted-foreground max-w-md mx-auto">
				Welcome to Check In_Check Out! Your account has been configured based on
				your preferences.
			</p>

			<div className="bg-muted/30 rounded-lg p-6 text-left max-w-md mx-auto">
				<h3 className="font-medium mb-4">What's Next:</h3>
				<ul className="space-y-2 text-sm text-muted-foreground">
					<li className="flex items-center gap-2">
						<div className="w-1.5 h-1.5 bg-primary rounded-full" />
						Set up your rooms and room types
					</li>
					<li className="flex items-center gap-2">
						<div className="w-1.5 h-1.5 bg-primary rounded-full" />
						Configure your booking channels
					</li>
					<li className="flex items-center gap-2">
						<div className="w-1.5 h-1.5 bg-primary rounded-full" />
						Add your team members
					</li>
					<li className="flex items-center gap-2">
						<div className="w-1.5 h-1.5 bg-primary rounded-full" />
						Start accepting reservations
					</li>
					<li className="flex items-center gap-2">
						<div className="w-1.5 h-1.5 bg-primary rounded-full" />
						Explore the dashboard and reports
					</li>
				</ul>
			</div>

			<Button
				size="lg"
				onClick={onComplete}
				disabled={loading}
				className="w-full max-w-sm"
			>
				{loading ? "Setting up..." : "Enter Your Dashboard"}
				<ArrowRight className="size-5 ml-2" />
			</Button>
		</div>
	);
}
