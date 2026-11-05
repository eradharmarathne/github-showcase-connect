import { SUPABASE_URL } from "@/integrations/supabase/config";
import { supabase } from "@/integrations/supabase/client";

export interface UploadResult {
	success: boolean;
	url?: string;
	error?: string;
}

/**
 * Upload a file to Supabase storage via Edge Function (handles authentication and RLS)
 */
export async function uploadReceiptFile(
	file: File,
	tenantId: string,
	expenseId?: string,
): Promise<UploadResult> {
	try {
		// Get the current session token
		const {
			data: { session },
		} = await supabase.auth.getSession();
		if (!session?.access_token) {
			return {
				success: false,
				error: "Authentication required",
			};
		}

		// Create FormData for the Edge Function
		const formData = new FormData();
		formData.append("file", file);
		if (expenseId) {
			formData.append("expenseId", expenseId);
		}

		// Call the Edge Function
		const supabaseUrl = SUPABASE_URL;
		const response = await fetch(`${supabaseUrl}/functions/v1/upload-receipt`, {
			method: "POST",
			headers: {
				Authorization: `Bearer ${session.access_token}`,
			},
			body: formData,
		});

		const result = await response.json();

		if (!response.ok) {
			return {
				success: false,
				error: result.error || `HTTP ${response.status}`,
			};
		}

		return {
			success: true,
			url: result.url,
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
 * Delete a file from Supabase storage via Edge Function
 */
export async function deleteReceiptFile(fileUrl: string): Promise<boolean> {
	try {
		// Get the current session token
		const {
			data: { session },
		} = await supabase.auth.getSession();
		if (!session?.access_token) {
			console.error("Authentication required for file deletion");
			return false;
		}

		// Call the Edge Function for deletion
		const supabaseUrl = SUPABASE_URL;
		const response = await fetch(`${supabaseUrl}/functions/v1/upload-receipt`, {
			method: "DELETE",
			headers: {
				Authorization: `Bearer ${session.access_token}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ fileUrl }),
		});

		const result = await response.json();

		if (!response.ok) {
			console.error("Delete error:", result.error);
			return false;
		}

		return result.success;
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
