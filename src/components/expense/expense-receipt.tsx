import { FileText, Upload, X } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

interface ReceiptFile {
	file: File;
	preview: string;
	id: string;
}

interface ExpenseReceiptProps {
	receipts: ReceiptFile[];
	onReceiptsChange: (receipts: ReceiptFile[]) => void;
	maxFiles?: number;
	maxFileSize?: number; // in MB
}

export function ExpenseReceipt({
	receipts,
	onReceiptsChange,
	maxFiles = 5,
	maxFileSize = 10,
}: ExpenseReceiptProps) {
	const { t } = useTranslation();
	const { toast } = useToast();
	const [isDragging, setIsDragging] = useState(false);

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
			};

			newReceipts.push(receiptFile);
		}

		if (newReceipts.length > 0) {
			onReceiptsChange([...receipts, ...newReceipts]);
		}
	};

	const handleRemoveReceipt = (id: string) => {
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
										<p className="text-xs text-muted-foreground">
											{(receipt.file.size / 1024 / 1024).toFixed(2)} MB
										</p>
									</div>
									<Button
										type="button"
										variant="ghost"
										size="sm"
										onClick={() => handleRemoveReceipt(receipt.id)}
									>
										<X className="w-4 h-4" />
									</Button>
								</div>
							))}
						</div>
					</div>
				)}
			</CardContent>
		</Card>
	);
}
