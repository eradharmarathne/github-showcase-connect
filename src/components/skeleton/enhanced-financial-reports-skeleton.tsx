import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function EnhancedFinancialReportsSkeleton() {
	return (
		<div className="space-y-6 px-2 sm:px-4">
			{/* Financial Summary Cards Skeleton */}
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
				{Array.from({ length: 4 }).map((_, i) => (
					<Card key={i}>
						<CardHeader className="pb-2">
							<div className="flex items-center gap-2">
								<Skeleton className="h-4 w-4 rounded" />
								<Skeleton className="h-4 w-28" />
							</div>
						</CardHeader>
						<CardContent>
							<Skeleton className="h-8 w-24 mb-1" />
							<Skeleton className="h-3 w-16" />
						</CardContent>
					</Card>
				))}
			</div>

			{/* Monthly Breakdown Skeleton */}
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				{Array.from({ length: 2 }).map((_, i) => (
					<Card key={i}>
						<CardHeader>
							<Skeleton className="h-6 w-40" />
							<Skeleton className="h-4 w-56" />
						</CardHeader>
						<CardContent>
							<div className="space-y-4">
								{Array.from({ length: 6 }).map((_, j) => (
									<div
										key={j}
										className="flex items-center justify-between p-3 border rounded-lg"
									>
										<div className="flex items-center gap-2">
											<Skeleton className="h-4 w-4" />
											<div>
												<Skeleton className="h-3 w-20 mb-1" />
												<Skeleton className="h-4 w-32" />
											</div>
										</div>
										<Skeleton className="h-4 w-16" />
									</div>
								))}
							</div>
						</CardContent>
					</Card>
				))}
			</div>
		</div>
	);
}
