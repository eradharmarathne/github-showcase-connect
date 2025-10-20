import { Eye, EyeOff, LogIn, UserPlus } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

// SVG Icons for OAuth providers
const GoogleIcon = () => (
	<svg className="size-5" viewBox="0 0 24 24">
		<path
			fill="currentColor"
			d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
		/>
		<path
			fill="currentColor"
			d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
		/>
		<path
			fill="currentColor"
			d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
		/>
		<path
			fill="currentColor"
			d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
		/>
	</svg>
);

const FacebookIcon = () => (
	<svg className="size-5" viewBox="0 0 24 24" fill="currentColor">
		<path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
	</svg>
);

export default function Auth() {
	const [isLogin, setIsLogin] = useState(true);
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [name, setName] = useState("");
	const [showPassword, setShowPassword] = useState(false);
	const [submitting, setSubmitting] = useState(false);
	const [searchParams] = useSearchParams();
	const navigate = useNavigate();
	const { toast } = useToast();
	const { user } = useAuth();

	useEffect(() => {
		// Handle magic link token hash verification
		const handleTokenHash = async () => {
			const tokenHash = searchParams.get("token_hash");
			const type = searchParams.get("type");

			if (tokenHash && type === "recovery") {
				// Verify the recovery token and establish a session
				try {
					const { data, error } = await supabase.auth.verifyOtp({
						token_hash: tokenHash,
						type: "recovery",
					});

					if (error) {
						console.error("Recovery token verification failed:", error);
						toast({
							title: "Invalid Reset Link",
							description: "This password reset link is invalid or has expired.",
							variant: "destructive",
						});
						navigate("/auth/forgot-password", { replace: true });
						return;
					}

					// Verify session was established
					if (!data.session) {
						console.error("No session established after token verification");
						toast({
							title: "Error",
							description: "Failed to establish session. Please try again.",
							variant: "destructive",
						});
						navigate("/auth/forgot-password", { replace: true });
						return;
					}

					console.log("Recovery token verified, session established:", data.session);

					// Small delay to ensure session is fully established
					await new Promise(resolve => setTimeout(resolve, 500));

					// Token verified successfully, redirect to reset password page
					navigate("/auth/reset-password", { replace: true });
				} catch (error) {
					console.error("Exception during recovery token verification:", error);
					toast({
						title: "Error",
						description: "Failed to verify reset link. Please try again.",
						variant: "destructive",
					});
					navigate("/auth/forgot-password", { replace: true });
				}
				return;
			}

			if (tokenHash && type === "email") {
				try {
					const { error } = await supabase.auth.verifyOtp({
						token_hash: tokenHash,
						type: "email",
					});

					if (error) {
						console.error("Magic link verification failed:", error);
						toast({
							title: "Verification Failed",
							description: error.message,
							variant: "destructive",
						});
						return;
					}

					toast({
						title: "Verification Successful",
						description: "You have been signed in successfully!",
					});
					// Clear the URL parameters
					navigate("/auth", { replace: true });
				} catch (error) {
					console.error("Exception during magic link verification:", error);
					toast({
						title: "Error",
						description: "Failed to verify magic link",
						variant: "destructive",
					});
				}
			}
		};

		// Handle magic link verification first
		handleTokenHash();
	}, [navigate, toast, searchParams]);

	// Handle redirect after successful authentication
	useEffect(() => {
		if (user && !submitting) {
			console.log("✅ [AUTH-PAGE] User authenticated, redirecting to smart-redirect");
			// User is authenticated, redirect to smart redirect for proper routing
			navigate("/smart-redirect", { replace: true });
		}
	}, [user, navigate, submitting]);

	const handleAuth = async (e: React.FormEvent) => {
		e.preventDefault();
		setSubmitting(true);

		try {
			if (isLogin) {
				const { error } = await supabase.auth.signInWithPassword({
					email,
					password,
				});

				if (error) {
					toast({
						title: "Login Failed",
						description: error.message,
						variant: "destructive",
					});
				} else {
					toast({
						title: "Login Successful",
						description: "Welcome back!",
					});
					// Navigation will be handled by useEffect when user state updates
				}
			} else {
				if (!name.trim()) {
					toast({
						title: "Name Required",
						description: "Please enter your full name",
						variant: "destructive",
					});
					return;
				}

				const { error } = await supabase.auth.signUp({
					email,
					password,
					options: {
						data: {
							name: name.trim(),
						},
					},
				});

				if (error) {
					toast({
						title: "Sign Up Failed",
						description: error.message,
						variant: "destructive",
					});
				} else {
					toast({
						title: "Account Created!",
						description:
							"Please check your email to verify your account, then complete the setup process.",
					});
					setIsLogin(true);
				}
			}
		} catch (error) {
			toast({
				title: "Error",
				description: "An unexpected error occurred",
				variant: "destructive",
			});
		} finally {
			setSubmitting(false);
		}
	};

	const fillDemoCredentials = () => {
		setEmail("demo@checkingcheckout.com");
		setPassword("Netronk@123");
		setIsLogin(true);
	};

	const handleOAuthSignIn = async (provider: "google" | "facebook") => {
		try {
			setSubmitting(true);
			const { error } = await supabase.auth.signInWithOAuth({
				provider,
				options: {
					redirectTo: `${window.location.origin}/smart-redirect`,
					queryParams: {
						access_type: "offline",
						prompt: "consent",
					},
				},
			});

			if (error) {
				toast({
					title: "Authentication Failed",
					description: error.message,
					variant: "destructive",
				});
			}
		} catch (error) {
			toast({
				title: "Error",
				description: "An unexpected error occurred",
				variant: "destructive",
			});
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<div className="min-h-screen w-full fixed overflow-y-auto flex flex-col sm:flex-row items-center justify-center bg-background">
			<aside
				className="hidden sm:flex lg:h-screen flex-1 sm:overflow-hidden"
				aria-label="Product showcase"
			>
				<div className="flex size-full items-center justify-center bg-linear-to-br from-blue-400 to-blue-600 p-4 sm:p-8 lg:p-16 dark:from-blue-600 dark:to-blue-500">
					<div>
						<h2 className="max-w-lg capitalize text-lg md:text-xl lg:text-2xl font-semibold leading-9 text-white dark:text-white">
							Welcome to Checking &amp; Checkout
						</h2>
						<p className="mt-4 text-white dark:text-white">
							The all-in-one hotel management solution for small to medium
							businesses.
						</p>
						<div className="mt-14 rounded-xl bg-white/10 p-1.5 ring-1 ring-white/20">
							<img
								alt="Dashboard screenshot showing data visualization and analytics interface"
								src="/images/dashboard.png"
								width={2432}
								height={1442}
								className="rounded-md shadow-2xl shadow-black/50 ring-1 ring-gray-900/5"
							/>
						</div>
					</div>
				</div>
			</aside>

			<div className="flex-1 w-full flex items-center justify-center h-full sm:h-screen">
				<div className="w-full max-w-md space-y-8 px-4 md:px-8 text-foreground sm:px-0">
					<div className="space-y-1">
						<h2 className="text-lg md:text-xl lg:text-2xl font-semibold tracking-tight text-foreground">
							{isLogin ? "Get started now" : "Create your account"}
						</h2>
						<p className="text-xs sm:text-sm md:text-base text-muted-foreground">
							{isLogin
								? "Enter your credentials to access your account"
								: "Start your 7-day free trial today"}
						</p>
					</div>
					<form onSubmit={handleAuth} className="space-y-4">
						{!isLogin && (
							<div>
								<Label htmlFor="name">Full Name</Label>
								<Input
									id="name"
									type="text"
									value={name}
									onChange={(e) => setName(e.target.value)}
									required={!isLogin}
									placeholder="Enter your full name"
									disabled={submitting}
								/>
							</div>
						)}

						<div>
							<Label htmlFor="email">Email</Label>
							<Input
								id="email"
								type="email"
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								required
								placeholder="Enter your email"
								disabled={submitting}
							/>
						</div>

						<div>
							<Label htmlFor="password">Password</Label>
							<div className="relative">
								<Input
									id="password"
									type={showPassword ? "text" : "password"}
									value={password}
									onChange={(e) => setPassword(e.target.value)}
									required
									placeholder="Enter your password"
									disabled={submitting}
								/>
								<Button
									type="button"
									variant="ghost"
									size="icon"
									className="absolute right-2 cursor-pointer top-1/2 -translate-y-1/2 size-5"
									onClick={() => setShowPassword(!showPassword)}
									disabled={submitting}
								>
									{showPassword ? (
										<EyeOff className="size-4" />
									) : (
										<Eye className="size-4" />
									)}
								</Button>
							</div>
						</div>

						<Button type="submit" className="w-full  cursor-pointer" disabled={submitting}>
							{submitting ? (
								<div className="flex items-center justify-center">
									<div className="animate-spin rounded-full size-4 border-2 border-transparent border-t-current"></div>
								</div>
							) : isLogin ? (
								<>
									<LogIn className="size-4 mr-2" />
									Sign In
								</>
							) : (
								<>
									<UserPlus className="size-4 mr-2" />
									Sign Up
								</>
							)}
						</Button>
					</form>

					{/* OAuth Providers */}
					<div className="space-y-3">
						<div className="relative">
							<div className="absolute inset-0 flex items-center">
								<span className="w-full border-t" />
							</div>
							<div className="relative flex justify-center text-xs uppercase">
								<span className="bg-background px-2 text-muted-foreground">
									Or continue with
								</span>
							</div>
						</div>

						<div className="flex justify-center items-center">
							<Button
								type="button"
								variant="outline"
								onClick={() => handleOAuthSignIn("google")}
								disabled={submitting}
								className="w-full cursor-pointer"
							>
								<GoogleIcon />
								<span className="ml-2">Google</span>
							</Button>
							{/* <Button
								type="button"
								variant="outline"
								onClick={() => handleOAuthSignIn("facebook")}
								disabled={submitting}
								className="w-full cursor-pointer"
							>
								<FacebookIcon />
								<span className="ml-2">Facebook</span>
							</Button> */}
						</div>
					</div>

					{/* Demo Account Section - Only show on login */}
					{isLogin && (
						<Button
							type="button"
							variant="outline"
							size="sm"
							onClick={fillDemoCredentials}
							disabled={submitting}
							className="w-full  cursor-pointer border-blue-300 text-blue-700 hover:bg-blue-100 dark:border-blue-700 dark:text-blue-300 dark:hover:bg-blue-900/50"
						>
							Try Demo Account
						</Button>
					)}

					{/* Forgot Password Link - Only show on login */}
					{isLogin && (
						<div className="text-center">
							<Link
								to="/auth/forgot-password"
								className="text-sm text-primary hover:underline"
							>
								Forgot your password?
							</Link>
						</div>
					)}

					<div className="mt-4 text-center">
						<button
							type="button"
							onClick={() => setIsLogin(!isLogin)}
							className="text-primary  cursor-pointer hover:underline"
							disabled={submitting}
						>
							{isLogin
								? "Don't have an account? Sign up"
								: "Already have an account? Sign in"}
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}
