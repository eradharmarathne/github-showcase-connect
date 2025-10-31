import { AlertTriangle, Calendar, CheckCircle, Crown, XCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Subscription } from "@/types/subscription";

interface CurrentSubscriptionCardProps {
	subscription: Subscription | null;
	onCancel: () => void;
	cancelling: boolean;
}

const getStatusColor = (status: string): string => {
	switch (status) {
		case "active":
			return "bg-green-100 text-green-800";
		case "trialing":
			return "bg-blue-100 text-blue-800";
		case "past_due":
			return "bg-yellow-100 text-yellow-800";
		case "cancelled":
			return "bg-red-100 text-red-800";
		default:
			return "bg-gray-100 text-gray-800";
	}
};

const getStatusIcon = (status: string): JSX.Element => {
	switch (status) {
		case "active":
			return <CheckCircle className="size-4 text-green-600" />;
		case "trialing":
			return <Calendar className="size-4 text-blue-600" />;
		case "past_due":
			return <AlertTriangle className="size-4 text-yellow-600" />;
		case "cancelled":
			return <XCircle className="size-4 text-red-600" />;
		default:
			return <AlertTriangle className="size-4 text-gray-600" />;
	}
};

export function CurrentSubscriptionCard({
	subscription,
	onCancel,
	cancelling,
}: CurrentSubscriptionCardProps) {
	const { t } = useTranslation("common");

	if (!subscription) return null;

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<Crown className="size-5 text-yellow-600" />
					{t("billing.currentSubscription.title")}
				</CardTitle>
			</CardHeader>
			<CardContent className="space-y-4">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-2">
						{getStatusIcon(subscription.status)}
						<Badge className={getStatusColor(subscription.status)}>
							{subscription.status.toUpperCase()}
						</Badge>
					</div>
					{subscription.status === "active" && (
						<Button
							variant="outline"
							size="sm"
							onClick={onCancel}
							disabled={cancelling}
						>
							{cancelling
								? t("billing.currentSubscription.cancelling")
								: t("billing.currentSubscription.cancelSubscription")}
						</Button>
					)}
				</div>

				{subscription.current_period_end && (
					<p className="text-sm text-muted-foreground">
						{subscription.status === "active" ? "Renews" : "Expires"} on:{" "}
						{new Date(subscription.current_period_end).toLocaleDateString()}
					</p>
				)}
			</CardContent>
		</Card>
	);
}
