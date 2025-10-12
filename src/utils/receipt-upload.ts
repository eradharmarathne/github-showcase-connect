import { supabase } from "@/integrations/supabase/client";

/**
 * Upload a receipt file to Supabase storage using Edge Function
 * @param file - The file to upload
 * @param expenseId - Optional expense ID to associate with the file
 * @returns Promise with upload result
 */
export async function uploadReceiptFile(
	file: File,
	expenseId?: string,
): Promise<{ url: string; path: string }> {
	try {
		// Get the session token
		const {
			data: { session },
			error: sessionError,
		} = await supabase.auth.getSession();

		if (sessionError || !session) {
			throw new Error("Authentication required");
		}

		// Create form data for the upload
		const formData = new FormData();
		formData.append("file", file);
		if (expenseId) {
			formData.append("expenseId", expenseId);
		}

		// Call the Edge Function
		const response = await fetch(
			`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/upload-receipt`,
			{
				method: "POST",
				headers: {
					Authorization: `Bearer ${session.access_token}`,
				},
				body: formData,
			},
		);

		if (!response.ok) {
			const error = await response.json();
			throw new Error(error.error || "Upload failed");
		}

		const result = await response.json();
		return {
			url: result.url,
			path: result.path,
		};
	} catch (error) {
		console.error("Upload error:", error);
		throw error;
	}
}

/**
 * Delete a receipt file from Supabase storage using Edge Function
 * @param fileUrl - The URL of the file to delete
 * @returns Promise with deletion result
 */
export async function deleteReceiptFile(fileUrl: string): Promise<void> {
	try {
		// Get the session token
		const {
			data: { session },
			error: sessionError,
		} = await supabase.auth.getSession();

		if (sessionError || !session) {
			throw new Error("Authentication required");
		}

		// Call the Edge Function
		const response = await fetch(
			`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/upload-receipt`,
			{
				method: "DELETE",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${session.access_token}`,
				},
				body: JSON.stringify({ fileUrl }),
			},
		);

		if (!response.ok) {
			const error = await response.json();
			throw new Error(error.error || "Deletion failed");
		}
	} catch (error) {
		console.error("Delete error:", error);
		throw error;
	}
}