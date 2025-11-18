import { AlertCircle, RefreshCw } from "lucide-react";
import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { logger } from "@/lib/logger";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";

interface Props {
	children: ReactNode;
}

interface State {
	hasError: boolean;
	error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
	constructor(props: Props) {
		super(props);
		this.state = { hasError: false, error: null };
	}

	static getDerivedStateFromError(error: Error): State {
		return { hasError: true, error };
	}

	componentDidCatch(error: Error, errorInfo: ErrorInfo) {
		logger.error("ErrorBoundary caught an error", error, errorInfo);
	}

	handleReset = () => {
		this.setState({ hasError: false, error: null });
		window.location.href = "/";
	};

	handleReload = () => {
		window.location.reload();
	};

	render() {
		if (this.state.hasError) {
			return (
				<div className="flex items-center justify-center min-h-screen bg-background p-4">
					<Card className="w-full max-w-md">
						<CardHeader>
							<div className="flex items-center gap-2 text-destructive">
								<AlertCircle className="size-5" />
								<CardTitle>Something went wrong</CardTitle>
							</div>
							<CardDescription>
								An unexpected error occurred. We apologize for the
								inconvenience.
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-4">
							{this.state.error && (
								<div className="rounded-md bg-muted p-3">
									<p className="text-sm font-mono text-muted-foreground">
										{this.state.error.message}
									</p>
								</div>
							)}
							<div className="flex gap-2">
								<Button
									onClick={this.handleReload}
									variant="outline"
									className="flex-1"
								>
									<RefreshCw className="size-4 mr-2" />
									Reload Page
								</Button>
								<Button onClick={this.handleReset} className="flex-1">
									Go to Home
								</Button>
							</div>
						</CardContent>
					</Card>
				</div>
			);
		}

		return this.props.children;
	}
}
