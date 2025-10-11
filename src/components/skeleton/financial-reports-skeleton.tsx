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
			<div className="border rounded-lg bg-card">
				<div className="p-6">
					<div className="flex text-base md:text-lg lg:text-xl items-center gap-2">
						<Skeleton className="h-5 w-5" />
						<Skeleton className="h-6 w-32" />
					</div>
				</div>
				<div className="p-6 pt-0">
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
				</div>
			</div>

			{/* Summary Cards */}
			<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
				{/* Total Income Card */}
				<div className="bg-card border relative">
					<div className="p-6">
						<div className="flex items-center justify-between">
							<div>
								<Skeleton className="h-4 w-24 mb-2" />
								<Skeleton className="h-8 w-32 mb-1" />
								<Skeleton className="h-3 w-20" />
							</div>
							<Skeleton className="h-5 w-5" />
						</div>
					</div>
				</div>

				{/* Total Expenses Card */}
				<div className="bg-card border relative">
					<div className="p-6">
						<div className="flex items-center justify-between">
							<div>
								<Skeleton className="h-4 w-28 mb-2" />
								<Skeleton className="h-8 w-32 mb-1" />
								<Skeleton className="h-3 w-20" />
							</div>
							<Skeleton className="h-5 w-5" />
						</div>
					</div>
				</div>

				{/* Net Profit Card */}
				<div className="bg-card border relative">
					<div className="p-6">
						<div className="flex items-center justify-between">
							<div>
								<Skeleton className="h-4 w-20 mb-2" />
								<Skeleton className="h-8 w-32 mb-1" />
								<Skeleton className="h-3 w-16" />
							</div>
							<Skeleton className="h-5 w-5" />
						</div>
					</div>
				</div>
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
					<div className="border rounded-lg bg-card">
						<div className="p-6">
							<Skeleton className="h-6 w-32" />
						</div>
						<div className="p-6 pt-0">
							<div className="space-y-4">
								{Array.from({ length: 5 }).map((_, i) => (
									<div key={i} className="flex justify-between items-center">
										<Skeleton className="h-4 w-24" />
										<Skeleton className="h-4 w-20" />
									</div>
								))}
							</div>
						</div>
					</div>

					{/* Expenses by Category */}
					<div className="border rounded-lg bg-card">
						<div className="p-6">
							<Skeleton className="h-6 w-40" />
						</div>
						<div className="p-6 pt-0">
							<div className="space-y-4">
								{Array.from({ length: 5 }).map((_, i) => (
									<div key={i} className="flex justify-between items-center">
										<Skeleton className="h-4 w-28" />
										<Skeleton className="h-4 w-20" />
									</div>
								))}
							</div>
						</div>
					</div>
				</TabsContent>

				<TabsContent value="profit-loss" className="space-y-6">
					<div className="border rounded-lg bg-card">
						<div className="p-6">
							<Skeleton className="h-6 w-48" />
						</div>
						<div className="p-6 pt-0">
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
						</div>
					</div>
				</TabsContent>

				<TabsContent value="balance-sheet" className="space-y-6">
					<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
						<div className="border rounded-lg bg-card">
							<div className="p-6">
								<Skeleton className="h-6 w-24" />
							</div>
							<div className="p-6 pt-0">
								<div className="space-y-4">
									{Array.from({ length: 6 }).map((_, i) => (
										<div key={i} className="flex justify-between items-center">
											<Skeleton className="h-4 w-28" />
											<Skeleton className="h-4 w-20" />
										</div>
									))}
								</div>
							</div>
						</div>

						<div className="border rounded-lg bg-card">
							<div className="p-6">
								<Skeleton className="h-6 w-32" />
							</div>
							<div className="p-6 pt-0">
								<div className="space-y-4">
									{Array.from({ length: 6 }).map((_, i) => (
										<div key={i} className="flex justify-between items-center">
											<Skeleton className="h-4 w-24" />
											<Skeleton className="h-4 w-20" />
										</div>
									))}
								</div>
							</div>
						</div>
					</div>
				</TabsContent>
			</Tabs>
		</div>
	);
}
