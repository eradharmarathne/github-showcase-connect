import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function ReportsSkeleton() {
	return (
		<div className="max-w-full pb-20 w-full mx-auto p-2 lg:p-6 space-y-4 animate-fade-in">
			{/* Header */}
			<div className="flex items-center justify-between">
				<Skeleton className="h-8 w-32" />
				<div className="flex gap-2">
					<Skeleton className="h-10 w-24" />
					<Skeleton className="h-10 w-28" />
				</div>
			</div>

			{/* Stats Cards */}
			<div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
				{Array.from({ length: 4 }).map((_, index) => (
					<Card key={index} className="bg-card border">
						<CardContent className="p-3 lg:p-6">
							<div className="space-y-2">
								<Skeleton className="h-4 w-24" />
								<div className="flex items-center gap-2">
									<Skeleton className="h-4 w-4" />
									<Skeleton className="h-8 w-20" />
								</div>
							</div>
						</CardContent>
					</Card>
				))}
			</div>

			{/* Reports Tabs */}
			<Tabs defaultValue="comprehensive" className="w-full">
				<TabsList className="grid w-full grid-cols-5">
					<TabsTrigger value="comprehensive"><Skeleton className="h-4 w-24" /></TabsTrigger>
					<TabsTrigger value="financial"><Skeleton className="h-4 w-18" /></TabsTrigger>
					<TabsTrigger value="accounts"><Skeleton className="h-4 w-16" /></TabsTrigger>
					<TabsTrigger value="commissions"><Skeleton className="h-4 w-20" /></TabsTrigger>
					<TabsTrigger value="balance"><Skeleton className="h-4 w-24" /></TabsTrigger>
				</TabsList>

				<TabsContent value="comprehensive" className="space-y-4">
					{/* Filters */}
					<Card>
						<CardHeader>
							<Skeleton className="h-6 w-28" />
						</CardHeader>
						<CardContent>
							<div className="grid grid-cols-1 md:grid-cols-4 gap-4">
								<div className="space-y-2">
									<Skeleton className="h-4 w-20" />
									<Skeleton className="h-10 w-full" />
								</div>
								<div className="space-y-2">
									<Skeleton className="h-4 w-24" />
									<Skeleton className="h-10 w-full" />
								</div>
								<div className="space-y-2">
									<Skeleton className="h-4 w-20" />
									<Skeleton className="h-10 w-full" />
								</div>
								<div className="flex items-end">
									<Skeleton className="h-10 w-32" />
								</div>
							</div>
						</CardContent>
					</Card>

					{/* Chart and Table */}
					<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
						<Card>
							<CardHeader>
								<Skeleton className="h-6 w-28" />
							</CardHeader>
							<CardContent>
								<Skeleton className="h-64 w-full" />
							</CardContent>
						</Card>
						<Card>
							<CardHeader>
								<Skeleton className="h-6 w-28" />
							</CardHeader>
							<CardContent className="space-y-3">
								{Array.from({ length: 6 }).map((_, index) => (
									<div
										key={index}
										className="flex justify-between items-center p-2 border rounded"
									>
										<Skeleton className="h-4 w-24" />
										<Skeleton className="h-4 w-20" />
									</div>
								))}
							</CardContent>
						</Card>
					</div>

					{/* Data Table */}
					<Card>
						<CardHeader>
							<Skeleton className="h-6 w-36" />
						</CardHeader>
						<CardContent>
							<div className="space-y-3">
								{Array.from({ length: 10 }).map((_, index) => (
									<div
										key={index}
										className="grid grid-cols-5 gap-4 p-3 border rounded"
									>
										<Skeleton className="h-4 w-20" />
										<Skeleton className="h-4 w-24" />
										<Skeleton className="h-4 w-16" />
										<Skeleton className="h-4 w-20" />
										<Skeleton className="h-4 w-18" />
									</div>
								))}
							</div>
						</CardContent>
					</Card>
				</TabsContent>

				{/* Other tabs content skeletons */}
				{["financial", "accounts", "commissions", "balance"].map((tab) => (
					<TabsContent key={tab} value={tab} className="space-y-4">
						<Card>
							<CardHeader>
								<Skeleton className="h-6 w-48" />
							</CardHeader>
							<CardContent>
								<Skeleton className="h-96 w-full" />
							</CardContent>
						</Card>
					</TabsContent>
				))}
			</Tabs>
		</div>
	);
}
