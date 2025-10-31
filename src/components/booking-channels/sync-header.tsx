import { format } from "date-fns";
import { RefreshCw, Wifi } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";

interface SyncHeaderProps {
	syncing: boolean;
	lastSyncTime: Date | null;
	onSync: () => void;
}

export function SyncHeader({ syncing, lastSyncTime, onSync }: SyncHeaderProps) {
	const { t } = useTranslation();

	return (
		<div className="flex items-center gap-2">
			<Button
				onClick={onSync}
				disabled={syncing}
				className="bg-primary hover:bg-primary/90"
			>
				{syncing ? (
					<>
						<RefreshCw className="size-4 mr-2 animate-spin" />
						{t("bookingChannels.header.syncing")}
					</>
				) : (
					<>
						<Wifi className="size-4 mr-2" />
						{t("bookingChannels.header.syncNow")}
					</>
				)}
			</Button>
			<div className="text-xs text-muted-foreground">
				{t("bookingChannels.header.autoSyncNote")}
				{lastSyncTime && (
					<div>
						{t("bookingChannels.header.lastSync", {
							date: format(lastSyncTime, "MMM dd, HH:mm"),
						})}
					</div>
				)}
			</div>
		</div>
	);
}
