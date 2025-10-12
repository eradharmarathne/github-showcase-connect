import { useState } from "react";
import { ExpenseReceipt } from "@/components/expense/expense-receipt";

interface ReceiptFile {
	file: File;
	preview: string;
	id: string;
	url?: string;
	uploading?: boolean;
	uploaded?: boolean;
	uploadProgress?: number;
}

export function TestReceiptUpload() {
	const [receipts, setReceipts] = useState<ReceiptFile[]>([]);

	return (
		<div className="p-6 max-w-4xl mx-auto">
			<h1 className="text-2xl font-bold mb-6">Receipt Upload Test</h1>
			<ExpenseReceipt
				receipts={receipts}
				onReceiptsChange={setReceipts}
				maxFiles={5}
				maxFileSize={10}
				autoUpload={true}
			/>
			
			{/* Debug info */}
			<div className="mt-6 p-4 bg-muted rounded-lg">
				<h2 className="text-lg font-semibold mb-2">Debug Info</h2>
				<pre className="text-sm overflow-auto">
					{JSON.stringify(receipts.map(r => ({
						name: r.file.name,
						size: r.file.size,
						uploaded: r.uploaded,
						uploading: r.uploading,
						progress: r.uploadProgress,
						url: r.url ? "✓ Has URL" : "No URL"
					})), null, 2)}
				</pre>
			</div>
		</div>
	);
}