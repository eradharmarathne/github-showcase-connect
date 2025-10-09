import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function FinancialReportsSkeleton() {
	return (
		<div className="container mx-auto p-6 space-y-6">
			{/* Header */}
			<div className="flex items-center gap-4 mb-6">
				<Skeleton className="h-10 w-10" />
				<div>
					<Skeleton className="h-6 w-48 mb-2" />
					<Skeleton className="h-4 w-64" />
				</div>
			</div>

			{/* Report Filters */}
			<Card>
				<CardHeader>
					<CardTitle className="flex text-base md:text-lg lg:text-xl items-center gap-2">
						<Skeleton className="h-5 w-5" />
						<Skeleton className="h-6 w-32" />
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="grid grid-cols-1 md:grid-cols-4 gap-4">
						<div>
							<Skeleton className="h-4 w-24 mb-2" />
							<Skeleton className="h-10 w-full" />
						</div>
						<div>
							<Skeleton className="h-4 w-20 mb-2" />
							<Skeleton className="h-10 w-full" />
						</div>
						<div>
							<Skeleton className="h-4 w-20 mb-2" />
							<Skeleton className="h-10 w-full" />
						</div>
						<div>
							<Skeleton className="h-10 w-full" />
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Summary Cards */}
			<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
				{/* Total Income Card */}
				<Card className="bg-card border relative">
					<CardContent className="p-6">
						<div className="flex items-center justify-between">
							<div>
								<Skeleton className="h-4 w-24 mb-2" />
								<Skeleton className="h-8 w-32 mb-1" />
								<Skeleton className="h-3 w-20" />
							</div>
							<Skeleton className="h-5 w-5" />
						</div>
					</CardContent>
				</Card>

				{/* Total Expenses Card */}
				<Card className="bg-card border relative">
					<CardContent className="p-6">
						<div className="flex items-center justify-between">
							<div>
								<Skeleton className="h-4 w-28 mb-2" />
								<Skeleton className="h-8 w-32 mb-1" />
								<Skeleton className="h-3 w-20" />
							</div>
							<Skeleton className="h-5 w-5" />
						</div>
					</CardContent>
				</Card>

				{/* Net Profit Card */}
				<Card className="bg-card border relative">
					<CardContent className="p-6">
						<div className="flex items-center justify-between">
							<div>
								<Skeleton className="h-4 w-20 mb-2" />
								<Skeleton className="h-8 w-32 mb-1" />
								<Skeleton className="h-3 w-16" />
							</div>
							<Skeleton className="h-5 w-5" />
						</div>
					</CardContent>
				</Card>
			</div>

			{/* Report Tabs */}
			<Tabs defaultValue="summary" className="w-full">
				<TabsList className="grid w-full grid-cols-3">
					<TabsTrigger value="summary" className="flex items-center gap-2">
						<Skeleton className="h-4 w-4" />
						<Skeleton className="h-4 w-16" />
					</TabsTrigger>
					<TabsTrigger value="profit-loss" className="flex items-center gap-2">
						<Skeleton className="h-4 w-4" />
						<Skeleton className="h-4 w-20" />
					</TabsTrigger>
					<TabsTrigger
						value="balance-sheet"
						className="flex items-center gap-2"
					>
						<Skeleton className="h-4 w-4" />
						<Skeleton className="h-4 w-24" />
					</TabsTrigger>
				</TabsList>

				<TabsContent value="summary" className="space-y-6">
					{/* Income by Type */}
					<Card>
						<CardHeader>
							<Skeleton className="h-6 w-32" />
						</CardHeader>
						<CardContent>
							<div className="space-y-4">
								{Array.from({ length: 5 }).map((_, i) => (
									<div key={i} className="flex justify-between items-center">
										<Skeleton className="h-4 w-24" />
										<Skeleton className="h-4 w-20" />
									</div>
								))}
							</div>
						</CardContent>
					</Card>

					{/* Expenses by Category */}
					<Card>
						<CardHeader>
							<Skeleton className="h-6 w-40" />
						</CardHeader>
						<CardContent>
							<div className="space-y-4">
								{Array.from({ length: 5 }).map((_, i) => (
									<div key={i} className="flex justify-between items-center">
										<Skeleton className="h-4 w-28" />
										<Skeleton className="h-4 w-20" />
									</div>
								))}
							</div>
						</CardContent>
					</Card>
				</TabsContent>

				<TabsContent value="profit-loss" className="space-y-6">
					<Card>
						<CardHeader>
							<Skeleton className="h-6 w-48" />
						</CardHeader>
						<CardContent>
							<div className="space-y-4">
								{Array.from({ length: 8 }).map((_, i) => (
									<div
										key={i}
										className="flex justify-between items-center py-2 border-b"
									>
										<Skeleton className="h-4 w-32" />
										<Skeleton className="h-4 w-24" />
									</div>
								))}
							</div>
						</CardContent>
					</Card>
				</TabsContent>

				<TabsContent value="balance-sheet" className="space-y-6">
					<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
						<Card>
							<CardHeader>
								<Skeleton className="h-6 w-24" />
							</CardHeader>
							<CardContent>
								<div className="space-y-4">
									{Array.from({ length: 6 }).map((_, i) => (
										<div key={i} className="flex justify-between items-center">
											<Skeleton className="h-4 w-28" />
											<Skeleton className="h-4 w-20" />
										</div>
									))}
								</div>
							</CardContent>
						</Card>

						<Card>
							<CardHeader>
								<Skeleton className="h-6 w-32" />
							</CardHeader>
							<CardContent>
								<div className="space-y-4">
									{Array.from({ length: 6 }).map((_, i) => (
										<div key={i} className="flex justify-between items-center">
											<Skeleton className="h-4 w-24" />
											<Skeleton className="h-4 w-20" />
										</div>
									))}
								</div>
							</CardContent>
						</Card>
					</div>
				</TabsContent>
			</Tabs>
		</div>
	);
}
