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

export function UsersSkeleton() {
	return (
		<div className="p-6 space-y-6">
			{/* Header */}
			<div className="flex justify-between items-center">
				<Skeleton className="h-8 w-48" />
				<Skeleton className="h-10 w-32" />
			</div>

			{/* Users Table */}
			<Card>
				<CardHeader>
					<Skeleton className="h-6 w-28" />
				</CardHeader>
				<CardContent>
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>
									<Skeleton className="h-4 w-12" />
								</TableHead>
								<TableHead>
									<Skeleton className="h-4 w-16" />
								</TableHead>
								<TableHead>
									<Skeleton className="h-4 w-12" />
								</TableHead>
								<TableHead>
									<Skeleton className="h-4 w-14" />
								</TableHead>
								<TableHead>
									<Skeleton className="h-4 w-20" />
								</TableHead>
								<TableHead>
									<Skeleton className="h-4 w-16" />
								</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{Array.from({ length: 8 }).map((_, index) => (
								<TableRow key={index}>
									<TableCell>
										<div className="flex items-center gap-3">
											<Skeleton className="h-8 w-8 rounded-full" />
											<div className="space-y-1">
												<Skeleton className="h-4 w-24" />
												<Skeleton className="h-3 w-32" />
											</div>
										</div>
									</TableCell>
									<TableCell>
										<Skeleton className="h-4 w-40" />
									</TableCell>
									<TableCell>
										<Skeleton className="h-6 w-20 rounded-full" />
									</TableCell>
									<TableCell>
										<Skeleton className="h-6 w-16 rounded-full" />
									</TableCell>
									<TableCell>
										<Skeleton className="h-4 w-24" />
									</TableCell>
									<TableCell>
										<div className="flex gap-2">
											<Skeleton className="h-8 w-8" />
											<Skeleton className="h-8 w-8" />
											<Skeleton className="h-8 w-8" />
										</div>
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</CardContent>
			</Card>

			{/* Permissions Matrix */}
			<Card>
				<CardHeader>
					<Skeleton className="h-6 w-32" />
				</CardHeader>
				<CardContent>
					<div className="space-y-4">
						{Array.from({ length: 5 }).map((_, userIndex) => (
							<div key={userIndex} className="p-4 border rounded-lg">
								<div className="flex items-center gap-3 mb-3">
									<Skeleton className="h-6 w-6 rounded-full" />
									<Skeleton className="h-4 w-32" />
								</div>
								<div className="grid grid-cols-4 gap-3">
									{Array.from({ length: 12 }).map((_, permIndex) => (
										<div key={permIndex} className="flex items-center gap-2">
											<Skeleton className="h-4 w-4 rounded" />
											<Skeleton className="h-3 w-20" />
										</div>
									))}
								</div>
							</div>
						))}
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
