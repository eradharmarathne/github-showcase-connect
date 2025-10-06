import { AlertCircle, ArrowRight, CreditCard, Home } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function BillingError() {
	const navigate = useNavigate();
	const [searchParams] = useSearchParams();

	// Get URL parameters from Creem.io callback
	const errorType = searchParams.get("error") || "unknown";
	const errorDescription =
		searchParams.get("error_description") ||
		"An unexpected error occurred during payment processing.";
	const source = searchParams.get("source"); // 'onboarding' or 'billing'

	const getErrorTitle = () => {
		switch (errorType) {
			case "payment_declined":
				return "Payment Declined";
			case "payment_failed":
				return "Payment Failed";
			case "cancelled":
				return "Payment Cancelled";
			default:
				return "Payment Error";
		}
	};

	const getErrorMessage = () => {
		switch (errorType) {
			case "payment_declined":
				return "Your payment method was declined. Please try a different payment method or contact your bank.";
			case "payment_failed":
				return "We couldn't process your payment. Please check your payment details and try again.";
			case "cancelled":
				return "The payment process was cancelled. You can try again whenever you're ready.";
			default:
				return errorDescription;
		}
	};

	return (
		<div className="min-h-screen flex items-center justify-center p-4 sm:p-6 md:p-8">
			<Card className="w-full max-w-md">
				<CardHeader className="text-center">
					<CardTitle className="flex items-center justify-center gap-2 text-red-600">
						<AlertCircle className="size-8" />
						{getErrorTitle()}
					</CardTitle>
				</CardHeader>
				<CardContent className="text-center space-y-6">
					<div className="flex items-center justify-center">
						<div className="bg-red-100 p-4 rounded-full">
							<CreditCard className="size-12 text-red-600" />
						</div>
					</div>

					<div className="space-y-2">
						<h3 className="text-base md:text-lg lg:text-xl font-semibold">Payment Not Completed</h3>
						<p className="text-muted-foreground">{getErrorMessage()}</p>
					</div>

					{errorType !== "cancelled" && (
						<div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg text-sm text-yellow-800">
							<p className="font-medium">Need help?</p>
							<p>If this problem persists, please contact our support team.</p>
						</div>
					)}

					<div className="space-y-3">
						{source === "onboarding" ? (
							<>
								<Button
									className="w-full"
									onClick={() => navigate("/onboarding")}
								>
									Return to Setup
									<ArrowRight className="size-4 ml-2" />
								</Button>
								<Button
									variant="outline"
									className="w-full"
									onClick={() => navigate("/dashboard")}
								>
									<Home className="size-4 mr-2" />
									Go to Dashboard
								</Button>
							</>
						) : (
							<>
								<Button className="w-full" onClick={() => navigate("/billing")}>
									Try Again
									<ArrowRight className="size-4 ml-2" />
								</Button>
								<Button
									variant="outline"
									className="w-full"
									onClick={() => navigate("/dashboard")}
								>
									<Home className="size-4 mr-2" />
									Go to Dashboard
								</Button>
							</>
						)}
					</div>

					<p className="text-xs text-muted-foreground">
						Your account remains unchanged. No charges were made.
					</p>
				</CardContent>
			</Card>
		</div>
	);
}
