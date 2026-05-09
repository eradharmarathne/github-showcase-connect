import { useLocation } from "react-router";
import {
	AccountsSkeleton,
	BookingChannelsSkeleton,
	CalendarSkeleton,
	DashboardSkeleton,
	ExpenseSkeleton,
	FinancialReportsSkeleton,
	MasterFilesSkeleton,
	ReportsSkeleton,
	ReservationsListSkeleton,
	SettingsSkeleton,
	UsersSkeleton,
} from "@/components/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface RouteLoadingStateProps {
	pathname?: string;
	message?: string;
}

function GenericPageSkeleton({ message }: { message?: string }) {
	return (
		<div className="w-full mx-auto px-4 sm:px-6 md:px-8 py-6 space-y-6">
			<div className="space-y-2">
				<Skeleton className="h-8 w-56" />
				{message ? (
					<p className="text-sm text-muted-foreground">{message}</p>
				) : (
					<Skeleton className="h-4 w-80 max-w-full" />
				)}
			</div>
			<div className="grid gap-4 md:grid-cols-3">
				{Array.from({ length: 3 }).map((_, index) => (
					<Card key={index}>
						<CardHeader className="space-y-2">
							<Skeleton className="h-5 w-32" />
							<Skeleton className="h-4 w-24" />
						</CardHeader>
						<CardContent className="space-y-3">
							<Skeleton className="h-10 w-full" />
							<Skeleton className="h-4 w-3/4" />
							<Skeleton className="h-4 w-1/2" />
						</CardContent>
					</Card>
				))}
			</div>
			<Card>
				<CardHeader>
					<Skeleton className="h-6 w-44" />
				</CardHeader>
				<CardContent className="space-y-3">
					{Array.from({ length: 6 }).map((_, index) => (
						<Skeleton key={index} className="h-10 w-full" />
					))}
				</CardContent>
			</Card>
		</div>
	);
}

function PaymentFormSkeleton() {
	return (
		<div className="w-full mx-auto px-4 sm:px-6 md:px-8 py-6 space-y-6">
			<div className="flex items-center justify-between gap-4">
				<div className="space-y-2">
					<Skeleton className="h-8 w-40" />
					<Skeleton className="h-4 w-72 max-w-full" />
				</div>
				<Skeleton className="h-10 w-32" />
			</div>
			<div className="grid gap-6 lg:grid-cols-[1fr_360px]">
				<Card>
					<CardHeader>
						<Skeleton className="h-6 w-40" />
					</CardHeader>
					<CardContent className="space-y-4">
						{Array.from({ length: 6 }).map((_, index) => (
							<div key={index} className="space-y-2">
								<Skeleton className="h-4 w-28" />
								<Skeleton className="h-10 w-full" />
							</div>
						))}
					</CardContent>
				</Card>
				<Card>
					<CardHeader>
						<Skeleton className="h-6 w-44" />
					</CardHeader>
					<CardContent className="space-y-3">
						{Array.from({ length: 5 }).map((_, index) => (
							<Skeleton key={index} className="h-5 w-full" />
						))}
					</CardContent>
				</Card>
			</div>
		</div>
	);
}

export function RouteLoadingState({
	pathname,
	message,
}: RouteLoadingStateProps) {
	const location = useLocation();
	const currentPath = pathname ?? location.pathname;

	if (currentPath === "/dashboard") return <DashboardSkeleton />;
	if (currentPath === "/calendar") return <CalendarSkeleton />;
	if (currentPath === "/reservations") return <ReservationsListSkeleton />;
	if (currentPath.startsWith("/reservations/")) {
		return <GenericPageSkeleton message={message} />;
	}
	if (currentPath === "/accounts") return <AccountsSkeleton />;
	if (currentPath === "/expense") return <ExpenseSkeleton />;
	if (currentPath === "/reports") return <ReportsSkeleton />;
	if (currentPath === "/financial-reports") return <FinancialReportsSkeleton />;
	if (currentPath === "/users") return <UsersSkeleton />;
	if (currentPath === "/settings") return <SettingsSkeleton />;
	if (currentPath === "/master-files" || currentPath === "/rooms") {
		return <MasterFilesSkeleton />;
	}
	if (currentPath === "/booking-channels") return <BookingChannelsSkeleton />;
	if (currentPath.startsWith("/payments")) return <PaymentFormSkeleton />;

	return <GenericPageSkeleton message={message} />;
}
