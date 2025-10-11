import { formatDistanceToNow } from "date-fns";
import { MessageCircle, Star } from "lucide-react";
import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { Tables } from "@/integrations/supabase/types";
import { ReplyModal } from "./reply-modal";

type Review = Tables<"google_reviews">;

interface ReviewCardProps {
	review: Review;
}

export function ReviewCard({ review }: ReviewCardProps) {
	const [isReplyModalOpen, setIsReplyModalOpen] = useState(false);

	const renderStars = (rating: number) => {
		return (
			<div className="flex items-center space-x-1">
				{Array.from({ length: 5 }).map((_, i) => (
					<Star
						key={i}
						className={`h-4 w-4 ${
							i < rating
								? "fill-yellow-400 text-yellow-400"
								: "fill-gray-200 text-gray-200"
						}`}
					/>
				))}
			</div>
		);
	};

	const getInitials = (name: string | null) => {
		if (!name) return "?";
		return name
			.split(" ")
			.map((n) => n[0])
			.join("")
			.toUpperCase()
			.substring(0, 2);
	};

	const formatReviewDate = (dateString: string) => {
		try {
			return formatDistanceToNow(new Date(dateString), { addSuffix: true });
		} catch {
			return "Unknown date";
		}
	};

	return (
		<>
			<Card>
				<CardContent className="p-6">
					<div className="space-y-4">
						{/* Reviewer Info */}
						<div className="flex items-start justify-between">
							<div className="flex items-center space-x-4">
								<Avatar>
									<AvatarImage
										src={review.reviewer_profile_photo_url || undefined}
										alt={review.reviewer_name || "Reviewer"}
									/>
									<AvatarFallback>
										{getInitials(review.reviewer_name)}
									</AvatarFallback>
								</Avatar>
								<div>
									<div className="flex items-center space-x-2">
										<h3 className="font-semibold">
											{review.reviewer_name || "Anonymous"}
										</h3>
										{review.has_reply && (
											<Badge variant="secondary" className="text-xs">
												Replied
											</Badge>
										)}
									</div>
									<p className="text-sm text-muted-foreground">
										{formatReviewDate(review.review_time)}
									</p>
								</div>
							</div>
							<div className="flex flex-col items-end space-y-2">
								{renderStars(review.star_rating)}
							</div>
						</div>

						{/* Review Comment */}
						{review.comment && (
							<div className="rounded-lg bg-muted/50 p-4">
								<p className="text-sm leading-relaxed whitespace-pre-wrap">
									{review.comment}
								</p>
							</div>
						)}

						{/* Reply Section */}
						{review.has_reply && review.reply_text ? (
							<div className="rounded-lg border-l-4 border-primary bg-primary/5 p-4">
								<div className="mb-2 flex items-center space-x-2">
									<MessageCircle className="h-4 w-4 text-primary" />
									<span className="text-sm font-semibold text-primary">
										Your Response
									</span>
									{review.reply_updated_at && (
										<span className="text-xs text-muted-foreground">
											{formatReviewDate(review.reply_updated_at)}
										</span>
									)}
								</div>
								<p className="text-sm leading-relaxed whitespace-pre-wrap">
									{review.reply_text}
								</p>
							</div>
						) : (
							<div className="flex justify-end">
								<Button
									variant="outline"
									size="sm"
									onClick={() => setIsReplyModalOpen(true)}
									className="gap-2"
								>
									<MessageCircle className="h-4 w-4" />
									Reply to Review
								</Button>
							</div>
						)}
					</div>
				</CardContent>
			</Card>

			<ReplyModal
				review={review}
				isOpen={isReplyModalOpen}
				onClose={() => setIsReplyModalOpen(false)}
			/>
		</>
	);
}
