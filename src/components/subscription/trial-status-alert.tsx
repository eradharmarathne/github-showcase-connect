import { AlertTriangle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface TrialStatusAlertProps {
	trialDaysRemaining: number | null;
}

export function TrialStatusAlert({
	trialDaysRemaining,
}: TrialStatusAlertProps) {
	if (trialDaysRemaining === null) return null;

	const isExpired = trialDaysRemaining === 0;
	const isExpiringSoon = trialDaysRemaining <= 2;

	const alertClassName = isExpired
		? "border-red-200 bg-red-50"
		: isExpiringSoon
			? "border-yellow-200 bg-yellow-50"
			: "border-blue-200 bg-blue-50";

	const iconClassName = isExpired
		? "text-red-600"
		: isExpiringSoon
			? "text-yellow-600"
			: "text-blue-600";

	const textClassName = isExpired
		? "text-red-800"
		: isExpiringSoon
			? "text-yellow-800"
			: "text-blue-800";

	const message =
		trialDaysRemaining === 0
			? "Your 7-day free trial has expired. Please subscribe to continue using the service."
			: trialDaysRemaining === 1
				? "Your 7-day free trial expires tomorrow. Subscribe now to continue using all features."
				: `Your 7-day free trial expires in ${trialDaysRemaining} days. Subscribe now to continue using all features.`;

	return (
		<Alert className={alertClassName}>
			<AlertTriangle className={`h-4 w-4 ${iconClassName}`} />
			<AlertDescription className={textClassName}>
				{message}
			</AlertDescription>
		</Alert>
	);
}
