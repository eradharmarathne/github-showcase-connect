import { motion } from "framer-motion";
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

const ease = [0.22, 1, 0.36, 1] as const;
const fadeUp = (delay = 0) => ({
	initial: { opacity: 0, y: 18 },
	animate: { opacity: 1, y: 0 },
	transition: { duration: 0.6, delay, ease },
});

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
							description:
								"This password reset link is invalid or has expired.",
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

					console.log(
						"Recovery token verified, session established:",
						data.session,
					);

					// Small delay to ensure session is fully established
					await new Promise((resolve) => setTimeout(resolve, 500));

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
			console.log(
				"✅ [AUTH-PAGE] User authenticated, redirecting to smart-redirect",
			);
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
				<div className="flex size-full items-center justify-center bg-gradient-to-br from-black via-gray-900 to-black p-4 sm:p-8 lg:p-16 relative overflow-hidden">
					{/* Decorative yellow accent glow */}
					<motion.div className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full bg-yellow-500/10 blur-3xl" animate={{ x: [0, 40, 0], y: [0, -30, 0], scale: [1, 1.15, 1] }} transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }} />
					<motion.div className="absolute bottom-1/3 right-1/4 w-48 h-48 rounded-full bg-yellow-400/10 blur-2xl" animate={{ x: [0, -30, 0], y: [0, 25, 0], scale: [1, 1.2, 1] }} transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }} />

					<div className="relative z-10 text-center">
						{/* CC Monogram */}
						<motion.div initial={{ scale: 0, rotate: -90 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 180, damping: 14 }} className="mx-auto mb-8 w-20 h-20 rounded-full bg-yellow-500 flex items-center justify-center shadow-xl shadow-yellow-500/25">
							<span className="text-3xl font-bold text-black tracking-tight">CC</span>
						</motion.div>

						{/* Shiny brand name */}
						<motion.h1 {...fadeUp(0.15)} className="text-4xl lg:text-5xl font-bold tracking-wide animate-shimmer animate-glow-pulse mb-4">
							CheckingCheckout
						</motion.h1>

						<motion.h2 {...fadeUp(0.25)} className="max-w-lg mx-auto text-lg md:text-xl font-medium leading-8 text-gray-300">
							Welcome to Checking &amp; Checkout
						</motion.h2>
						<motion.p {...fadeUp(0.35)} className="mt-3 text-gray-400 max-w-md mx-auto">
							The all-in-one hotel management solution for small to medium
							businesses.
						</motion.p>
						<motion.div initial={{ opacity: 0, y: 40, rotateX: 12 }} animate={{ opacity: 1, y: [0, -8, 0], rotateX: 0 }} transition={{ opacity: { duration: 0.8, delay: 0.45 }, rotateX: { duration: 0.8, delay: 0.45, ease }, y: { duration: 6, delay: 1.2, repeat: Infinity, ease: "easeInOut" } }} style={{ transformPerspective: 1200 }} className="mt-12 rounded-xl bg-white/5 p-1.5 ring-1 ring-yellow-500/20">
							<img
								alt="Dashboard screenshot showing data visualization and analytics interface"
								src="/images/dashboard.png"
								width={2432}
								height={1442}
								className="rounded-md shadow-2xl shadow-black/50 ring-1 ring-gray-800/30"
							/>
						</motion.div>
					</div>
				</div>
			</aside>

			<div className="flex-1 w-full flex items-center justify-center h-full sm:h-screen">
				<motion.div initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6, ease }} className="w-full max-w-md space-y-8 px-4 py-10 md:px-8 text-foreground sm:px-0">
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

					<Button
						type="submit"
						className="w-full cursor-pointer bg-yellow-500 hover:bg-yellow-600 text-black font-semibold dark:bg-yellow-500 dark:hover:bg-yellow-600 dark:text-black"
						disabled={submitting}
					>
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
							className="w-full cursor-pointer border-yellow-500 text-yellow-700 hover:bg-yellow-50 dark:border-yellow-500 dark:text-yellow-400 dark:hover:bg-yellow-900/30"
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
				</motion.div>
			</div>
		</div>
	);
}
