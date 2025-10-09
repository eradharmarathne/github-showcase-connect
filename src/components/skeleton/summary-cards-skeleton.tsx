import { ArrowDownCircle, ArrowUpCircle, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function SummaryCardsSkeleton() {
	return (
		<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
			{/* Income Card Skeleton */}
			<Card className="bg-card border">
				<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
					<CardTitle className="text-sm font-medium text-muted-foreground">
						<Skeleton className="h-4 w-24" />
					</CardTitle>
					<ArrowUpCircle className="size-4 text-success" />
				</CardHeader>
				<CardContent>
					<Skeleton className="h-8 w-32 mb-2" />
					<Skeleton className="h-3 w-20" />
				</CardContent>
			</Card>

			{/* Expenses Card Skeleton */}
			<Card className="bg-card border">
				<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
					<CardTitle className="text-sm font-medium text-muted-foreground">
						<Skeleton className="h-4 w-28" />
					</CardTitle>
					<ArrowDownCircle className="size-4 text-destructive" />
				</CardHeader>
				<CardContent>
					<Skeleton className="h-8 w-32 mb-2" />
					<Skeleton className="h-3 w-20" />
				</CardContent>
			</Card>

			{/* Profit Card Skeleton */}
			<Card className="bg-card border">
				<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
					<CardTitle className="text-sm font-medium text-muted-foreground">
						<Skeleton className="h-4 w-24" />
					</CardTitle>
					<TrendingUp className="size-4 text-primary" />
				</CardHeader>
				<CardContent>
					<Skeleton className="h-8 w-32 mb-2" />
					<Skeleton className="h-3 w-16" />
				</CardContent>
			</Card>
		</div>
	);
}
