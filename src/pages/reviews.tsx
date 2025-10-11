import { useQuery } from "@tanstack/react-query";
import { AlertCircle, Filter, RefreshCw, Search, Star } from "lucide-react";
import { useState } from "react";
import { ReviewCard } from "@/components/reviews/review-card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/context/auth-context";
import { useLocationContext } from "@/context/location-context";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

type Review = Tables<"google_reviews">;

type FilterOptions = {
	rating: string;
	hasReply: string;
	search: string;
	sortBy: string;
};

export default function Reviews() {
	const { tenant } = useAuth();
	const { selectedLocation } = useLocationContext();
	const [filters, setFilters] = useState<FilterOptions>({
		rating: "all",
		hasReply: "all",
		search: "",
		sortBy: "newest",
	});

	// Fetch reviews for current location
	const {
		data: reviews,
		isLoading,
		error,
		refetch,
		isFetching,
	} = useQuery({
		queryKey: ["google-reviews", tenant?.id, selectedLocation, filters],
		queryFn: async () => {
			if (!tenant?.id || !selectedLocation) {
				throw new Error("Tenant or location not selected");
			}

			let query = supabase
				.from("google_reviews")
				.select(
					`
					*,
					replied_by_profile:profiles!google_reviews_replied_by_fkey(name, email)
				`,
				)
				.eq("tenant_id", tenant.id)
				.eq("location_id", selectedLocation);

			// Apply rating filter
			if (filters.rating !== "all") {
				query = query.eq("star_rating", Number.parseInt(filters.rating));
			}

			// Apply reply filter
			if (filters.hasReply === "replied") {
				query = query.eq("has_reply", true);
			} else if (filters.hasReply === "not_replied") {
				query = query.eq("has_reply", false);
			}

			// Apply search filter
			if (filters.search) {
				query = query.or(
					`reviewer_name.ilike.%${filters.search}%,comment.ilike.%${filters.search}%`,
				);
			}

			// Apply sorting
			switch (filters.sortBy) {
				case "newest":
					query = query.order("review_time", { ascending: false });
					break;
				case "oldest":
					query = query.order("review_time", { ascending: true });
					break;
				case "highest_rating":
					query = query.order("star_rating", { ascending: false });
					break;
				case "lowest_rating":
					query = query.order("star_rating", { ascending: true });
					break;
			}

			const { data, error } = await query;

			if (error) throw error;
			return data as Review[];
		},
		enabled: !!tenant?.id && !!selectedLocation,
	});

	const handleFilterChange = (key: keyof FilterOptions, value: string) => {
		setFilters((prev) => ({ ...prev, [key]: value }));
	};

	const averageRating = reviews?.length
		? (
				reviews.reduce((sum, review) => sum + review.star_rating, 0) /
				reviews.length
			).toFixed(1)
		: "0.0";

	const totalReviews = reviews?.length || 0;
	const repliedCount = reviews?.filter((r) => r.has_reply).length || 0;
	const unrepliedCount = totalReviews - repliedCount;

	if (!selectedLocation) {
		return (
			<div className="container py-8">
				<Alert>
					<AlertCircle className="h-4 w-4" />
					<AlertDescription>
						Please select a location to view reviews.
					</AlertDescription>
				</Alert>
			</div>
		);
	}

	return (
		<div className="container space-y-6 py-8">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold tracking-tight">Reviews</h1>
					<p className="text-muted-foreground">
						Manage Google Business Profile reviews for {selectedLocation}
					</p>
				</div>
				<div className="flex space-x-2">
					<Button
						onClick={() => refetch()}
						disabled={isFetching}
						variant="outline"
						size="sm"
					>
						<RefreshCw
							className={`mr-2 h-4 w-4 ${isFetching ? "animate-spin" : ""}`}
						/>
						Refresh
					</Button>
					<Button variant="secondary" size="sm">
						<a href="/settings/google-integration">Manage Integration</a>
					</Button>
				</div>
			</div>

			{/* Stats Cards */}
			<div className="grid gap-4 md:grid-cols-4">
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Total Reviews</CardTitle>
						<Star className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">{totalReviews}</div>
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">
							Average Rating
						</CardTitle>
						<Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">{averageRating}</div>
						<p className="text-xs text-muted-foreground">out of 5.0</p>
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Replied</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">{repliedCount}</div>
						<p className="text-xs text-muted-foreground">
							{totalReviews > 0
								? `${((repliedCount / totalReviews) * 100).toFixed(0)}%`
								: "0%"}
						</p>
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">
							Awaiting Reply
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">{unrepliedCount}</div>
					</CardContent>
				</Card>
			</div>

			{/* Filters */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center text-base">
						<Filter className="mr-2 h-4 w-4" />
						Filters
					</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="grid gap-4 md:grid-cols-4">
						{/* Search */}
						<div className="relative">
							<Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
							<Input
								placeholder="Search reviews..."
								value={filters.search}
								onChange={(e) => handleFilterChange("search", e.target.value)}
								className="pl-9"
							/>
						</div>

						{/* Rating Filter */}
						<Select
							value={filters.rating}
							onValueChange={(value) => handleFilterChange("rating", value)}
						>
							<SelectTrigger>
								<SelectValue placeholder="All Ratings" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">All Ratings</SelectItem>
								<SelectItem value="5">5 Stars</SelectItem>
								<SelectItem value="4">4 Stars</SelectItem>
								<SelectItem value="3">3 Stars</SelectItem>
								<SelectItem value="2">2 Stars</SelectItem>
								<SelectItem value="1">1 Star</SelectItem>
							</SelectContent>
						</Select>

						{/* Reply Status Filter */}
						<Select
							value={filters.hasReply}
							onValueChange={(value) => handleFilterChange("hasReply", value)}
						>
							<SelectTrigger>
								<SelectValue placeholder="All Reviews" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">All Reviews</SelectItem>
								<SelectItem value="replied">Replied</SelectItem>
								<SelectItem value="not_replied">Not Replied</SelectItem>
							</SelectContent>
						</Select>

						{/* Sort By */}
						<Select
							value={filters.sortBy}
							onValueChange={(value) => handleFilterChange("sortBy", value)}
						>
							<SelectTrigger>
								<SelectValue placeholder="Sort By" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="newest">Newest First</SelectItem>
								<SelectItem value="oldest">Oldest First</SelectItem>
								<SelectItem value="highest_rating">Highest Rating</SelectItem>
								<SelectItem value="lowest_rating">Lowest Rating</SelectItem>
							</SelectContent>
						</Select>
					</div>
				</CardContent>
			</Card>

			{/* Reviews List */}
			<div className="space-y-4">
				{isLoading ? (
					Array.from({ length: 3 }).map((_, i) => (
						<Card key={`skeleton-${i}`}>
							<CardContent className="p-6">
								<div className="space-y-4">
									<div className="flex items-center space-x-4">
										<Skeleton className="h-12 w-12 rounded-full" />
										<div className="space-y-2">
											<Skeleton className="h-4 w-32" />
											<Skeleton className="h-3 w-24" />
										</div>
									</div>
									<Skeleton className="h-20 w-full" />
								</div>
							</CardContent>
						</Card>
					))
				) : error ? (
					<Alert variant="destructive">
						<AlertCircle className="h-4 w-4" />
						<AlertDescription>
							Failed to load reviews. Please try again.
						</AlertDescription>
					</Alert>
				) : reviews && reviews.length > 0 ? (
					reviews.map((review) => (
						<ReviewCard key={review.id} review={review} />
					))
				) : (
					<Card>
						<CardContent className="py-12 text-center">
							<Star className="mx-auto h-12 w-12 text-muted-foreground" />
							<h3 className="mt-4 text-lg font-semibold">No reviews found</h3>
							<p className="mt-2 text-sm text-muted-foreground">
								{filters.search ||
								filters.rating !== "all" ||
								filters.hasReply !== "all"
									? "Try adjusting your filters"
									: "Reviews will appear here once synced from Google Business Profile"}
							</p>
						</CardContent>
					</Card>
				)}
			</div>
		</div>
	);
}
