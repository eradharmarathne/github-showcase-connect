import { CheckCircle, Eye, EyeOff, Lock } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export default function ResetPassword() {
	const [password, setPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [showPassword, setShowPassword] = useState(false);
	const [showConfirmPassword, setShowConfirmPassword] = useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [isResetComplete, setIsResetComplete] = useState(false);
	const [isValidToken, setIsValidToken] = useState(false);
	const [isLoading, setIsLoading] = useState(true);

	const [searchParams] = useSearchParams();
	const navigate = useNavigate();
	const { toast } = useToast();

	useEffect(() => {
		const verifyToken = async () => {
			const tokenHash = searchParams.get("token_hash");
			const type = searchParams.get("type");

			if (!tokenHash || type !== "recovery") {
				toast({
					title: "Invalid Reset Link",
					description: "This password reset link is invalid or has expired.",
					variant: "destructive",
				});
				navigate("/auth/forgot-password");
				return;
			}

			try {
				const { error } = await supabase.auth.verifyOtp({
					token_hash: tokenHash,
					type: "recovery",
				});

				if (error) {
					console.error("Token verification failed:", error);
					toast({
						title: "Invalid Reset Link",
						description: "This password reset link is invalid or has expired.",
						variant: "destructive",
					});
					navigate("/auth/forgot-password");
				} else {
					setIsValidToken(true);
				}
			} catch (error) {
				console.error("Exception during token verification:", error);
				toast({
					title: "Error",
					description: "Failed to verify reset link. Please try again.",
					variant: "destructive",
				});
				navigate("/auth/forgot-password");
			} finally {
				setIsLoading(false);
			}
		};

		verifyToken();
	}, [searchParams, navigate, toast]);

	const validatePassword = (password: string): string | null => {
		if (password.length < 6) {
			return "Password must be at least 6 characters long";
		}
		if (!/(?=.*[a-z])/.test(password)) {
			return "Password must contain at least one lowercase letter";
		}
		if (!/(?=.*[A-Z])/.test(password)) {
			return "Password must contain at least one uppercase letter";
		}
		if (!/(?=.*\d)/.test(password)) {
			return "Password must contain at least one number";
		}
		return null;
	};

	const handleResetPassword = async (e: React.FormEvent) => {
		e.preventDefault();

		// Validate password
		const passwordError = validatePassword(password);
		if (passwordError) {
			toast({
				title: "Invalid Password",
				description: passwordError,
				variant: "destructive",
			});
			return;
		}

		// Check if passwords match
		if (password !== confirmPassword) {
			toast({
				title: "Passwords Don't Match",
				description: "Please make sure both passwords are identical.",
				variant: "destructive",
			});
			return;
		}

		setIsSubmitting(true);

		try {
			const { error } = await supabase.auth.updateUser({
				password: password,
			});

			if (error) {
				toast({
					title: "Password Reset Failed",
					description: error.message,
					variant: "destructive",
				});
			} else {
				setIsResetComplete(true);
				toast({
					title: "Password Reset Successful",
					description: "Your password has been updated successfully.",
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

	const handleSignIn = () => {
		navigate("/auth");
	};

	if (isLoading) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-background overflow-hidden">
				<div className="relative flex-1 hidden items-center justify-center h-screen bg-gray-900 lg:flex">
					<div className="relative z-10 w-full max-w-md">
						<div className=" mt-16 space-y-3">
							<h3 className="text-base md:text-lg lg:text-xl font-bold text-foreground">
								Secure Password Reset
							</h3>
							<p className="text-muted-foreground">
								We're verifying your reset link to ensure your account security.
							</p>
						</div>
					</div>
					<div
						className="absolute inset-0 my-auto h-[500px]"
						style={{
							background:
								"linear-gradient(152.92deg, rgba(192, 132, 252, 0.2) 4.54%, rgba(232, 121, 249, 0.26) 34.2%, rgba(192, 132, 252, 0.1) 77.55%)",
							filter: "blur(118px)",
						}}
					></div>
				</div>
				<div className="flex-1 flex items-center justify-center h-screen">
					<div className="w-full max-w-md space-y-8 px-4 sm:px-0">
						<div className="">
							<div className="mt-5 space-y-2 text-center">
								<div className="flex items-center justify-center">
									<div className="animate-spin rounded-full size-8 border-2 border-transparent border-t-primary"></div>
								</div>
								<p className="text-center text-sm text-muted-foreground mt-4">
									Verifying reset link...
								</p>
							</div>
						</div>
					</div>
				</div>
			</div>
		);
	}

	if (!isValidToken) {
		return null; // Will redirect via useEffect
	}

	if (isResetComplete) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-background overflow-hidden">
				<div className="relative flex-1 hidden items-center justify-center h-screen bg-gray-900 lg:flex">
					<div className="relative z-10 w-full max-w-md">
						<div className=" mt-16 space-y-3">
							<h3 className="text-base md:text-lg lg:text-xl font-bold text-white">
								Password Successfully Reset
							</h3>
							<p className="text-gray-300">
								Your password has been updated successfully. You can now sign in
								with your new credentials.
							</p>
						</div>
					</div>
					<div
						className="absolute inset-0 my-auto h-[500px]"
						style={{
							background:
								"linear-gradient(152.92deg, rgba(192, 132, 252, 0.2) 4.54%, rgba(232, 121, 249, 0.26) 34.2%, rgba(192, 132, 252, 0.1) 77.55%)",
							filter: "blur(118px)",
						}}
					></div>
				</div>
				<div className="flex-1 flex items-center justify-center h-screen">
					<div className="w-full max-w-md space-y-8 px-4 text-gray-600 sm:px-0">
						<div className="">
							<div className="mt-5 space-y-2 text-center">
								<div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-green-100">
									<CheckCircle className="size-6 text-green-600" />
								</div>
								<h1 className="text-xl md:text-2xl lg:text-3xl font-semibold text-foreground">
									Password Reset Complete
								</h1>
								<p className="text-sm text-muted-foreground">
									Your password has been successfully updated. You can now sign
									in with your new password.
								</p>
							</div>
						</div>
						<Button onClick={handleSignIn} className="w-full">
							Continue to Sign In
						</Button>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen flex items-center justify-center bg-background overflow-hidden">
			<div className="relative flex-1 hidden items-center justify-center h-screen bg-[url('/images/white-hotel-front-view.jpg')] bg-cover lg:flex"></div>
			<div className="flex-1 flex items-center justify-center h-screen">
				<div className="w-full max-w-md space-y-8 px-4 text-gray-600 sm:px-0">
					<div className="">
						<div className="mt-5 space-y-2">
							<div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-blue-100">
								<Lock className="size-6 text-blue-600" />
							</div>
							<h1 className="text-xl md:text-2xl lg:text-3xl font-semibold text-foreground">
								Set New Password
							</h1>
							<p className="text-sm text-muted-foreground">
								Enter your new password below. Make sure it's strong and secure.
							</p>
						</div>
					</div>
					<form onSubmit={handleResetPassword} className="space-y-4">
						<div>
							<Label htmlFor="password">New Password</Label>
							<div className="relative">
								<Input
									id="password"
									type={showPassword ? "text" : "password"}
									value={password}
									onChange={(e) => setPassword(e.target.value)}
									placeholder="Enter your new password"
									required
									disabled={isSubmitting}
									autoFocus
								/>
								<Button
									type="button"
									variant="ghost"
									size="icon"
									className="absolute right-2 top-1/2 -translate-y-1/2 size-5"
									onClick={() => setShowPassword(!showPassword)}
									disabled={isSubmitting}
								>
									{showPassword ? (
										<EyeOff className="size-4" />
									) : (
										<Eye className="size-4" />
									)}
								</Button>
							</div>
							<p className="text-xs text-muted-foreground mt-1">
								Must be at least 6 characters with uppercase, lowercase, and
								number
							</p>
						</div>

						<div>
							<Label htmlFor="confirmPassword">Confirm New Password</Label>
							<div className="relative">
								<Input
									id="confirmPassword"
									type={showConfirmPassword ? "text" : "password"}
									value={confirmPassword}
									onChange={(e) => setConfirmPassword(e.target.value)}
									placeholder="Confirm your new password"
									required
									disabled={isSubmitting}
								/>
								<Button
									type="button"
									variant="ghost"
									size="icon"
									className="absolute right-2 top-1/2 -translate-y-1/2 size-5"
									onClick={() => setShowConfirmPassword(!showConfirmPassword)}
									disabled={isSubmitting}
								>
									{showConfirmPassword ? (
										<EyeOff className="size-4" />
									) : (
										<Eye className="size-4" />
									)}
								</Button>
							</div>
						</div>

						<Button type="submit" className="w-full" disabled={isSubmitting}>
							{isSubmitting ? (
								<div className="flex items-center justify-center">
									<div className="animate-spin rounded-full size-4 border-2 border-transparent border-t-current mr-2"></div>
									Updating Password...
								</div>
							) : (
								"Update Password"
							)}
						</Button>
					</form>

					<div className="mt-6 text-center">
						<Button
							variant="ghost"
							onClick={handleSignIn}
							className="text-sm text-muted-foreground hover:text-foreground"
						>
							Back to Sign In
						</Button>
					</div>
				</div>
			</div>
		</div>
	);
}
