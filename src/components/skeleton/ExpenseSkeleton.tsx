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

export function ExpenseSkeleton() {
	return (
		<div className="p-6 space-y-6">
			{/* Header with back button */}
			<Skeleton className="h-8 w-64" />

			{/* Expense Form Card */}
			<Card>
				<CardHeader>
					<Skeleton className="h-6 w-32" />
				</CardHeader>
				<CardContent className="space-y-4">
					{/* Form Grid */}
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
						<div className="space-y-2">
							<Skeleton className="h-4 w-24" />
							<Skeleton className="h-10 w-full" />
						</div>
						<div className="space-y-2">
							<Skeleton className="h-4 w-24" />
							<Skeleton className="h-10 w-full" />
						</div>
						<div className="space-y-2">
							<Skeleton className="h-4 w-16" />
							<Skeleton className="h-10 w-full" />
						</div>
						<div className="space-y-2">
							<Skeleton className="h-4 w-20" />
							<Skeleton className="h-10 w-full" />
						</div>
						<div className="space-y-2">
							<Skeleton className="h-4 w-20" />
							<Skeleton className="h-10 w-full" />
						</div>
						<div className="space-y-2">
							<Skeleton className="h-4 w-12" />
							<Skeleton className="h-10 w-full" />
						</div>
					</div>
					{/* Note field */}
					<div className="space-y-2">
						<Skeleton className="h-4 w-12" />
						<Skeleton className="h-20 w-full" />
					</div>
					{/* Submit button */}
					<Skeleton className="h-10 w-32" />
				</CardContent>
			</Card>

			{/* Expense Shortcuts */}
			<Card>
				<CardHeader>
					<Skeleton className="h-6 w-40" />
				</CardHeader>
				<CardContent>
					<div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
						{Array.from({ length: 12 }).map((_, index) => (
							<Skeleton key={index} className="h-16 w-full" />
						))}
					</div>
				</CardContent>
			</Card>

			{/* Recent Expenses */}
			<Card>
				<CardHeader>
					<Skeleton className="h-6 w-32" />
				</CardHeader>
				<CardContent>
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>
									<Skeleton className="h-4 w-12" />
								</TableHead>
								<TableHead>
									<Skeleton className="h-4 w-18" />
								</TableHead>
								<TableHead>
									<Skeleton className="h-4 w-16" />
								</TableHead>
								<TableHead>
									<Skeleton className="h-4 w-16" />
								</TableHead>
								<TableHead>
									<Skeleton className="h-4 w-12" />
								</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{Array.from({ length: 6 }).map((_, index) => (
								<TableRow key={index}>
									<TableCell>
										<Skeleton className="h-4 w-20" />
									</TableCell>
									<TableCell>
										<Skeleton className="h-4 w-32" />
									</TableCell>
									<TableCell>
										<Skeleton className="h-4 w-20" />
									</TableCell>
									<TableCell>
										<Skeleton className="h-4 w-24" />
									</TableCell>
									<TableCell>
										<Skeleton className="h-4 w-36" />
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</CardContent>
			</Card>
		</div>
	);
}
