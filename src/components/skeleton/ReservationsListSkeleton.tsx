import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function ReservationsListSkeleton() {
	return (
		<div className="max-w-full w-full pb-20 sm:pb-0 mx-auto space-y-6">
			{/* Header Skeleton */}

			{/* Tabs Skeleton */}
			<div className="w-full">
				<div className="space-y-4">
					{/* Desktop Table View Skeleton */}
					<div className="hidden lg:block">
						<Card>
							<CardHeader>
								<CardTitle className="px-4">
									<Skeleton className="h-6 w-24" />
								</CardTitle>
							</CardHeader>
							<CardContent>
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead>
												<Skeleton className="h-6 w-24" />
											</TableHead>
											<TableHead>
												<Skeleton className="h-6 w-24" />
											</TableHead>
											<TableHead>
												<Skeleton className="h-6 w-24" />
											</TableHead>
											<TableHead>
												<Skeleton className="h-6 w-24" />
											</TableHead>
											<TableHead>
												<Skeleton className="h-6 w-24" />
											</TableHead>
											<TableHead>
												<Skeleton className="h-6 w-24" />
											</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{Array.from({ length: 8 }).map((_, index) => (
											<TableRow key={index}>
												<TableCell>
													<Skeleton className="h-4 w-24" />
												</TableCell>
												<TableCell>
													<Skeleton className="h-4 w-32" />
												</TableCell>
												<TableCell>
													<Skeleton className="h-4 w-28" />
												</TableCell>
												<TableCell>
													<Skeleton className="h-4 w-20" />
												</TableCell>
												<TableCell>
													<Skeleton className="h-4 w-20" />
												</TableCell>
												<TableCell>
													<Skeleton className="h-4 w-24" />
												</TableCell>
												<TableCell>
													<Skeleton className="h-4 w-20" />
												</TableCell>
												<TableCell>
													<Skeleton className="h-6 w-20 rounded-full" />
												</TableCell>
												<TableCell>
													<div className="flex gap-1">
														<Skeleton className="h-8 w-8 rounded" />
														<Skeleton className="h-8 w-8 rounded" />
														<Skeleton className="h-8 w-8 rounded" />
														<Skeleton className="h-8 w-8 rounded" />
													</div>
												</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
							</CardContent>
						</Card>
					</div>

					{/* Mobile Card View Skeleton */}
					<div className="lg:hidden grid gap-4">
						{Array.from({ length: 6 }).map((_, index) => (
							<Card key={index} className="w-full">
								<CardContent className="p-4">
									<div className="flex justify-between items-start mb-3">
										<div className="space-y-1">
											<Skeleton className="h-4 w-24" />
											<Skeleton className="h-3 w-32" />
										</div>
										<Skeleton className="h-6 w-20 rounded-full" />
									</div>

									<div className="space-y-2">
										<div className="flex items-center gap-2">
											<Skeleton className="h-3 w-3 rounded" />
											<Skeleton className="h-3 w-28" />
										</div>
										<div className="flex items-center gap-2">
											<Skeleton className="h-3 w-3 rounded" />
											<Skeleton className="h-3 w-36" />
										</div>
										<div className="flex items-center gap-2">
											<Skeleton className="h-3 w-3 rounded" />
											<Skeleton className="h-3 w-32" />
										</div>
										<div className="flex items-center gap-2">
											<Skeleton className="h-3 w-3 rounded" />
											<Skeleton className="h-3 w-40" />
										</div>
									</div>

									<div className="flex gap-2 mt-4">
										<Skeleton className="h-8 flex-1" />
										<Skeleton className="h-8 w-12" />
										<Skeleton className="h-8 w-12" />
										<Skeleton className="h-8 w-12" />
									</div>
								</CardContent>
							</Card>
						))}
					</div>
				</div>
			</div>
		</div>
	);
}
