import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Star } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/context/auth-context";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

type Review = Tables<"google_reviews">;

interface ReplyModalProps {
	review: Review;
	isOpen: boolean;
	onClose: () => void;
}

const MAX_REPLY_LENGTH = 4096;

export function ReplyModal({ review, isOpen, onClose }: ReplyModalProps) {
	const { user } = useAuth();
	const queryClient = useQueryClient();
	const [replyText, setReplyText] = useState(review.reply_text || "");

	const replyMutation = useMutation({
		mutationFn: async (reply: string) => {
			if (!user?.id) {
				throw new Error("User not authenticated");
			}

			// Call Edge Function to post reply to Google Business Profile API v4
			const { data, error } = await supabase.functions.invoke(
				"reply-google-review",
				{
					body: {
						reviewId: review.id,
						replyText: reply,
						locationId: review.location_id,
					},
				},
			);

			if (error) throw error;

			if (!data?.success) {
				throw new Error(data?.error || "Failed to post reply to Google");
			}

			// Update local database with replied_by info
			const { error: updateError } = await supabase
				.from("google_reviews")
				.update({
					replied_by: user.id,
				})
				.eq("id", review.id);

			if (updateError) {
				console.error("Error updating replied_by:", updateError);
			}

			return reply;
		},
		onSuccess: () => {
			toast.success("Reply posted successfully");
			queryClient.invalidateQueries({ queryKey: ["google-reviews"] });
			onClose();
			setReplyText("");
		},
		onError: (error) => {
			console.error("Failed to post reply:", error);
			toast.error("Failed to post reply. Please try again.");
		},
	});

	const handleSubmit = () => {
		if (!replyText.trim()) {
			toast.error("Please enter a reply");
			return;
		}

		if (replyText.length > MAX_REPLY_LENGTH) {
			toast.error(`Reply must be less than ${MAX_REPLY_LENGTH} characters`);
			return;
		}

		replyMutation.mutate(replyText);
	};

	const renderStars = (rating: number) => {
		return (
			<div className="flex items-center space-x-1">
				{Array.from({ length: 5 }).map((_, i) => (
					<Star
						key={i}
						className={`h-3 w-3 ${
							i < rating
								? "fill-yellow-400 text-yellow-400"
								: "fill-gray-200 text-gray-200"
						}`}
					/>
				))}
			</div>
		);
	};

	return (
		<Dialog open={isOpen} onOpenChange={onClose}>
			<DialogContent className="sm:max-w-[600px]">
				<DialogHeader>
					<DialogTitle>Reply to Review</DialogTitle>
					<DialogDescription>
						Respond to this customer review. Your reply will be visible publicly
						on Google Business Profile.
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-4">
					{/* Review Preview */}
					<div className="rounded-lg border bg-muted/50 p-4">
						<div className="mb-2 flex items-center justify-between">
							<div>
								<p className="font-semibold">
									{review.reviewer_name || "Anonymous"}
								</p>
								{renderStars(review.star_rating)}
							</div>
						</div>
						{review.comment && (
							<p className="text-sm text-muted-foreground">{review.comment}</p>
						)}
					</div>

					{/* Reply Textarea */}
					<div className="space-y-2">
						<label htmlFor="reply" className="text-sm font-medium">
							Your Reply
						</label>
						<Textarea
							id="reply"
							placeholder="Thank you for your review..."
							value={replyText}
							onChange={(e) => setReplyText(e.target.value)}
							rows={6}
							maxLength={MAX_REPLY_LENGTH}
							className="resize-none"
						/>
						<div className="flex justify-between text-xs text-muted-foreground">
							<span>Be professional and courteous in your response</span>
							<span>
								{replyText.length}/{MAX_REPLY_LENGTH}
							</span>
						</div>
					</div>
				</div>

				<DialogFooter>
					<Button
						variant="outline"
						onClick={onClose}
						disabled={replyMutation.isPending}
					>
						Cancel
					</Button>
					<Button
						onClick={handleSubmit}
						disabled={replyMutation.isPending || !replyText.trim()}
					>
						{replyMutation.isPending ? "Posting..." : "Post Reply"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
