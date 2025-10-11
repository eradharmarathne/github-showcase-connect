import { Skeleton } from "@/components/ui/skeleton";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";

export function BookingChannelsSkeleton() {
	return (
		<div className="space-y-6 px-4 sm:px-6 pt-8">
			{/* Header */}
			<div className="flex flex-col sm:flex-row sm:items-center sm:gap-4 gap-3">
				<Skeleton className="h-10 w-36 rounded-md" />
				<div className="space-y-2 w-full sm:w-auto">
					<Skeleton className="h-3 w-36" />
					<Skeleton className="h-3 w-48" />
				</div>
			</div>

			{/* Stats Cards */}
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
				{Array.from({ length: 4 }).map((_, index) => (
					<div key={index}>
						<div className="flex items-center justify-between pb-2">
							<Skeleton className="h-4 w-24" />
							<Skeleton className="h-4 w-4 rounded-full" />
						</div>
						<div className="space-y-2">
							<Skeleton className="h-8 w-24" />
							<Skeleton className="h-3 w-32" />
						</div>
					</div>
				))}
			</div>

			{/* Tabs */}
			<div className="flex flex-wrap gap-2">
				{Array.from({ length: 3 }).map((_, index) => (
					<Skeleton key={index} className="h-10 w-28 rounded-full" />
				))}
			</div>

			{/* Location Filter */}
			<div className="border rounded-lg bg-card">
				<div className="p-6">
					<div className="text-lg font-semibold">
						<Skeleton className="h-5 w-44" />
					</div>
				</div>
				<div className="p-6 pt-0">
					<div className="flex flex-wrap gap-2">
						{Array.from({ length: 4 }).map((_, index) => (
							<Skeleton key={index} className="h-9 w-36 rounded-full" />
						))}
					</div>
				</div>
			</div>

			{/* Bookings Table */}
			<div className="border rounded-lg bg-card">
				<div className="space-y-2">
					<Skeleton className="h-6 w-48" />
					<Skeleton className="h-4 w-64" />
				</div>
				<div className="p-6 pt-0">
					<div className="overflow-x-auto">
						<Table>
							<TableHeader>
								<TableRow>
									{Array.from({ length: 8 }).map((_, index) => (
										<TableHead key={index}>
											<Skeleton className="h-4 w-20" />
										</TableHead>
									))}
								</TableRow>
							</TableHeader>
							<TableBody>
								{Array.from({ length: 5 }).map((_, rowIndex) => (
									<TableRow key={rowIndex}>
										<TableCell>
											<div className="space-y-2">
												<Skeleton className="h-4 w-32" />
												<Skeleton className="h-3 w-24" />
											</div>
										</TableCell>
										<TableCell>
											<Skeleton className="h-4 w-28" />
										</TableCell>
										<TableCell>
											<div className="space-y-2">
												<Skeleton className="h-4 w-28" />
												<Skeleton className="h-3 w-32" />
											</div>
										</TableCell>
										<TableCell>
											<Skeleton className="h-4 w-24" />
										</TableCell>
										<TableCell>
											<Skeleton className="h-4 w-24" />
										</TableCell>
										<TableCell>
											<Skeleton className="h-6 w-24 rounded-full" />
										</TableCell>
										<TableCell>
											<Skeleton className="h-6 w-24 rounded-full" />
										</TableCell>
										<TableCell>
											<Skeleton className="h-8 w-10 rounded-md" />
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</div>
				</div>
			</div>

			{/* Analytics Preview */}
			<div className="border rounded-lg bg-card">
				<div className="space-y-2">
					<Skeleton className="h-6 w-40" />
					<Skeleton className="h-4 w-64" />
				</div>
				<div className="p-6 pt-0">
					<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
						{Array.from({ length: 2 }).map((_, columnIndex) => (
							<div key={columnIndex} className="space-y-3">
								<Skeleton className="h-4 w-36" />
								{Array.from({ length: 4 }).map((_, itemIndex) => (
									<div
										key={itemIndex}
										className="flex items-center justify-between"
									>
										<Skeleton className="h-6 w-32 rounded-full" />
										<Skeleton className="h-4 w-16" />
									</div>
								))}
							</div>
						))}
					</div>
				</div>
			</div>

			{/* Settings Preview */}
			<div className="border rounded-lg bg-card">
				<div className="space-y-2">
					<Skeleton className="h-6 w-56" />
					<Skeleton className="h-4 w-72" />
				</div>
				<div className="space-y-5">
					{Array.from({ length: 3 }).map((_, index) => (
						<div key={index} className="border-l-4 border-l-primary/40">
							<div className="flex items-center justify-between pb-3">
								<Skeleton className="h-5 w-40" />
								<Skeleton className="h-6 w-24 rounded-full" />
							</div>
							<div className="space-y-3">
								<div className="flex flex-wrap gap-2">
									{Array.from({ length: 4 }).map((_, badgeIndex) => (
										<Skeleton
											key={badgeIndex}
											className="h-7 w-28 rounded-full"
										/>
									))}
								</div>
								<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
									<Skeleton className="h-10 w-full" />
									<Skeleton className="h-10 w-full" />
								</div>
							</div>
						</div>
					))}

					<div className="border border-dashed rounded-lg p-4 space-y-4">
						<div className="space-y-2">
							<Skeleton className="h-5 w-48" />
							<Skeleton className="h-4 w-64" />
						</div>
						<div className="space-y-3">
							<div className="bg-muted/50 p-3 rounded-lg space-y-2">
								<Skeleton className="h-4 w-36" />
								{Array.from({ length: 4 }).map((_, itemIndex) => (
									<Skeleton key={itemIndex} className="h-3 w-full" />
								))}
							</div>
							<div className="flex flex-col md:flex-row gap-3">
								<Skeleton className="h-10 w-full md:w-64" />
								<Skeleton className="h-10 w-full md:w-32" />
							</div>
							<Skeleton className="h-10 w-full md:w-48" />
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
