import { AlertTriangle, CreditCard } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function PaymentProcessingInfo() {
	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<CreditCard className="size-5" />
					Payment Processing
				</CardTitle>
			</CardHeader>
			<CardContent>
				<p className="text-sm text-muted-foreground">
					Payments are processed securely through Creem.io. All major credit
					cards are accepted. Your payment information is never stored on our
					servers.
				</p>
				{!import.meta.env.VITE_CREEM_API_KEY && (
					<Alert className="mt-4">
						<AlertTriangle className="h-4 w-4" />
						<AlertDescription>
							<strong>Demo Mode:</strong> Set VITE_CREEM_API_KEY environment
							variable to enable real payment processing.
						</AlertDescription>
					</Alert>
				)}
			</CardContent>
		</Card>
	);
}
