import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function AccountsSkeleton() {
	return (
		<div className="p-6 space-y-6">
			{/* Header */}
			<div className="flex justify-between items-center">
				<Skeleton className="h-8 w-48" />
				<div className="flex gap-2">
					<Skeleton className="h-10 w-32" />
					<Skeleton className="h-10 w-28" />
				</div>
			</div>

			{/* Summary Cards */}
			<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
				<Card>
					<CardHeader className="pb-2">
						<Skeleton className="h-4 w-24" />
					</CardHeader>
					<CardContent>
						<Skeleton className="h-8 w-32" />
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="pb-2">
						<Skeleton className="h-4 w-28" />
					</CardHeader>
					<CardContent>
						<Skeleton className="h-8 w-28" />
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="pb-2">
						<Skeleton className="h-4 w-32" />
					</CardHeader>
					<CardContent>
						<Skeleton className="h-8 w-36" />
					</CardContent>
				</Card>
			</div>

			{/* Accounts Tabs */}
			<Tabs defaultValue="accounts" className="w-full">
				<TabsList className="grid w-full grid-cols-2">
					<TabsTrigger value="accounts"><Skeleton className="h-4 w-16" /></TabsTrigger>
					<TabsTrigger value="transactions"><Skeleton className="h-4 w-28" /></TabsTrigger>
				</TabsList>

				<TabsContent value="accounts" className="space-y-4">
					{/* Accounts Grid */}
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
						{Array.from({ length: 6 }).map((_, index) => (
							<Card key={index}>
								<CardHeader className="pb-2">
									<div className="flex items-center justify-between">
										<Skeleton className="h-5 w-32" />
										<Skeleton className="h-6 w-12 rounded-full" />
									</div>
								</CardHeader>
								<CardContent className="space-y-2">
									<div className="flex justify-between items-center">
										<Skeleton className="h-4 w-16" />
										<Skeleton className="h-6 w-24" />
									</div>
									<div className="flex gap-2 mt-3">
										<Skeleton className="h-8 w-8" />
										<Skeleton className="h-8 w-8" />
										<Skeleton className="h-8 w-8" />
									</div>
								</CardContent>
							</Card>
						))}
					</div>
				</TabsContent>

				<TabsContent value="transactions" className="space-y-4">
					<Card>
						<CardHeader>
							<Skeleton className="h-6 w-40" />
						</CardHeader>
						<CardContent>
							<div className="space-y-3">
								{Array.from({ length: 8 }).map((_, index) => (
									<div
										key={index}
										className="flex items-center justify-between p-3 border rounded-lg"
									>
										<div className="flex items-center gap-3">
											<Skeleton className="h-8 w-8 rounded-full" />
											<div className="space-y-1">
												<Skeleton className="h-4 w-32" />
												<Skeleton className="h-3 w-24" />
											</div>
										</div>
										<div className="text-right space-y-1">
											<Skeleton className="h-4 w-20" />
											<Skeleton className="h-3 w-16" />
										</div>
									</div>
								))}
							</div>
						</CardContent>
					</Card>
				</TabsContent>
			</Tabs>
		</div>
	);
}
