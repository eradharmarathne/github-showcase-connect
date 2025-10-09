import React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/auth-context";

interface ProfileAvatarButtonProps {
	className?: string;
}

const ProfileAvatarButton = React.forwardRef<
	HTMLButtonElement,
	ProfileAvatarButtonProps
>(({ className, ...props }, ref) => {
	const { profile, user } = useAuth();

	// Get user data
	const userName = profile?.name || user?.email?.split("@")[0] || "User";

	// Use avatar_url from profile database or fallback to user metadata
	const userAvatar =
		profile?.avatar_url || user?.user_metadata?.avatar_url || "";

	// Generate initials for fallback
	const getInitials = (name: string): string => {
		if (!name || name.trim() === "") return "U";

		const words = name.trim().split(/\s+/);
		if (words.length === 1) {
			return words[0].substring(0, 2).toUpperCase();
		}
		return words
			.slice(0, 2)
			.map((word) => word[0])
			.join("")
			.toUpperCase();
	};

	const userInitials = getInitials(userName);

	return (
		<Button
			ref={ref}
			variant="ghost"
			size="icon"
			className={`size-9.5 ${className || ""}`}
			aria-label={`Profile menu for ${userName}`}
			{...props}
		>
			<Avatar className="size-9.5 rounded-md">
				<AvatarImage
					src={userAvatar}
					alt={`${userName}'s avatar`}
					className="object-cover"
				/>
				<AvatarFallback className="rounded-md bg-primary/10 text-primary font-medium text-xs sm:text-sm">
					{userInitials}
				</AvatarFallback>
			</Avatar>
		</Button>
	);
});

ProfileAvatarButton.displayName = "ProfileAvatarButton";

export default ProfileAvatarButton;
