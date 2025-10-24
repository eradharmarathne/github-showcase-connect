/**
 * Beds24 Sync Status Badge Component
 *
 * Displays sync status for reservations that are synced to Beds24.
 * Shows different colors/icons based on sync state.
 */

import {
	AlertCircle,
	CheckCircle2,
	Clock,
	RefreshCw,
	XCircle,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";

interface Beds24SyncStatusProps {
	reservation: {
		id: string;
		beds24_booking_id?: number | null;
		beds24_sync_status?: string | null;
		beds24_synced_at?: string | null;
		beds24_sync_error?: string | null;
		booking_source?: string | null;
	};
	showRetryButton?: boolean;
	onSyncComplete?: () => void;
}

export function Beds24SyncStatus({
	reservation,
	showRetryButton = false,
	onSyncComplete,
}: Beds24SyncStatusProps) {
	const [isRetrying, setIsRetrying] = useState(false);

	// Don't show badge if not applicable
	if (!reservation.beds24_sync_status) {
		return null;
	}

	const syncStatus = reservation.beds24_sync_status;

	// Status configurations
	const statusConfig = {
		not_required: {
			label: "Not Required",
			variant: "secondary" as const,
			icon: AlertCircle,
			color: "text-gray-500",
			description:
				"External channel booking - no sync to Beds24 needed (already from Beds24)",
		},
		pending: {
			label: "Syncing...",
			variant: "default" as const,
			icon: Clock,
			color: "text-yellow-600",
			description: "Waiting for sync to Beds24 channel manager",
		},
		synced: {
			label: "Synced",
			variant: "default" as const,
			icon: CheckCircle2,
			color: "text-green-600",
			description: `Successfully synced to Beds24${
				reservation.beds24_booking_id
					? ` (ID: ${reservation.beds24_booking_id})`
					: ""
			}`,
		},
		failed: {
			label: "Sync Failed",
			variant: "destructive" as const,
			icon: XCircle,
			color: "text-red-600",
			description:
				reservation.beds24_sync_error ||
				"Failed to sync to Beds24 - click retry",
		},
	};

	const config = statusConfig[syncStatus as keyof typeof statusConfig];
	if (!config) return null;

	const Icon = config.icon;

	const handleRetrySync = async () => {
		setIsRetrying(true);

		try {
			const { data, error } = await supabase.functions.invoke(
				"sync-reservation-to-beds24",
				{
					body: {
						reservation_id: reservation.id,
						force: true, // Force resync
					},
				},
			);

			if (error) {
				throw error;
			}

			if (data?.success) {
				toast.success("Successfully synced to Beds24!", {
					description: `Booking ID: ${data.beds24_booking_id}`,
				});
				onSyncComplete?.();
			} else {
				throw new Error(data?.error || "Unknown error");
			}
		} catch (error: any) {
			console.error("Sync error:", error);
			toast.error("Failed to sync to Beds24", {
				description: error.message || "Please try again later",
			});
		} finally {
			setIsRetrying(false);
		}
	};

	return (
		<div className="flex items-center gap-2">
			<TooltipProvider>
				<Tooltip>
					<TooltipTrigger asChild>
						<Badge variant={config.variant} className="gap-1.5">
							<Icon className={`h-3 w-3 ${config.color}`} />
							{config.label}
						</Badge>
					</TooltipTrigger>
					<TooltipContent className="max-w-xs">
						<p className="font-medium">Beds24 Sync Status</p>
						<p className="text-sm text-muted-foreground">
							{config.description}
						</p>
						{reservation.beds24_synced_at && (
							<p className="text-xs text-muted-foreground mt-1">
								Last synced:{" "}
								{new Date(reservation.beds24_synced_at).toLocaleString()}
							</p>
						)}
					</TooltipContent>
				</Tooltip>
			</TooltipProvider>

			{showRetryButton && syncStatus === "failed" && (
				<TooltipProvider>
					<Tooltip>
						<TooltipTrigger asChild>
							<Button
								variant="ghost"
								size="sm"
								onClick={handleRetrySync}
								disabled={isRetrying}
								className="h-7 w-7 p-0"
							>
								<RefreshCw
									className={`h-3.5 w-3.5 ${isRetrying ? "animate-spin" : ""}`}
								/>
							</Button>
						</TooltipTrigger>
						<TooltipContent>
							<p>Retry sync to Beds24</p>
						</TooltipContent>
					</Tooltip>
				</TooltipProvider>
			)}
		</div>
	);
}

// Compact version for table cells
export function Beds24SyncStatusCompact({
	reservation,
}: Beds24SyncStatusProps) {
	if (!reservation.beds24_sync_status) return null;

	const syncStatus = reservation.beds24_sync_status;

	const statusIcons = {
		not_required: <AlertCircle className="h-4 w-4 text-gray-400" />,
		pending: <Clock className="h-4 w-4 text-yellow-600" />,
		synced: <CheckCircle2 className="h-4 w-4 text-green-600" />,
		failed: <XCircle className="h-4 w-4 text-red-600" />,
	};

	const Icon = statusIcons[syncStatus as keyof typeof statusIcons];
	if (!Icon) return null;

	return (
		<TooltipProvider>
			<Tooltip>
				<TooltipTrigger asChild>
					<div className="flex items-center justify-center">{Icon}</div>
				</TooltipTrigger>
				<TooltipContent>
					<p className="font-medium capitalize">
						{syncStatus.replace("_", " ")}
					</p>
					{reservation.beds24_booking_id && (
						<p className="text-xs">
							Beds24 ID: {reservation.beds24_booking_id}
						</p>
					)}
				</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	);
}
