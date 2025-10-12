import { FileText, Upload, X } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useProfile } from "@/hooks/use-profile";
import { uploadReceiptFile, deleteReceiptFile, updateExpenseReceipts } from "@/lib/receipt-upload";

interface ReceiptFile {
	file: File;
	preview: string;
	id: string;
	url?: string; // Supabase storage URL after upload
	uploading?: boolean;
	uploaded?: boolean;
}

interface ExpenseReceiptProps {
	receipts: ReceiptFile[];
	onReceiptsChange: (receipts: ReceiptFile[]) => void;
	maxFiles?: number;
	maxFileSize?: number; // in MB
	expenseId?: string; // Existing expense ID for immediate database updates
	autoUpload?: boolean; // Whether to auto-upload files on selection
}

export function ExpenseReceipt({
	receipts,
	onReceiptsChange,
	maxFiles = 5,
	maxFileSize = 10,
	expenseId,
	autoUpload = true,
}: ExpenseReceiptProps) {
	const { t } = useTranslation();
	const { toast } = useToast();
	const { profile } = useProfile();
	const [isDragging, setIsDragging] = useState(false);

	const uploadFile = async (receiptFile: ReceiptFile) => {
		if (!profile?.tenant_id) {
			toast({
				title: "Error",
				description: "Unable to upload: tenant information not available",
				variant: "destructive",
			});
			return;
		}

		// Mark file as uploading
		const updatedReceipts = receipts.map(r => 
			r.id === receiptFile.id 
				? { ...r, uploading: true }
				: r
		);
		onReceiptsChange(updatedReceipts);

		try {
			const result = await uploadReceiptFile(
				receiptFile.file,
				profile.tenant_id,
				expenseId
			);

			if (result.success && result.url) {
				// Mark file as uploaded and store URL
				const uploadedReceipts = receipts.map(r => 
					r.id === receiptFile.id 
						? { 
							...r, 
							uploading: false, 
							uploaded: true, 
							url: result.url 
						}
						: r
				);
				onReceiptsChange(uploadedReceipts);

				// If we have an expense ID, update the database immediately
				if (expenseId) {
					await updateExpenseWithReceipts(uploadedReceipts);
				}

				toast({
					title: "Success",
					description: "Receipt uploaded successfully",
				});
			} else {
				// Mark upload as failed
				const failedReceipts = receipts.map(r => 
					r.id === receiptFile.id 
						? { ...r, uploading: false }
						: r
				);
				onReceiptsChange(failedReceipts);

				toast({
					title: "Upload failed",
					description: result.error || "Failed to upload receipt",
					variant: "destructive",
				});
			}
		} catch (error) {
			// Mark upload as failed
			const failedReceipts = receipts.map(r => 
				r.id === receiptFile.id 
					? { ...r, uploading: false }
					: r
			);
			onReceiptsChange(failedReceipts);

			toast({
				title: "Upload error",
				description: "An unexpected error occurred during upload",
				variant: "destructive",
			});
		}
	};

	const updateExpenseWithReceipts = async (currentReceipts: ReceiptFile[]) => {
		if (!expenseId) return;

		const uploadedUrls = currentReceipts
			.filter(r => r.uploaded && r.url)
			.map(r => r.url!);

		const result = await updateExpenseReceipts(expenseId, uploadedUrls);
		
		if (!result.success) {
			toast({
				title: "Database error",
				description: result.error || "Failed to update expense record",
				variant: "destructive",
			});
		}
	};

	const handleFileSelect = (files: FileList | null) => {
		if (!files) return;

		const newReceipts: ReceiptFile[] = [];
		const maxSizeInBytes = maxFileSize * 1024 * 1024;

		for (let i = 0; i < files.length; i++) {
			const file = files[i];

			// Check file size
			if (file.size > maxSizeInBytes) {
				toast({
					title: "File too large",
					description: `${file.name} is larger than ${maxFileSize}MB`,
					variant: "destructive",
				});
				continue;
			}

			// Check file type
			if (!file.type.startsWith("image/") && file.type !== "application/pdf") {
				toast({
					title: "Invalid file type",
					description: `${file.name} is not a supported file type. Please use images or PDF files.`,
					variant: "destructive",
				});
				continue;
			}

			// Check total file count
			if (receipts.length + newReceipts.length >= maxFiles) {
				toast({
					title: "Too many files",
					description: `Maximum ${maxFiles} files allowed`,
					variant: "destructive",
				});
				break;
			}

			const receiptFile: ReceiptFile = {
				file,
				preview: file.type.startsWith("image/")
					? URL.createObjectURL(file)
					: "",
				id: `${file.name}-${Date.now()}-${Math.random()}`,
				uploading: false,
				uploaded: false,
			};

			newReceipts.push(receiptFile);
		}

		if (newReceipts.length > 0) {
			const updatedReceipts = [...receipts, ...newReceipts];
			onReceiptsChange(updatedReceipts);

			// Auto-upload if enabled
			if (autoUpload) {
				newReceipts.forEach(receipt => {
					uploadFile(receipt);
				});
			}
		}
	};

	const handleRemoveReceipt = async (id: string) => {
		const receiptToRemove = receipts.find(r => r.id === id);
		if (receiptToRemove?.url) {
			// Delete from Supabase storage if it was uploaded
			try {
				await deleteReceiptFile(receiptToRemove.url);
			} catch (error) {
				console.error('Failed to delete file from storage:', error);
			}
		}

		const updatedReceipts = receipts.filter((receipt) => {
			if (receipt.id === id) {
				// Clean up object URL
				if (receipt.preview) {
					URL.revokeObjectURL(receipt.preview);
				}
				return false;
			}
			return true;
		});
		onReceiptsChange(updatedReceipts);

		// Update database if expenseId exists
		if (expenseId) {
			await updateExpenseWithReceipts(updatedReceipts);
		}
	};

	const handleDragOver = (e: React.DragEvent) => {
		e.preventDefault();
		setIsDragging(true);
	};

	const handleDragLeave = (e: React.DragEvent) => {
		e.preventDefault();
		setIsDragging(false);
	};

	const handleDrop = (e: React.DragEvent) => {
		e.preventDefault();
		setIsDragging(false);
		handleFileSelect(e.dataTransfer.files);
	};

	return (
		<Card>
			<CardHeader>
				<CardTitle className="text-sm font-medium">
					Receipt Attachments
				</CardTitle>
			</CardHeader>
			<CardContent className="space-y-4">
				{/* File Upload Area */}
				<div
					className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
						isDragging
							? "border-primary bg-primary/10"
							: "border-muted-foreground/25 hover:border-muted-foreground/50"
					}`}
					onDragOver={handleDragOver}
					onDragLeave={handleDragLeave}
					onDrop={handleDrop}
				>
					<Upload className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
					<div className="space-y-2">
						<p className="text-sm text-muted-foreground">
							Drag & drop receipts here, or click to select
						</p>
						<p className="text-xs text-muted-foreground">
							Supports images and PDF files up to {maxFileSize}MB
						</p>
					</div>
					<Label htmlFor="receipt-upload" className="cursor-pointer">
						<Button
							type="button"
							variant="outline"
							size="sm"
							className="mt-2"
							asChild
						>
							<span>Choose Files</span>
						</Button>
					</Label>
					<input
						id="receipt-upload"
						type="file"
						multiple
						accept="image/*,.pdf"
						onChange={(e) => handleFileSelect(e.target.files)}
						className="hidden"
					/>
				</div>

				{/* File List */}
				{receipts.length > 0 && (
					<div className="space-y-2">
						<p className="text-sm font-medium">
							Attached Files ({receipts.length}/{maxFiles})
						</p>
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
							{receipts.map((receipt) => (
								<div
									key={receipt.id}
									className="flex items-center space-x-2 p-2 border rounded-lg"
								>
									{receipt.preview ? (
										<img
											src={receipt.preview}
											alt={receipt.file.name}
											className="w-10 h-10 object-cover rounded"
										/>
									) : (
										<FileText className="w-10 h-10 text-muted-foreground" />
									)}
									<div className="flex-1 min-w-0">
										<p className="text-sm font-medium truncate">
											{receipt.file.name}
										</p>
										<div className="flex items-center space-x-2">
											<p className="text-xs text-muted-foreground">
												{(receipt.file.size / 1024 / 1024).toFixed(2)} MB
											</p>
											{receipt.uploading && (
												<span className="text-xs text-blue-600">Uploading...</span>
											)}
											{receipt.uploaded && (
												<span className="text-xs text-green-600">✓ Uploaded</span>
											)}
											{!receipt.uploading && !receipt.uploaded && autoUpload && (
												<span className="text-xs text-yellow-600">Pending</span>
											)}
										</div>
									</div>
									<div className="flex items-center space-x-2">
										<Button
											type="button"
											variant="ghost"
											size="sm"
											onClick={() => handleRemoveReceipt(receipt.id)}
											disabled={receipt.uploading}
										>
											<X className="w-4 h-4" />
										</Button>
										{!autoUpload && !receipt.uploaded && !receipt.uploading && (
											<Button
												type="button"
												variant="outline"
												size="sm"
												onClick={() => uploadFile(receipt)}
											>
												Upload
											</Button>
										)}
									</div>
								</div>
							))}
						</div>
					</div>
				)}
			</CardContent>
		</Card>
	);
}
