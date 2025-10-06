import {
	Camera,
	FileImage,
	FileText,
	Image as ImageIcon,
	Loader2,
	Upload,
	X,
	ZoomIn,
} from "lucide-react";
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

interface UploadedFile {
	filePath: string; // Store the storage file path instead of URL
	name: string;
	type: string;
	size: number;
	uploadedAt: Date;
}

interface DocumentUploadProps {
	files: UploadedFile[];
	onFilesChange: (files: UploadedFile[]) => void;
	title?: string;
	maxFiles?: number;
	allowedTypes?: string[];
	className?: string;
	description?: string;
}

export const DocumentUpload = ({
	files,
	onFilesChange,
	title = "Upload Documents",
	maxFiles = 5,
	allowedTypes = ["image/*", "application/pdf", ".doc", ".docx"],
	className,
	description,
}: DocumentUploadProps) => {
	const { toast } = useToast();
	const fileInputRef = useRef<HTMLInputElement>(null);
	const [isOpen, setIsOpen] = useState(false);
	const [uploadProgress, setUploadProgress] = useState<{
		[key: string]: number;
	}>({});
	const [isUploading, setIsUploading] = useState(false);
	const [previewFile, setPreviewFile] = useState<UploadedFile | null>(null);

	const formatFileSize = (bytes: number) => {
		if (bytes === 0) return "0 Bytes";
		const k = 1024;
		const sizes = ["Bytes", "KB", "MB", "GB"];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
	};

	const getFileIcon = (type: string) => {
		if (type.startsWith("image/")) {
			return <FileImage className="size-4" />;
		}
		return <FileText className="size-4" />;
	};

	const isImage = (type: string) => type.startsWith("image/");

	const handleFileUpload = async (
		event: React.ChangeEvent<HTMLInputElement>,
	) => {
		const selectedFiles = event.target.files;
		if (!selectedFiles) return;

		const fileArray = Array.from(selectedFiles);

		if (files.length + fileArray.length > maxFiles) {
			toast({
				title: "Maximum files reached",
				description: `You can only upload up to ${maxFiles} files`,
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
					const fileName = `${Math.random()}.${fileExt}`;
					const filePath = `reservation-documents/${fileName}`;

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
					const uploadedFile: UploadedFile = {
						filePath: filePath,
						name: file.name,
						type: file.type,
						size: file.size,
						uploadedAt: new Date(),
					};

					// Remove progress tracking for this file
					setUploadProgress((prev) => {
						const updated = { ...prev };
						delete updated[fileId];
						return updated;
					});

					return uploadedFile;
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
			) as UploadedFile[];

			if (successfulUploads.length > 0) {
				onFilesChange([...files, ...successfulUploads]);
				toast({
					title: "Upload successful",
					description: `${successfulUploads.length} file(s) uploaded successfully`,
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

	const removeFile = (index: number) => {
		const updatedFiles = files.filter((_, i) => i !== index);
		onFilesChange(updatedFiles);
		toast({
			title: "File removed",
			description: "File has been removed successfully",
		});
	};

	const openPreview = (file: UploadedFile) => {
		setPreviewFile(file);
	};

	return (
		<>
			<Card className={cn("w-full", className)}>
				<CardHeader className="pb-4">
					<CardTitle className="text-base md:text-lg lg:text-xl flex items-center gap-2">
						<Upload className="size-5" />
						{title}
					</CardTitle>
					{description && (
						<p className="text-sm text-muted-foreground">{description}</p>
					)}
				</CardHeader>
				<CardContent className="space-y-4">
					{/* Upload Controls */}
					<div className="flex flex-wrap gap-2">
						<Dialog open={isOpen} onOpenChange={setIsOpen}>
							<DialogTrigger asChild>
								<Button
									type="button"
									variant="outline"
									size="sm"
									disabled={files.length >= maxFiles || isUploading}
								>
									<Camera className="size-4 mr-2" />
									Take Photo
								</Button>
							</DialogTrigger>
							<DialogContent className="sm:max-w-md">
								<DialogHeader>
									<DialogTitle>Add Document</DialogTitle>
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
										From Files
									</Button>
								</div>
							</DialogContent>
						</Dialog>

						<Button
							type="button"
							variant="outline"
							size="sm"
							onClick={handleFileSelect}
							disabled={files.length >= maxFiles || isUploading}
						>
							<Upload className="size-4 mr-2" />
							Upload Files
						</Button>

						<input
							ref={fileInputRef}
							type="file"
							accept={allowedTypes.join(",")}
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

					{/* File List */}
					{files.length > 0 && (
						<div className="space-y-2">
							<h4 className="text-sm md:text-base lg:text-lg font-medium text-muted-foreground">
								Uploaded Files ({files.length}/{maxFiles})
							</h4>
							<div className="space-y-2">
								{files.map((file, index) => (
									<div
										key={index}
										className="flex items-center gap-3 p-3 rounded-lg border bg-muted/20 group hover:bg-muted/40 transition-colors"
									>
										{getFileIcon(file.type)}
										<div className="flex-1 min-w-0">
											<p className="text-sm font-medium truncate">
												{file.name}
											</p>
											<p className="text-xs text-muted-foreground">
												{formatFileSize(file.size)} •{" "}
												{file.uploadedAt.toLocaleDateString()}
											</p>
										</div>
										<div className="flex items-center gap-1">
											{isImage(file.type) && (
												<Button
													type="button"
													variant="ghost"
													size="icon"
													className="size-8 opacity-0 group-hover:opacity-100 transition-opacity"
													onClick={() => openPreview(file)}
												>
													<ZoomIn className="size-4" />
												</Button>
											)}
											<Button
												type="button"
												variant="ghost"
												size="icon"
												className="size-8 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
												onClick={() => removeFile(index)}
											>
												<X className="size-4" />
											</Button>
										</div>
									</div>
								))}
							</div>
						</div>
					)}

					{/* Empty State */}
					{files.length === 0 && !isUploading && (
						<div className="text-center py-8 text-muted-foreground border-2 border-dashed border-muted rounded-lg">
							<ImageIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
							<p className="text-sm mb-2">No documents uploaded</p>
							<p className="text-xs">
								Upload up to {maxFiles} files (images, PDFs, or documents)
							</p>
						</div>
					)}
				</CardContent>
			</Card>

			{/* Preview Dialog */}
			{previewFile && isImage(previewFile.type) && (
				<Dialog open={!!previewFile} onOpenChange={() => setPreviewFile(null)}>
					<DialogContent className="max-w-4xl max-h-[90vh]">
						<DialogHeader>
							<DialogTitle>{previewFile.name}</DialogTitle>
						</DialogHeader>
						<div className="flex justify-center">
							<SignedImage
								filePath={previewFile.filePath}
								alt={previewFile.name}
								className="max-w-full max-h-[70vh] object-contain rounded-lg"
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
