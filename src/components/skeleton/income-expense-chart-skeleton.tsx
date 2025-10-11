import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function IncomeExpenseChartSkeleton() {
	return (
		<div className="space-y-4">
			{/* Summary Cards */}
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
				{[1, 2, 3].map((i) => (
					<Card key={i} className="bg-card border">
						<CardHeader className="pb-2">
							<Skeleton className="h-4 w-20" />
						</CardHeader>
						<CardContent>
							<Skeleton className="h-8 w-24 mb-2" />
							<Skeleton className="h-3 w-3/4" />
						</CardContent>
					</Card>
				))}
			</div>
			{/* Chart */}
			<Card className="bg-card border">
				<CardContent className="pt-4 sm:pt-6">
					<Skeleton className="h-[300px] w-full" />
				</CardContent>
			</Card>
		</div>
	);
}