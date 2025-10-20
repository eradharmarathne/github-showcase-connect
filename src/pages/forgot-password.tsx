import { ArrowLeft, Mail, Send } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export default function ForgotPassword() {
	const [email, setEmail] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [isEmailSent, setIsEmailSent] = useState(false);
	const { toast } = useToast();

	const handleResetPassword = async (e: React.FormEvent) => {
		e.preventDefault();

		if (!email.trim()) {
			toast({
				title: "Email Required",
				description: "Please enter your email address",
				variant: "destructive",
			});
			return;
		}

		setIsSubmitting(true);

		try {
			const { error } = await supabase.auth.resetPasswordForEmail(email, {
				redirectTo: `${window.location.origin}/auth/reset-password`,
			});

			if (error) {
				console.error("Password reset error:", error);
				
				// Check if it's a configuration error
				if (error.status === 500) {
					toast({
						title: "Service Configuration Error",
						description: "Email service is not properly configured. Please contact support or check:\n1. Supabase email provider settings\n2. Redirect URL allowlist includes: " + window.location.origin,
						variant: "destructive",
					});
				} else {
					toast({
						title: "Password Reset Failed",
						description: error.message,
						variant: "destructive",
					});
				}
			} else {
				setIsEmailSent(true);
				toast({
					title: "Reset Email Sent",
					description: "Check your email for password reset instructions.",
				});
			}
		} catch (error: any) {
			console.error("Unexpected error:", error);
			toast({
				title: "Error",
				description: error?.message || "An unexpected error occurred. Please try again.",
				variant: "destructive",
			});
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleResendEmail = async () => {
		setIsSubmitting(true);

		try {
			const { error } = await supabase.auth.resetPasswordForEmail(email, {
				redirectTo: `${window.location.origin}/auth/reset-password`,
			});

			if (error) {
				toast({
					title: "Resend Failed",
					description: error.message,
					variant: "destructive",
				});
			} else {
				toast({
					title: "Reset Email Sent",
					description: "Check your email for password reset instructions.",
				});
			}
		} catch (error) {
			toast({
				title: "Error",
				description: "An unexpected error occurred. Please try again.",
				variant: "destructive",
			});
		} finally {
			setIsSubmitting(false);
		}
	};

	if (isEmailSent) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-background overflow-hidden">
				<div className="relative flex-1 hidden items-center justify-center h-screen bg-[url('/images/leavs-art.jpg')] bg-cover lg:flex"></div>
				<div className="flex-1 flex items-center justify-center h-screen">
					<div className="w-full max-w-md space-y-8 px-4 md:px-8 bg-background text-gray-600 sm:px-0">
						<div className="">
							<div className="mt-5 space-y-2">
								<div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-green-100">
									<Mail className="size-6 text-green-600" />
								</div>
								<h1 className="text-xl md:text-2xl lg:text-3xl font-semibold text-foreground">
									Check Your Email
								</h1>
								<p className="text-xs sm:text-sm md:text-base text-muted-foreground">
									We've sent password reset instructions to:
								</p>
								<p className="text-xs sm:text-sm md:text-base font-medium text-foreground">
									{email}
								</p>
							</div>
						</div>
						<div className="space-y-4">
							<div className="text-center text-sm text-muted-foreground">
								<p>
									Didn't receive the email? Check your spam folder or click
									below to resend.
								</p>
							</div>

							<Button
								variant="outline"
								className="w-full"
								onClick={handleResendEmail}
								disabled={isSubmitting}
							>
								{isSubmitting ? (
									<div className="flex items-center justify-center">
										<div className="animate-spin rounded-full size-4 border-2 border-transparent border-t-current mr-2"></div>
										Sending...
									</div>
								) : (
									<>
										<Send className="size-4 mr-2" />
										Resend Email
									</>
								)}
							</Button>

							<div className="text-center">
								<Link
									to="/auth"
									className="inline-flex items-center text-sm text-primary hover:underline"
								>
									<ArrowLeft className="size-4 mr-1" />
									Back to Sign In
								</Link>
							</div>
						</div>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen flex items-center justify-center bg-background overflow-hidden">
			<div className="relative flex-1 hidden items-center justify-center h-screen bg-[url('/images/leavs-art.jpg')] bg-cover lg:flex"></div>
			<div className="flex-1 flex items-center justify-center h-screen">
				<div className="w-full max-w-md space-y-8 px-4 md:px-8 text-gray-600 sm:px-0">
					<div className="">
						<div className="mt-5 space-y-2">
							<h1 className="text-xl md:text-2xl lg:text-3xl font-semibold text-foreground">
								Reset Your Password
							</h1>
							<p className="text-sm text-muted-foreground">
								Enter your email address and we'll send you a link to reset your
								password.
							</p>
						</div>
					</div>
					<form onSubmit={handleResetPassword} className="space-y-4">
						<div>
							<Label htmlFor="email">Email Address</Label>
							<Input
								id="email"
								type="email"
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								placeholder="Enter your email address"
								required
								disabled={isSubmitting}
								autoFocus
							/>
						</div>

						<Button type="submit" className="w-full" disabled={isSubmitting}>
							{isSubmitting ? (
								<div className="flex items-center justify-center">
									<div className="animate-spin rounded-full size-4 border-2 border-transparent border-t-current mr-2"></div>
									Sending Reset Email...
								</div>
							) : (
								<>
									<Send className="size-4 mr-2" />
									Send Reset Email
								</>
							)}
						</Button>
					</form>

					<div className="mt-6 text-center">
						<Link
							to="/auth"
							className="inline-flex items-center text-sm text-primary hover:underline"
						>
							<ArrowLeft className="size-4 mr-1" />
							Back to Sign In
						</Link>
					</div>
				</div>
			</div>
		</div>
	);
}
