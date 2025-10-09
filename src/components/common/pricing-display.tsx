import { Calculator, DollarSign } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

interface PricingDisplayProps {
	roomRate: number;
	nights: number;
	currency: string;
	totalAmount: number;
	advanceAmount?: number;
}

export const PricingDisplay = ({
	roomRate,
	nights,
	currency,
	totalAmount,
	advanceAmount = 0,
}: PricingDisplayProps) => {
	const getCurrencySymbol = (curr: string) => {
		const symbols: Record<string, string> = {
			LKR: "LKR",
			USD: "$",
			EUR: "€",
			GBP: "£",
		};
		return symbols[curr] || curr;
	};

	const symbol = getCurrencySymbol(currency);
	const balanceAmount = totalAmount - advanceAmount;

	if (nights === 0 || roomRate === 0) {
		return (
			<Card className="bg-muted/10">
				<CardContent className="pt-6 text-center">
					<Calculator className="size-5 mx-auto text-muted-foreground mb-2" />
					<p className="text-muted-foreground">Select dates to see pricing</p>
				</CardContent>
			</Card>
		);
	}

	return (
		<Card className="bg-primary/5 border-primary/20">
			<CardHeader className="pb-3">
				<CardTitle className="flex items-center gap-2 text-sm sm:text-base">
					<DollarSign className="size-5" />
					Pricing Breakdown
				</CardTitle>
			</CardHeader>
			<CardContent className="space-y-3">
				<div className="flex justify-between items-center text-xs sm:text-sm">
					<span>
						{symbol} {roomRate.toLocaleString()} × {nights}{" "}
						{nights === 1 ? "night" : "nights"}
					</span>
					<span className="font-medium">
						{symbol} {totalAmount.toLocaleString()}
					</span>
				</div>

				{advanceAmount > 0 && (
					<>
						<Separator />
						<div className="flex justify-between items-center text-xs sm:text-sm">
							<span className="text-muted-foreground">Advance Payment</span>
							<span className="text-emerald-600 font-medium">
								-{symbol} {advanceAmount.toLocaleString()}
							</span>
						</div>
					</>
				)}

				<Separator />
				<div className="flex justify-between items-center font-semibold">
					<span>Total Amount</span>
					<span className="text-base sm:text-lg text-primary">
						{symbol} {totalAmount.toLocaleString()}
					</span>
				</div>

				{advanceAmount > 0 && (
					<div className="flex justify-between items-center text-xs sm:text-sm">
						<span className="text-muted-foreground">Balance Due</span>
						<span className="font-medium text-orange-600">
							{symbol} {balanceAmount.toLocaleString()}
						</span>
					</div>
				)}

				<div className="text-xs text-muted-foreground text-center pt-2 border-t">
					Prices shown in {currency}
				</div>
			</CardContent>
		</Card>
	);
};
