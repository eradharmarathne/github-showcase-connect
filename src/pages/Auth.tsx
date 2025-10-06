import { Eye, EyeOff, LogIn, UserPlus } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

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
				// Redirect to reset password page with the token
				navigate(`/auth/reset-password?token_hash=${tokenHash}&type=recovery`, {
					replace: true,
				});
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
			// User is authenticated, redirect to smart redirect for proper routing
			navigate("/", { replace: true });
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

	return (
		<div className="min-h-screen w-full fixed overflow-hidden flex flex-col sm:flex-row items-center justify-center bg-background">
			<aside
				className="h-full lg:h-screen flex-1 overflow-hidden"
				aria-label="Product showcase"
			>
				<div className="flex size-full items-center justify-center bg-linear-to-br from-blue-400 to-blue-600 p-4 sm:p-8 lg:p-16 dark:from-blue-600 dark:to-blue-500">
					<div>
						<h2 className="max-w-lg text-lg md:text-xl lg:text-2xl font-semibold leading-9 text-white dark:text-white">
							Welcome to Checking &amp; Checkout
						</h2>
						<p className="mt-4 text-white dark:text-white">
							The all-in-one hotel management solution for small to medium
							businesses.
						</p>
						<div className="mt-14 rounded-xl bg-white/10 p-1.5 ring-1 ring-white/20">
							<img
								alt="Dashboard screenshot showing data visualization and analytics interface"
								src="https://blocks.tremor.so/_next/image?url=%2Fhome%2Fdashboard.webp&w=3840&q=75"
								width={2432}
								height={1442}
								className="rounded-md shadow-2xl shadow-black/50 ring-1 ring-gray-900/5"
							/>
						</div>
					</div>
				</div>
			</aside>

			<div className="flex-1 w-full flex items-center justify-center h-full sm:h-screen">
				<div className="w-full max-w-md space-y-8 px-4 sm:px-6 md:px-8 text-foreground sm:px-0">
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
									className="absolute right-2 top-1/2 -translate-y-1/2 size-5"
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

						<Button type="submit" className="w-full" disabled={submitting}>
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

					{/* Demo Account Section - Only show on login */}
					{isLogin && (
						<Button
							type="button"
							variant="outline"
							size="sm"
							onClick={fillDemoCredentials}
							disabled={submitting}
							className="w-full border-blue-300 text-blue-700 hover:bg-blue-100 dark:border-blue-700 dark:text-blue-300 dark:hover:bg-blue-900/50"
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
							className="text-primary hover:underline"
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
