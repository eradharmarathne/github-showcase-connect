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
					<h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-foreground">
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
		</div>
	);
}
