import { Camera, FileImage, Loader2, Upload, X, ZoomIn } from "lucide-react";
import { useRef, useState } from "react";
import { SignedImage } from "@/components/SignedImage";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface IDPhoto {
	filePath: string; // Store the storage file path instead of URL
	name: string;
	uploadedAt: Date;
	type: "passport" | "national_id" | "drivers_license" | "other";
}

interface IDPhotoUploadProps {
	photos: IDPhoto[];
	onPhotosChange: (photos: IDPhoto[]) => void;
	title?: string;
	maxPhotos?: number;
	className?: string;
}

const ID_TYPES = [
	{ value: "passport", label: "Passport" },
	{ value: "national_id", label: "National ID" },
	{ value: "drivers_license", label: "Driver's License" },
	{ value: "other", label: "Other ID" },
] as const;

export const IDPhotoUpload = ({
	photos,
	onPhotosChange,
	title = "ID Documents",
	maxPhotos = 3,
	className,
}: IDPhotoUploadProps) => {
	const { toast } = useToast();
	const fileInputRef = useRef<HTMLInputElement>(null);
	const [isOpen, setIsOpen] = useState(false);
	const [uploadProgress, setUploadProgress] = useState<{
		[key: string]: number;
	}>({});
	const [isUploading, setIsUploading] = useState(false);
	const [previewPhoto, setPreviewPhoto] = useState<IDPhoto | null>(null);
	const [selectedIDType, setSelectedIDType] =
		useState<IDPhoto["type"]>("passport");

	const handleFileUpload = async (
		event: React.ChangeEvent<HTMLInputElement>,
	) => {
		const selectedFiles = event.target.files;
		if (!selectedFiles) return;

		const fileArray = Array.from(selectedFiles).filter((file) =>
			file.type.startsWith("image/"),
		);

		if (fileArray.length === 0) {
			toast({
				title: "Invalid file type",
				description: "Please select image files only",
				variant: "destructive",
			});
			return;
		}

		if (photos.length + fileArray.length > maxPhotos) {
			toast({
				title: "Maximum photos reached",
				description: `You can only upload up to ${maxPhotos} ID photos`,
				variant: "destructive",
			});
			return;
		}

		setIsUploading(true);

		try {
			const uploadPromises = fileArray.map(async (file, index) => {
				const fileId = `${file.name}-${Date.now()}-${index}`;
				setUploadProgress((prev) => ({ ...prev, [fileId]: 0 }));

				try {
					// Create file path
					const fileExt = file.name.split(".").pop();
					const fileName = `id-${selectedIDType}-${Math.random()}.${fileExt}`;
					const filePath = `reservation-documents/id-photos/${fileName}`;

					// Upload file with simulated progress
					const progressInterval = setInterval(() => {
						setUploadProgress((prev) => {
							const current = prev[fileId] || 0;
							const next = Math.min(current + Math.random() * 15, 90);
							return { ...prev, [fileId]: Math.round(next) };
						});
					}, 200);

					const { data, error } = await supabase.storage
						.from("reservation-documents")
						.upload(filePath, file);

					// Clear progress interval and set to 100%
					clearInterval(progressInterval);
					setUploadProgress((prev) => ({ ...prev, [fileId]: 100 }));

					if (error) throw error;

					// Store the file path instead of public URL
					const uploadedPhoto: IDPhoto = {
						filePath: filePath,
						name: file.name,
						type: selectedIDType,
						uploadedAt: new Date(),
					};

					// Remove progress tracking for this file
					setUploadProgress((prev) => {
						const updated = { ...prev };
						delete updated[fileId];
						return updated;
					});

					return uploadedPhoto;
				} catch (error) {
					console.error("Upload error:", error);
					setUploadProgress((prev) => {
						const updated = { ...prev };
						delete updated[fileId];
						return updated;
					});
					toast({
						title: "Upload failed",
						description: `Failed to upload ${file.name}. Please try again.`,
						variant: "destructive",
					});
					return null;
				}
			});

			const uploadResults = await Promise.all(uploadPromises);
			const successfulUploads = uploadResults.filter(
				(result) => result !== null,
			) as IDPhoto[];

			if (successfulUploads.length > 0) {
				onPhotosChange([...photos, ...successfulUploads]);
				toast({
					title: "Upload successful",
					description: `${successfulUploads.length} ID photo(s) uploaded successfully`,
				});
			}
		} finally {
			setIsUploading(false);
			setUploadProgress({});
			// Reset file input
			if (fileInputRef.current) {
				fileInputRef.current.value = "";
			}
		}
	};

	const handleCameraCapture = async () => {
		try {
			if (
				"mediaDevices" in navigator &&
				"getUserMedia" in navigator.mediaDevices
			) {
				await navigator.mediaDevices.getUserMedia({ video: true });
			}
		} catch (error) {
			console.log("Camera permission not granted, using file input fallback");
		}

		// Trigger file input with camera capture
		if (fileInputRef.current) {
			fileInputRef.current.setAttribute("capture", "environment");
			fileInputRef.current.click();
		}
	};

	const handleFileSelect = () => {
		if (fileInputRef.current) {
			fileInputRef.current.removeAttribute("capture");
			fileInputRef.current.click();
		}
	};

	const removePhoto = (index: number) => {
		const updatedPhotos = photos.filter((_, i) => i !== index);
		onPhotosChange(updatedPhotos);
		toast({
			title: "Photo removed",
			description: "ID photo has been removed successfully",
		});
	};

	const openPreview = (photo: IDPhoto) => {
		setPreviewPhoto(photo);
	};

	const getIDTypeLabel = (type: IDPhoto["type"]) => {
		return ID_TYPES.find((t) => t.value === type)?.label || type;
	};

	const getIDTypeColor = (type: IDPhoto["type"]) => {
		const colors = {
			passport: "bg-blue-100 text-blue-800 border-blue-200",
			national_id: "bg-green-100 text-green-800 border-green-200",
			drivers_license: "bg-orange-100 text-orange-800 border-orange-200",
			other: "bg-gray-100 text-gray-800 border-gray-200",
		};
		return colors[type] || colors.other;
	};

	return (
		<>
			<Card className={cn("w-full", className)}>
				<CardHeader className="pb-4">
					<CardTitle className="text-base md:text-lg lg:text-xl flex items-center gap-2">
						<FileImage className="size-5" />
						{title}
					</CardTitle>
					<p className="text-sm text-muted-foreground">
						Upload clear photos of government-issued ID documents
					</p>
				</CardHeader>
				<CardContent className="space-y-4">
					{/* ID Type Selection */}
					<div className="space-y-2">
						<label className="text-sm font-medium">Document Type</label>
						<div className="grid grid-cols-2 gap-2">
							{ID_TYPES.map((type) => (
								<button
									key={type.value}
									type="button"
									onClick={() => setSelectedIDType(type.value)}
									className={cn(
										"p-2 text-xs font-medium border rounded-md transition-colors",
										selectedIDType === type.value
											? "bg-primary text-primary-foreground border-primary"
											: "bg-background hover:bg-muted border-muted",
									)}
								>
									{type.label}
								</button>
							))}
						</div>
					</div>

					{/* Upload Controls */}
					<div className="flex flex-wrap gap-2">
						<Dialog open={isOpen} onOpenChange={setIsOpen}>
							<DialogTrigger asChild>
								<Button
									type="button"
									variant="outline"
									size="sm"
									disabled={photos.length >= maxPhotos || isUploading}
								>
									<Camera className="size-4 mr-2" />
									Take Photo
								</Button>
							</DialogTrigger>
							<DialogContent className="sm:max-w-md">
								<DialogHeader>
									<DialogTitle>Add ID Photo</DialogTitle>
								</DialogHeader>
								<div className="grid grid-cols-2 gap-4 py-4">
									<Button
										onClick={() => {
											handleCameraCapture();
											setIsOpen(false);
										}}
										className="h-20 flex-col"
										variant="outline"
										disabled={isUploading}
									>
										<Camera className="size-6 mb-2" />
										Take Photo
									</Button>
									<Button
										onClick={() => {
											handleFileSelect();
											setIsOpen(false);
										}}
										className="h-20 flex-col"
										variant="outline"
										disabled={isUploading}
									>
										<Upload className="size-6 mb-2" />
										From Gallery
									</Button>
								</div>
							</DialogContent>
						</Dialog>

						<Button
							type="button"
							variant="outline"
							size="sm"
							onClick={handleFileSelect}
							disabled={photos.length >= maxPhotos || isUploading}
						>
							<Upload className="size-4 mr-2" />
							Upload Photo
						</Button>

						<input
							ref={fileInputRef}
							type="file"
							accept="image/*"
							multiple
							onChange={handleFileUpload}
							className="hidden"
						/>
					</div>

					{/* Upload Progress */}
					{Object.keys(uploadProgress).length > 0 && (
						<div className="space-y-2">
							{Object.entries(uploadProgress).map(([fileId, progress]) => (
								<div key={fileId} className="space-y-1">
									<div className="flex items-center gap-2 text-sm">
										<Loader2 className="size-4 animate-spin" />
										<span className="flex-1 truncate">
											Uploading {fileId.split("-")[0]}...
										</span>
										<span className="text-muted-foreground">{progress}%</span>
									</div>
									<Progress value={progress} className="h-2" />
								</div>
							))}
						</div>
					)}

					{/* Photo Grid */}
					{photos.length > 0 && (
						<div className="space-y-3">
							<h4 className="text-sm md:text-base lg:text-lg font-medium text-muted-foreground">
								Uploaded Photos ({photos.length}/{maxPhotos})
							</h4>
							<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
								{photos.map((photo, index) => (
									<div
										key={index}
										className="relative group border rounded-lg overflow-hidden bg-muted/20"
									>
										<div className="aspect-3/2 relative">
											<SignedImage
												filePath={photo.filePath}
												alt={`${getIDTypeLabel(photo.type)} ${index + 1}`}
												className="w-full h-full object-cover"
												fallback={
													<div className="w-full h-full flex items-center justify-center bg-muted text-muted-foreground text-sm">
														Failed to load image
													</div>
												}
											/>
											<div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors">
												<div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
													<Button
														type="button"
														variant="secondary"
														size="icon"
														className="size-7"
														onClick={() => openPreview(photo)}
													>
														<ZoomIn className="size-3" />
													</Button>
													<Button
														type="button"
														variant="destructive"
														size="icon"
														className="size-7"
														onClick={() => removePhoto(index)}
													>
														<X className="size-3" />
													</Button>
												</div>
											</div>
										</div>
										<div className="p-2">
											<div className="flex items-center justify-between">
												<span
													className={cn(
														"px-2 py-1 text-xs font-medium rounded border",
														getIDTypeColor(photo.type),
													)}
												>
													{getIDTypeLabel(photo.type)}
												</span>
												<span className="text-xs text-muted-foreground">
													{photo.uploadedAt.toLocaleDateString()}
												</span>
											</div>
										</div>
									</div>
								))}
							</div>
						</div>
					)}

					{/* Empty State */}
					{photos.length === 0 && !isUploading && (
						<div className="text-center py-8 text-muted-foreground border-2 border-dashed border-muted rounded-lg">
							<FileImage className="h-12 w-12 mx-auto mb-2 opacity-50" />
							<p className="text-sm mb-2">No ID photos uploaded</p>
							<p className="text-xs">
								Upload up to {maxPhotos} clear photos of your government-issued
								ID
							</p>
						</div>
					)}
				</CardContent>
			</Card>

			{/* Preview Dialog */}
			{previewPhoto && (
				<Dialog
					open={!!previewPhoto}
					onOpenChange={() => setPreviewPhoto(null)}
				>
					<DialogContent className="max-w-4xl max-h-[90vh]">
						<DialogHeader>
							<DialogTitle className="flex items-center gap-2">
								{getIDTypeLabel(previewPhoto.type)}
								<span
									className={cn(
										"px-2 py-1 text-xs font-medium rounded border",
										getIDTypeColor(previewPhoto.type),
									)}
								>
									{getIDTypeLabel(previewPhoto.type)}
								</span>
							</DialogTitle>
						</DialogHeader>
						<div className="flex justify-center">
							<SignedImage
								filePath={previewPhoto.filePath}
								alt={getIDTypeLabel(previewPhoto.type)}
								className="max-w-full max-h-[70vh] object-contain rounded-lg border"
								fallback={
									<div className="p-8 text-center text-muted-foreground">
										Failed to load image
									</div>
								}
							/>
						</div>
					</DialogContent>
				</Dialog>
			)}
		</>
	);
};
