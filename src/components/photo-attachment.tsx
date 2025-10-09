import { Camera, Image as ImageIcon, Upload, X } from "lucide-react";
import { useRef, useState } from "react";
import { SignedImage } from "@/components/signed-image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface PhotoAttachmentProps {
	photos: string[]; // Array of file paths in storage
	onPhotosChange: (photos: string[]) => void;
	title?: string;
	maxPhotos?: number;
}

export const PhotoAttachment = ({
	photos,
	onPhotosChange,
	title = "Attach Photos",
	maxPhotos = 5,
}: PhotoAttachmentProps) => {
	const { toast } = useToast();
	const fileInputRef = useRef<HTMLInputElement>(null);
	const [isOpen, setIsOpen] = useState(false);

	const handleFileUpload = async (
		event: React.ChangeEvent<HTMLInputElement>,
	) => {
		const files = event.target.files;
		if (!files) return;

		const uploadPromises = Array.from(files).map(async (file) => {
			if (photos.length >= maxPhotos) {
				toast({
					title: "Maximum photos reached",
					description: `You can only attach up to ${maxPhotos} photos`,
					variant: "destructive",
				});
				return null;
			}

			if (file.type.startsWith("image/")) {
				try {
					// Upload to Supabase Storage
					const fileExt = file.name.split(".").pop();
					const fileName = `${Math.random()}.${fileExt}`;
					const filePath = `reservation-photos/${fileName}`;

					const { data, error } = await supabase.storage
						.from("reservation-documents")
						.upload(filePath, file);

					if (error) throw error;

					// Return the file path instead of public URL
					return filePath;
				} catch (error) {
					console.error("Upload error:", error);
					toast({
						title: "Upload failed",
						description: "Failed to upload photo. Please try again.",
						variant: "destructive",
					});
					return null;
				}
			}
			return null;
		});

		const uploadedUrls = await Promise.all(uploadPromises);
		const validUrls = uploadedUrls.filter((url) => url !== null) as string[];

		if (validUrls.length > 0) {
			onPhotosChange([...photos, ...validUrls]);
		}
	};

	const handleCameraCapture = async () => {
		try {
			// Request camera permission explicitly for better user experience
			if (
				"mediaDevices" in navigator &&
				"getUserMedia" in navigator.mediaDevices
			) {
				await navigator.mediaDevices.getUserMedia({ video: true });
			}
		} catch (error) {
			console.log("Camera permission not granted, using file input fallback");
		}

		// For mobile devices, this will open the camera
		// For desktop, it will open file picker with camera preference
		const input = document.createElement("input");
		input.type = "file";
		input.accept = "image/*";
		input.capture = "environment"; // Use rear camera on mobile
		input.multiple = false;

		input.onchange = async (e) => {
			const file = (e.target as HTMLInputElement).files?.[0];
			if (file) {
				if (photos.length >= maxPhotos) {
					toast({
						title: "Maximum photos reached",
						description: `You can only attach up to ${maxPhotos} photos`,
						variant: "destructive",
					});
					return;
				}

				try {
					// Upload to Supabase Storage
					const fileExt = file.name.split(".").pop();
					const fileName = `${Math.random()}.${fileExt}`;
					const filePath = `reservation-photos/${fileName}`;

					const { data, error } = await supabase.storage
						.from("reservation-documents")
						.upload(filePath, file);

					if (error) throw error;

					// Store the file path instead of public URL
					onPhotosChange([...photos, filePath]);
				} catch (error) {
					console.error("Upload error:", error);
					toast({
						title: "Upload failed",
						description: "Failed to upload photo. Please try again.",
						variant: "destructive",
					});
				}
			}
		};

		input.click();
		setIsOpen(false);
	};

	const handleFileSelect = () => {
		fileInputRef.current?.click();
		setIsOpen(false);
	};

	const removePhoto = async (index: number) => {
		const filePath = photos[index];

		// Delete file from storage using the file path
		try {
			await supabase.storage.from("reservation-documents").remove([filePath]);
		} catch (error) {
			console.error("Error deleting file:", error);
		}

		const newPhotos = photos.filter((_, i) => i !== index);
		onPhotosChange(newPhotos);
	};

	return (
		<Card>
			<CardHeader>
				<CardTitle className="text-base md:text-lg lg:text-xl flex items-center gap-2">
					<ImageIcon className="size-5" />
					{title}
					{photos.length > 0 && (
						<span className="text-sm text-muted-foreground">
							({photos.length}/{maxPhotos})
						</span>
					)}
				</CardTitle>
			</CardHeader>
			<CardContent className="space-y-4">
				{/* Action Buttons */}
				<div className="flex flex-wrap gap-2">
					<Dialog open={isOpen} onOpenChange={setIsOpen}>
						<DialogTrigger asChild>
							<Button
								type="button"
								variant="outline"
								size="sm"
								disabled={photos.length >= maxPhotos}
							>
								<Camera className="size-4 mr-2" />
								Add Photo
							</Button>
						</DialogTrigger>
						<DialogContent className="sm:max-w-md">
							<DialogHeader>
								<DialogTitle>Add Photo</DialogTitle>
							</DialogHeader>
							<div className="grid grid-cols-2 gap-4 py-4">
								<Button
									onClick={handleCameraCapture}
									className="h-20 flex-col"
									variant="outline"
								>
									<Camera className="size-6 mb-2" />
									Take Photo
								</Button>
								<Button
									onClick={handleFileSelect}
									className="h-20 flex-col"
									variant="outline"
								>
									<Upload className="size-6 mb-2" />
									From Gallery
								</Button>
							</div>
						</DialogContent>
					</Dialog>

					<input
						ref={fileInputRef}
						type="file"
						accept="image/*"
						multiple
						onChange={handleFileUpload}
						className="hidden"
					/>
				</div>

				{/* Photo Grid */}
				{photos.length > 0 && (
					<div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
						{photos.map((photoPath, index) => (
							<div key={index} className="relative group">
								<SignedImage
									filePath={photoPath}
									alt={`Attachment ${index + 1}`}
									className="w-full h-24 object-cover rounded-lg border"
									fallback={
										<div className="w-full h-24 flex items-center justify-center bg-muted text-muted-foreground text-xs rounded-lg border">
											Failed to load
										</div>
									}
								/>
								<Button
									type="button"
									variant="destructive"
									size="icon"
									className="absolute -top-2 -right-2 size-6 opacity-0 group-hover:opacity-100 transition-opacity"
									onClick={() => removePhoto(index)}
								>
									<X className="size-4" />
								</Button>
							</div>
						))}
					</div>
				)}

				{photos.length === 0 && (
					<div className="text-center py-8 text-muted-foreground">
						<ImageIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
						<p className="text-sm">No photos attached</p>
					</div>
				)}
			</CardContent>
		</Card>
	);
};
