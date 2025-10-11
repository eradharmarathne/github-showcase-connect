import { formatDistanceToNow } from "date-fns";
import { AlertCircle, Check, RefreshCw, XCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { Tables } from "@/integrations/supabase/types";

type GoogleCredential = Tables<"google_business_credentials">;

interface ConnectionStatusCardProps {
	credentials: GoogleCredential | null;
	isLoading: boolean;
}

export function ConnectionStatusCard({
	credentials,
	isLoading,
}: ConnectionStatusCardProps) {
	const getStatusBadge = (status: string | null) => {
		switch (status) {
			case "active":
				return (
					<div className="flex items-center space-x-2 text-green-600">
						<Check className="h-4 w-4" />
						<span className="text-sm font-medium">Connected</span>
					</div>
				);
			case "error":
			case "expired":
				return (
					<div className="flex items-center space-x-2 text-red-600">
						<XCircle className="h-4 w-4" />
						<span className="text-sm font-medium">Error</span>
					</div>
				);
			case "syncing":
				return (
					<div className="flex items-center space-x-2 text-blue-600">
						<RefreshCw className="h-4 w-4 animate-spin" />
						<span className="text-sm font-medium">Syncing...</span>
					</div>
				);
			default:
				return (
					<div className="flex items-center space-x-2 text-gray-600">
						<AlertCircle className="h-4 w-4" />
						<span className="text-sm font-medium">Not Configured</span>
					</div>
				);
		}
	};

	return (
		<Card>
			<CardHeader>
				<CardTitle>Connection Status</CardTitle>
				<CardDescription>
					Current status of Google Business Profile integration for this
					location
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4">
				{isLoading ? (
					<div className="space-y-2">
						<Skeleton className="h-4 w-32" />
						<Skeleton className="h-4 w-48" />
					</div>
				) : (
					<>
						<div className="flex items-center justify-between">
							<span className="text-sm font-medium">Status:</span>
							{getStatusBadge(credentials?.sync_status || null)}
						</div>

						{credentials?.last_synced_at && (
							<div className="flex items-center justify-between">
								<span className="text-sm font-medium">Last Synced:</span>
								<span className="text-sm text-muted-foreground">
									{formatDistanceToNow(new Date(credentials.last_synced_at), {
										addSuffix: true,
									})}
								</span>
							</div>
						)}

						{credentials?.error_message && (
							<Alert variant="destructive">
								<AlertCircle className="h-4 w-4" />
								<AlertDescription>{credentials.error_message}</AlertDescription>
							</Alert>
						)}
					</>
				)}
			</CardContent>
		</Card>
	);
}
