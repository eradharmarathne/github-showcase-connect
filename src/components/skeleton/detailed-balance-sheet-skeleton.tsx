import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function DetailedBalanceSheetSkeleton() {
	return (
		<div className="space-y-6 px-4">
			{/* Header Skeleton */}
			<div className="flex flex-col sm:flex-row gap-y-2 justify-between items-start sm:items-center">
				<div>
					<div className="flex items-center gap-2 mb-2">
						<Skeleton className="h-6 w-6" />
						<Skeleton className="h-6 w-48" />
					</div>
					<Skeleton className="h-4 w-64" />
				</div>
				<div className="flex gap-2">
					<Skeleton className="h-10 w-24" />
					<Skeleton className="h-10 w-32" />
				</div>
			</div>

			{/* Account Summary Skeleton */}
			<Card className="bg-muted/20">
				<CardHeader>
					<Skeleton className="h-6 w-32" />
				</CardHeader>
				<CardContent>
					<div className="grid grid-cols-2 md:grid-cols-4 gap-6">
						{Array.from({ length: 4 }).map((_, i) => (
							<div key={i}>
								<Skeleton className="h-4 w-24 mb-2" />
								<Skeleton className="h-6 w-20" />
							</div>
						))}
					</div>
				</CardContent>
			</Card>

			{/* Transaction History Skeleton */}
			<Card>
				<CardHeader>
					<Skeleton className="h-5 w-56" />
				</CardHeader>
				<CardContent>
					<div className="space-y-2 max-h-96 overflow-y-auto">
						{Array.from({ length: 8 }).map((_, i) => (
							<div
								key={i}
								className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 border rounded-lg"
							>
								<div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
									<Skeleton className="h-6 w-16 rounded-full" />
									<div>
										<Skeleton className="h-3 w-32 mb-1" />
										<Skeleton className="h-4 w-40 mb-1" />
										<Skeleton className="h-3 w-24" />
									</div>
								</div>
								<div className="text-left sm:text-right">
									<Skeleton className="h-5 w-20 mb-1" />
									<div className="text-sm">
										<Skeleton className="h-3 w-16 mb-1" />
										<Skeleton className="h-4 w-18" />
									</div>
								</div>
							</div>
						))}
					</div>
				</CardContent>
			</Card>

			{/* Account Details Skeleton */}
			<div>
				<Skeleton className="h-6 w-32 mb-4" />
				<div className="space-y-4">
					{Array.from({ length: 3 }).map((_, i) => (
						<Card key={i} className="border-l-2 sm:border-l-4 border-l-primary">
							<CardHeader className="pb-3">
								<div className="flex flex-col sm:flex-row items-start sm:items-center justify-between">
									<div>
										<Skeleton className="h-5 w-32 mb-2" />
										<div className="flex items-center gap-2">
											<Skeleton className="h-5 w-20 rounded-full" />
											<Skeleton className="h-4 w-24" />
										</div>
									</div>
									<div className="text-right">
										<Skeleton className="h-4 w-24 mb-1" />
										<Skeleton className="h-6 w-20" />
									</div>
								</div>
							</CardHeader>
							<CardContent>
								<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
									{Array.from({ length: 4 }).map((_, j) => (
										<div key={j} className="text-center">
											<Skeleton className="h-3 w-20 mx-auto mb-1" />
											<Skeleton className="h-5 w-16 mx-auto" />
										</div>
									))}
								</div>

								{/* Expandable Transaction Section Skeleton */}
								<div className="mt-4">
									<div className="flex items-center gap-2 mb-2">
										<Skeleton className="h-4 w-4" />
										<Skeleton className="h-4 w-32" />
									</div>
									<div className="space-y-2">
										{Array.from({ length: 3 }).map((_, k) => (
											<div
												key={k}
												className="flex items-center justify-between p-2 border rounded"
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
								</div>
							</CardContent>
						</Card>
					))}
				</div>
			</div>
		</div>
	);
}
