import { AlertTriangle, ArrowLeft } from "lucide-react";
import { Link } from "react-router";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export default function AccessDenied() {
	return (
		<div className="flex items-center justify-center min-h-screen p-4 sm:p-6 md:p-8">
			<div className="max-w-md w-full space-y-4">
				<Alert>
					<AlertTriangle className="size-4" />
					<AlertDescription className="text-center">
						You don't have permission to access any pages in this application.
						Please contact your administrator to request access.
					</AlertDescription>
				</Alert>

				<div className="flex justify-center">
					<Button asChild variant="outline">
						<Link to="/auth">
							<ArrowLeft className="size-4 mr-2" />
							Return to Login
						</Link>
					</Button>
				</div>
			</div>
		</div>
	);
}
