import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function SettingsSkeleton() {
	return (
		<div className="p-6 space-y-6">
			{/* Header */}
			<div className="space-y-2">
				<Skeleton className="h-8 w-32" />
				<Skeleton className="h-4 w-64" />
			</div>

			{/* Settings Tabs */}
			<Tabs defaultValue="general" className="w-full">
				<TabsList className="grid w-full grid-cols-4">
					<TabsTrigger value="general">
						<Skeleton className="h-4 w-16" />
					</TabsTrigger>
					<TabsTrigger value="notifications">
						<Skeleton className="h-4 w-20" />
					</TabsTrigger>
					<TabsTrigger value="security">
						<Skeleton className="h-4 w-16" />
					</TabsTrigger>
					<TabsTrigger value="billing">
						<Skeleton className="h-4 w-14" />
					</TabsTrigger>
				</TabsList>

				<TabsContent value="general" className="space-y-4">
					{/* Company Information */}
					<div className="border rounded-lg bg-card">
						<div className="p-6">
							<Skeleton className="h-6 w-36" />
						</div>
						<div className="space-y-4">
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
									<Skeleton className="h-4 w-24" />
									<Skeleton className="h-10 w-full" />
								</div>
							</div>
							<div className="space-y-2">
								<Skeleton className="h-4 w-20" />
								<Skeleton className="h-20 w-full" />
							</div>
							<Skeleton className="h-10 w-32" />
						</div>
					</div>

					{/* Preferences */}
					<div className="border rounded-lg bg-card">
						<div className="p-6">
							<Skeleton className="h-6 w-24" />
						</div>
						<div className="space-y-4">
							<div className="flex items-center justify-between">
								<div className="space-y-1">
									<Skeleton className="h-4 w-32" />
									<Skeleton className="h-3 w-48" />
								</div>
								<Skeleton className="h-6 w-10" />
							</div>
							<div className="flex items-center justify-between">
								<div className="space-y-1">
									<Skeleton className="h-4 w-28" />
									<Skeleton className="h-3 w-40" />
								</div>
								<Skeleton className="h-6 w-10" />
							</div>
							<div className="flex items-center justify-between">
								<div className="space-y-1">
									<Skeleton className="h-4 w-36" />
									<Skeleton className="h-3 w-52" />
								</div>
								<Skeleton className="h-6 w-10" />
							</div>
						</div>
					</div>
				</TabsContent>

				{["notifications", "security", "billing"].map((tab) => (
					<TabsContent key={tab} value={tab} className="space-y-4">
						<div className="border rounded-lg bg-card">
							<div className="p-6">
								<Skeleton className="h-6 w-48" />
							</div>
							<div className="space-y-4">
								{Array.from({ length: 5 }).map((_, index) => (
									<div
										key={index}
										className="flex items-center justify-between"
									>
										<div className="space-y-1">
											<Skeleton className="h-4 w-40" />
											<Skeleton className="h-3 w-56" />
										</div>
										<Skeleton className="h-6 w-10" />
									</div>
								))}
								<Skeleton className="h-10 w-32" />
							</div>
						</div>
					</TabsContent>
				))}
			</Tabs>
		</div>
	);
}
