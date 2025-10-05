import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";

interface DashboardHeaderSkeletonProps {
	hasIncomePermission: boolean;
	hasExpensePermission: boolean;
}

export function DashboardHeaderSkeleton({
	hasIncomePermission,
	hasExpensePermission,
}: DashboardHeaderSkeletonProps) {
	return (
		<div className="flex flex-col space-y-4">
			<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
				<div>
					<h1 className="text-xl lg:text-2xl font-bold text-foreground">
						Welcome back!
					</h1>
					<p className="text-sm lg:text-base text-muted-foreground">
						Hotel Management Dashboard
					</p>
				</div>
				<div className="flex flex-col sm:flex-row gap-2">
					{hasIncomePermission && (
						<Button
							variant="default"
							size="sm"
							className="w-full sm:w-auto"
							disabled
						>
							<Plus className="size-4" />
							Add Income
						</Button>
					)}
					{hasExpensePermission && (
						<Button
							variant="outline"
							size="sm"
							className="w-full sm:w-auto"
							disabled
						>
							<Plus className="size-4" />
							Add Expense
						</Button>
					)}
				</div>
			</div>

			{/* Filters Row */}
			<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
				<div className="space-y-1">
					<Skeleton className="h-3 w-20" />
					<Skeleton className="h-9 w-full" />
				</div>
				<div className="space-y-1">
					<Skeleton className="h-3 w-18" />
					<Skeleton className="h-9 w-full" />
				</div>
			</div>
		</div>
	);
}
