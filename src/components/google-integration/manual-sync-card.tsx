import { RefreshCw } from "lucide-react";
import { memo } from "react";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";

interface ManualSyncCardProps {
	onSync: () => void;
	isSyncing: boolean;
}

export const ManualSyncCard = memo(function ManualSyncCard({
	onSync,
	isSyncing,
}: ManualSyncCardProps) {
	return (
		<Card>
			<CardHeader>
				<CardTitle>Manual Sync</CardTitle>
				<CardDescription>
					Manually trigger a sync of reviews from Google Business Profile
				</CardDescription>
			</CardHeader>
			<CardContent>
				<Button onClick={onSync} disabled={isSyncing} className="gap-2">
					<RefreshCw className={`h-4 w-4 ${isSyncing ? "animate-spin" : ""}`} />
					{isSyncing ? "Syncing..." : "Sync Reviews Now"}
				</Button>
				<p className="mt-2 text-xs text-muted-foreground">
					This will fetch the latest reviews from Google Business Profile
				</p>
			</CardContent>
		</Card>
	);
});
