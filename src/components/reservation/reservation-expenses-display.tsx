import { useIncomeData } from "@/hooks/useReservationsData";

interface ReservationExpensesDisplayProps {
	reservationId: string;
	currency: string;
	isCompact?: boolean;
}

export function ReservationExpensesDisplay({
	reservationId,
	currency,
	isCompact = false,
}: ReservationExpensesDisplayProps) {
	const { incomeRecords } = useIncomeData();

	// Utility function
	const getCurrencySymbol = (currency: string): string => {
		const symbols: Record<string, string> = {
			LKR: "Rs.",
			USD: "$",
			EUR: "€",
			GBP: "£",
		};
		return symbols[currency] || currency;
	};
	const additionalServices = incomeRecords
		.filter(
			(inc) =>
				inc.booking_id === reservationId && inc.payment_method === "pending",
		)
		.reduce((sum, inc) => sum + Number(inc.amount), 0);

	const totalAdditionalServices = incomeRecords
		.filter((inc) => inc.booking_id === reservationId)
		.reduce((sum, inc) => sum + Number(inc.amount), 0);

	if (totalAdditionalServices === 0) {
		return <span className="text-muted-foreground">-</span>;
	}

	if (isCompact) {
		return (
			<span>
				{getCurrencySymbol(currency)} {totalAdditionalServices.toLocaleString()}
				{additionalServices > 0 && (
					<span className="text-yellow-600 ml-2">
						(Pending: {getCurrencySymbol(currency)}{" "}
						{additionalServices.toLocaleString()})
					</span>
				)}
			</span>
		);
	}

	return (
		<div className="text-sm">
			<div className="space-y-1">
				<div className="font-medium">
					{getCurrencySymbol(currency)}{" "}
					{totalAdditionalServices.toLocaleString()}
				</div>
				{additionalServices > 0 && (
					<div className="text-yellow-600 text-xs">
						Pending: {getCurrencySymbol(currency)}{" "}
						{additionalServices.toLocaleString()}
					</div>
				)}
			</div>
		</div>
	);
}
