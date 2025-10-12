import { supabase } from "@/integrations/supabase/client";

/**
 * Upload a receipt file to Supabase storage using Edge Function
 * @param file - The file to upload
 * @param expenseId - Optional expense ID to associate with the file
 * @param onProgress - Optional progress callback (progress percentage 0-100)
 * @returns Promise with upload result
 */
export async function uploadReceiptFile(
	file: File,
	expenseId?: string,
	onProgress?: (progress: number) => void,
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

		// Create XMLHttpRequest for progress tracking
		return new Promise((resolve, reject) => {
			const xhr = new XMLHttpRequest();

			// Track upload progress
			xhr.upload.addEventListener("progress", (event) => {
				if (event.lengthComputable && onProgress) {
					const progress = Math.round((event.loaded / event.total) * 100);
					onProgress(progress);
				}
			});

			// Handle completion
			xhr.addEventListener("load", () => {
				if (xhr.status >= 200 && xhr.status < 300) {
					try {
						const result = JSON.parse(xhr.responseText);
						resolve({
							url: result.url,
							path: result.path,
						});
					} catch (error) {
						reject(new Error("Invalid response format"));
					}
				} else {
					try {
						const error = JSON.parse(xhr.responseText);
						reject(new Error(error.error || "Upload failed"));
					} catch {
						reject(new Error(`Upload failed with status: ${xhr.status}`));
					}
				}
			});

			// Handle errors
			xhr.addEventListener("error", () => {
				reject(new Error("Network error during upload"));
			});

			// Handle timeout
			xhr.addEventListener("timeout", () => {
				reject(new Error("Upload timeout"));
			});

			// Configure and send request
			xhr.open(
				"POST",
				`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/upload-receipt`,
			);
			xhr.setRequestHeader("Authorization", `Bearer ${session.access_token}`);
			xhr.timeout = 60000; // 60 seconds timeout
			xhr.send(formData);
		});
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
