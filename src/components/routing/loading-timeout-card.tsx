import { motion } from "framer-motion";
import { LogOut, RefreshCw, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/auth-context";

interface LoadingTimeoutCardProps {
	onContinue?: () => void;
	fullScreen?: boolean;
}

export function LoadingTimeoutCard({
	onContinue,
	fullScreen = false,
}: LoadingTimeoutCardProps) {
	const { signOut } = useAuth();

	return (
		<div
			className={
				fullScreen
					? "min-h-screen flex items-center justify-center bg-background p-4"
					: "flex flex-1 items-center justify-center p-6 min-h-[50vh]"
			}
		>
			<motion.div
				initial={{ opacity: 0, y: 16, scale: 0.97 }}
				animate={{ opacity: 1, y: 0, scale: 1 }}
				transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] as const }}
				className="w-full max-w-md rounded-2xl border bg-card p-6 text-center shadow-lg"
			>
				<div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
					<WifiOff className="h-6 w-6" />
				</div>
				<h2 className="text-lg font-semibold text-foreground">
					This is taking longer than usual
				</h2>
				<p className="mt-2 text-sm text-muted-foreground">
					We couldn't finish loading your workspace. Check your internet
					connection and try again.
				</p>
				<div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
					<Button onClick={() => window.location.reload()}>
						<RefreshCw className="mr-2 h-4 w-4" />
						Try again
					</Button>
					{onContinue && (
						<Button variant="outline" onClick={onContinue}>
							Continue anyway
						</Button>
					)}
					<Button
						variant="ghost"
						onClick={async () => {
							await signOut();
							window.location.href = "/auth";
						}}
					>
						<LogOut className="mr-2 h-4 w-4" />
						Sign out
					</Button>
				</div>
			</motion.div>
		</div>
	);
}
