import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { getSignedImageUrl } from "@/utils/storageUtils";

interface SignedImageProps {
	filePath: string;
	alt: string;
	className?: string;
	fallback?: React.ReactNode;
}

export const SignedImage = ({
	filePath,
	alt,
	className,
	fallback,
}: SignedImageProps) => {
	const [signedUrl, setSignedUrl] = useState<string>("");
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(false);

	useEffect(() => {
		const loadSignedUrl = async () => {
			if (!filePath) {
				setLoading(false);
				setError(true);
				return;
			}

			try {
				const url = await getSignedImageUrl(filePath);
				if (url) {
					setSignedUrl(url);
					setError(false);
				} else {
					setError(true);
				}
			} catch (err) {
				console.error("Failed to load signed URL:", err);
				setError(true);
			} finally {
				setLoading(false);
			}
		};

		loadSignedUrl();
	}, [filePath]);

	if (loading) {
		return (
			<div
				className={cn("flex items-center justify-center bg-muted", className)}
			>
				<Loader2 className="size-4 animate-spin" />
			</div>
		);
	}

	if (error || !signedUrl) {
		return (
			<div
				className={cn(
					"flex items-center justify-center bg-muted text-muted-foreground text-sm",
					className,
				)}
			>
				{fallback || "Failed to load image"}
			</div>
		);
	}

	return (
		<img
			src={signedUrl}
			alt={alt}
			className={className}
			onError={() => setError(true)}
		/>
	);
};
