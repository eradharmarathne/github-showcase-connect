import {
	ArrowRight,
	CheckCircle,
	CreditCard,
	Crown,
	Loader2,
	XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/context/auth-context";
import { usePaymentStatus } from "@/hooks/use-payment-status";
import { useToast } from "@/hooks/use-toast";

export default function BillingSuccess() {
	const navigate = useNavigate();
	const { toast } = useToast();
	const [searchParams] = useSearchParams();
	const { tenant, refreshTenant } = useAuth();

	const [redirectCountdown, setRedirectCountdown] = useState(5);

	// Get URL parameters from Polar.sh callback
	const checkoutId = searchParams.get("checkout_id");
	const orderId = searchParams.get("order_id");
	const redirectTo = searchParams.get("redirect_to"); // 'billing' for dashboard billing redirect
	const source = searchParams.get("source"); // 'onboarding' or 'billing'

	// ✅ SECURE: Use polling to wait for webhook verification
	const {
		status: paymentStatus,
		isVerified,
		isFailed,
		isTimeout,
	} = usePaymentStatus({
		tenantId: tenant?.id || null,
		enabled: !!checkoutId && !!tenant,
		timeoutMinutes: 10,
		pollIntervalSeconds: 3,
	});

	// Handle successful payment verification
	useEffect(() => {
		if (isVerified) {
			console.log("✅ [BILLING-SUCCESS] Payment verified via webhook");

			// Refresh tenant data to get updated subscription status
			refreshTenant();

			toast({
				title: "Payment Successful! 🎉",
				description: "Your subscription has been activated successfully.",
			});
		}
	}, [isVerified, refreshTenant, toast]);

	// Handle payment failure
	useEffect(() => {
		if (isFailed || isTimeout) {
			console.error(
				"❌ [BILLING-SUCCESS] Payment verification failed or timed out",
			);
			toast({
				title: "Payment Verification Issue",
				description:
					"We couldn't verify your payment automatically. Please check your billing page or contact support if you were charged.",
				variant: "destructive",
			});
		}
	}, [isFailed, isTimeout, toast]);

	// Auto-redirect countdown effect for billing payments
	useEffect(() => {
		if (isVerified && redirectTo === "billing" && redirectCountdown > 0) {
			const timer = setTimeout(() => {
				if (redirectCountdown === 1) {
					navigate("/billing");
				} else {
					setRedirectCountdown(redirectCountdown - 1);
				}
			}, 1000);

			return () => clearTimeout(timer);
		}
	}, [isVerified, redirectTo, redirectCountdown, navigate]);

	// Show loading state while waiting for tenant
	if (!tenant) {
		return (
			<div className="min-h-screen flex items-center justify-center p-4">
				<Card className="w-full max-w-md">
					<CardHeader className="text-center">
						<CardTitle className="flex items-center justify-center gap-2">
							<Loader2 className="size-6 animate-spin" />
							Loading...
						</CardTitle>
					</CardHeader>
					<CardContent className="text-center">
						<p className="text-muted-foreground">Please wait...</p>
					</CardContent>
				</Card>
			</div>
		);
	}

	// Invalid payment link (no checkout_id)
	if (!checkoutId) {
		return (
			<div className="min-h-screen flex items-center justify-center p-4">
				<Card className="w-full max-w-md">
					<CardHeader className="text-center">
						<CardTitle className="flex items-center justify-center gap-2 text-red-600">
							<CreditCard className="size-6" />
							Invalid Payment Link
						</CardTitle>
					</CardHeader>
					<CardContent className="text-center space-y-4">
						<p>This payment confirmation link is invalid or has expired.</p>
						<Button onClick={() => navigate("/billing")}>Go to Billing</Button>
					</CardContent>
				</Card>
			</div>
		);
	}

	// Waiting for webhook verification
	if (paymentStatus === "pending") {
		return (
			<div className="min-h-screen flex items-center justify-center p-4">
				<Card className="w-full max-w-md">
					<CardHeader className="text-center">
						<CardTitle className="flex items-center justify-center gap-2">
							<Loader2 className="size-8 animate-spin text-blue-600" />
							Verifying Payment...
						</CardTitle>
					</CardHeader>
					<CardContent className="text-center space-y-6">
						<Alert>
							<Loader2 className="h-4 w-4 animate-spin" />
							<AlertTitle>Processing Your Payment</AlertTitle>
							<AlertDescription>
								We're verifying your payment with our secure payment processor.
								This usually takes just a few seconds.
							</AlertDescription>
						</Alert>

						<div className="bg-muted p-4 rounded-lg text-sm">
							<p className="text-muted-foreground">
								Please don't close this page. We're confirming your payment
								details...
							</p>
						</div>

						{orderId && (
							<div className="bg-muted p-3 rounded-lg text-xs">
								<p>
									<strong>Order ID:</strong> {orderId}
								</p>
								<p>
									<strong>Checkout ID:</strong> {checkoutId}
								</p>
							</div>
						)}
					</CardContent>
				</Card>
			</div>
		);
	}

	// Payment verification failed
	if (isFailed || isTimeout) {
		return (
			<div className="min-h-screen flex items-center justify-center p-4">
				<Card className="w-full max-w-md">
					<CardHeader className="text-center">
						<CardTitle className="flex items-center justify-center gap-2 text-red-600">
							<XCircle className="size-8" />
							Payment Verification Issue
						</CardTitle>
					</CardHeader>
					<CardContent className="text-center space-y-6">
						<Alert variant="destructive">
							<XCircle className="h-4 w-4" />
							<AlertTitle>Verification Failed</AlertTitle>
							<AlertDescription>
								We couldn't automatically verify your payment. This doesn't
								necessarily mean your payment failed.
							</AlertDescription>
						</Alert>

						<div className="space-y-2 text-sm text-muted-foreground">
							<p>
								If you were charged, your subscription will be activated within
								a few minutes. Please check your:
							</p>
							<ul className="list-disc list-inside text-left space-y-1">
								<li>Email for a payment confirmation</li>
								<li>Billing page for subscription status</li>
								<li>Bank statement for the charge</li>
							</ul>
						</div>

						{orderId && (
							<div className="bg-muted p-3 rounded-lg text-xs">
								<p>
									<strong>Order ID:</strong> {orderId}
								</p>
								<p className="text-muted-foreground mt-1">
									Please include this ID if contacting support
								</p>
							</div>
						)}

						<div className="space-y-3">
							<Button className="w-full" onClick={() => navigate("/billing")}>
								Check Billing Status
								<ArrowRight className="size-4 ml-2" />
							</Button>
							<Button
								variant="outline"
								className="w-full"
								onClick={() => navigate("/dashboard")}
							>
								Go to Dashboard
							</Button>
						</div>

						<p className="text-xs text-muted-foreground">
							If you need help, please contact support with your Order ID.
						</p>
					</CardContent>
				</Card>
			</div>
		);
	}

	// Payment verified successfully
	return (
		<div className="min-h-screen flex items-center justify-center p-4">
			<Card className="w-full max-w-md">
				<CardHeader className="text-center">
					<CardTitle className="flex items-center justify-center gap-2 text-green-600">
						<CheckCircle className="size-8" />
						Payment Successful!
					</CardTitle>
				</CardHeader>
				<CardContent className="text-center space-y-6">
					<div className="flex items-center justify-center">
						<div className="bg-green-100 p-4 rounded-full">
							<Crown className="size-12 text-green-600" />
						</div>
					</div>

					<div className="space-y-2">
						<h3 className="text-base md:text-lg lg:text-xl font-semibold">
							Welcome to Your New Plan!
						</h3>
						<p className="text-muted-foreground">
							Your subscription has been activated and you now have access to
							all premium features.
						</p>
					</div>

					{orderId && (
						<div className="bg-muted p-3 rounded-lg text-sm">
							<p>
								<strong>Order ID:</strong> {orderId}
							</p>
							<p>
								<strong>Checkout ID:</strong> {checkoutId}
							</p>
						</div>
					)}

					<div className="space-y-3">
						{redirectTo === "billing" ? (
							<div className="text-center space-y-3">
								<div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
									<p className="text-blue-800 font-medium">
										Redirecting to your billing dashboard...
									</p>
									<p className="text-blue-600 text-sm">
										You will be redirected in {redirectCountdown} seconds
									</p>
								</div>
								<Button className="w-full" onClick={() => navigate("/billing")}>
									Go to Billing Now
									<ArrowRight className="size-4 ml-2" />
								</Button>
								<Button
									variant="outline"
									className="w-full"
									onClick={() => navigate("/dashboard")}
								>
									Go to Dashboard
								</Button>
							</div>
						) : source === "onboarding" ? (
							<>
								<Button
									className="w-full"
									onClick={() => navigate("/onboarding")}
								>
									Complete Setup
									<ArrowRight className="size-4 ml-2" />
								</Button>
								<Button
									variant="outline"
									className="w-full"
									onClick={() => navigate("/dashboard")}
								>
									Skip to Dashboard
								</Button>
							</>
						) : (
							<>
								<Button
									className="w-full"
									onClick={() => navigate("/dashboard")}
								>
									Go to Dashboard
									<ArrowRight className="size-4 ml-2" />
								</Button>
								<Button
									variant="outline"
									className="w-full"
									onClick={() => navigate("/billing")}
								>
									View Billing Details
								</Button>
							</>
						)}
					</div>

					<p className="text-xs text-muted-foreground">
						You will receive a confirmation email shortly with your receipt and
						subscription details.
					</p>
				</CardContent>
			</Card>
		</div>
	);
}
