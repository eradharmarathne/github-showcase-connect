import { AlertCircle, RefreshCw } from "lucide-react";
import { Component, type ErrorInfo, type ReactNode } from "react";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { logger } from "@/lib/logger";

interface Props {
	children: ReactNode;
	routeName?: string;
}

interface State {
	hasError: boolean;
	error: Error | null;
}

/**
 * Route-specific error boundary for critical routes
 * Provides better error isolation and recovery for individual routes
 */
export class RouteErrorBoundary extends Component<Props, State> {
	constructor(props: Props) {
		super(props);
		this.state = { hasError: false, error: null };
	}

	static getDerivedStateFromError(error: Error): State {
		return { hasError: true, error };
	}

	componentDidCatch(error: Error, errorInfo: ErrorInfo) {
		logger.error(`RouteErrorBoundary caught an error in ${this.props.routeName || "route"}`, error, errorInfo);
	}

	handleReset = () => {
		this.setState({ hasError: false, error: null });
	};

	handleGoBack = () => {
		this.setState({ hasError: false, error: null });
		window.history.back();
	};

	render() {
		if (this.state.hasError) {
			return (
				<div className="flex items-center justify-center min-h-[400px] p-4">
					<Card className="w-full max-w-md">
						<CardHeader>
							<div className="flex items-center gap-2 text-destructive">
								<AlertCircle className="size-5" />
								<CardTitle>Error loading {this.props.routeName || "page"}</CardTitle>
							</div>
							<CardDescription>
								An error occurred while loading this page. You can try reloading or
								go back to the previous page.
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
									onClick={this.handleReset}
									variant="outline"
									className="flex-1"
								>
									<RefreshCw className="size-4 mr-2" />
									Try Again
								</Button>
								<Button onClick={this.handleGoBack} className="flex-1">
									Go Back
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

/**
 * Wrapper component for route error boundaries
 */
export function RouteErrorBoundaryWrapper({
	children,
	routeName,
}: {
	children: ReactNode;
	routeName?: string;
}) {
	return <RouteErrorBoundary routeName={routeName}>{children}</RouteErrorBoundary>;
}

