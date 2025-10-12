import { supabase } from "@/integrations/supabase/client";

export interface UploadResult {
	success: boolean;
	url?: string;
	error?: string;
}

/**
 * Upload a file to Supabase storage and return the public URL
 */
export async function uploadReceiptFile(
	file: File,
	tenantId: string,
	expenseId?: string,
): Promise<UploadResult> {
	try {
		// Create a unique filename
		const fileExt = file.name.split(".").pop();
		const timestamp = Date.now();
		const randomId = Math.random().toString(36).substring(2);
		const fileName = `${tenantId}/${timestamp}-${randomId}.${fileExt}`;

		// Upload to the receipts bucket
		const { data, error } = await supabase.storage
			.from("receipts")
			.upload(fileName, file, {
				cacheControl: "3600",
				upsert: false,
			});

		if (error) {
			console.error("Upload error:", error);
			return {
				success: false,
				error: error.message,
			};
		}

		// Get the public URL
		const {
			data: { publicUrl },
		} = supabase.storage.from("receipts").getPublicUrl(data.path);

		return {
			success: true,
			url: publicUrl,
		};
	} catch (error) {
		console.error("Upload exception:", error);
		return {
			success: false,
			error: error instanceof Error ? error.message : "Upload failed",
		};
	}
}

/**
 * Delete a file from Supabase storage
 */
export async function deleteReceiptFile(filePath: string): Promise<boolean> {
	try {
		const { error } = await supabase.storage.from("receipts").remove([filePath]);

		if (error) {
			console.error("Delete error:", error);
			return false;
		}

		return true;
	} catch (error) {
		console.error("Delete exception:", error);
		return false;
	}
}

/**
 * Update expense record with receipt attachments
 */
export async function updateExpenseReceipts(
	expenseId: string,
	receiptUrls: string[],
): Promise<{ success: boolean; error?: string }> {
	try {
		const { error } = await supabase
			.from("expenses")
			.update({ receipt_attachments: receiptUrls })
			.eq("id", expenseId);

		if (error) {
			console.error("Database update error:", error);
			return {
				success: false,
				error: error.message,
			};
		}

		return { success: true };
	} catch (error) {
		console.error("Database update exception:", error);
		return {
			success: false,
			error: error instanceof Error ? error.message : "Database update failed",
		};
	}
}