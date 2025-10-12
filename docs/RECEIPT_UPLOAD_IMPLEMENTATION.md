# Receipt Upload Implementation

This document describes the complete receipt upload functionality that has been implemented for the CheckingCheckout application.

## Overview

The receipt upload system allows users to:
- Upload receipt images and PDF files to Supabase storage
- Automatically link receipts to expenses in the database
- View upload progress and status
- Delete receipts from both storage and database

## Components Implemented

### 1. Storage Infrastructure
- **Supabase Storage Bucket**: `receipts` bucket created with public read access
- **Database Column**: `receipt_attachments text[]` added to `expenses` table
- **RLS Policies**: Proper row-level security for tenant isolation

### 2. Upload Utility Functions (`src/lib/receipt-upload.ts`)

```typescript
// Upload a receipt file to Supabase storage
uploadReceiptFile(file: File, tenantId: string, expenseId?: string): Promise<UploadResult>

// Delete a receipt file from Supabase storage
deleteReceiptFile(fileUrl: string): Promise<boolean>

// Update an expense record with receipt URLs
updateExpenseReceipts(expenseId: string, receiptUrls: string[]): Promise<UpdateResult>
```

### 3. Enhanced ExpenseReceipt Component

The `ExpenseReceipt` component now supports:

#### New Props:
- `expenseId?: string` - For immediate database updates
- `autoUpload?: boolean` - Whether to auto-upload files (default: true)

#### Enhanced Features:
- **Auto-upload**: Files are uploaded immediately upon selection (when enabled)
- **Manual upload**: Manual upload button available when auto-upload is disabled
- **Upload status**: Visual indicators for uploading, uploaded, and pending states
- **Progress tracking**: Real-time upload status with user feedback
- **Error handling**: Comprehensive error handling with toast notifications
- **File validation**: Size and type validation before upload

## Usage Examples

### Basic Usage (Auto-upload enabled)
```tsx
function ExpenseForm() {
  const [receipts, setReceipts] = useState<ReceiptFile[]>([]);

  return (
    <ExpenseReceipt
      receipts={receipts}
      onReceiptsChange={setReceipts}
      maxFiles={5}
      maxFileSize={10}
      autoUpload={true}
    />
  );
}
```

### With Existing Expense (Immediate DB Updates)
```tsx
function EditExpenseForm({ expenseId }: { expenseId: string }) {
  const [receipts, setReceipts] = useState<ReceiptFile[]>([]);

  return (
    <ExpenseReceipt
      receipts={receipts}
      onReceiptsChange={setReceipts}
      expenseId={expenseId} // Enables immediate database updates
      autoUpload={true}
    />
  );
}
```

### Manual Upload Mode
```tsx
function ManualUploadExample() {
  const [receipts, setReceipts] = useState<ReceiptFile[]>([]);

  return (
    <ExpenseReceipt
      receipts={receipts}
      onReceiptsChange={setReceipts}
      autoUpload={false} // Disables auto-upload, shows manual upload buttons
    />
  );
}
```

## Data Flow

1. **File Selection**: User selects files via drag-drop or file picker
2. **Validation**: Files are validated for type (images/PDF) and size
3. **State Update**: Files are added to component state with upload status
4. **Auto-upload** (if enabled): Files are immediately uploaded to Supabase storage
5. **Database Update** (if expenseId provided): Expense record is updated with receipt URLs
6. **Status Feedback**: User sees upload progress and completion status

## File Storage Structure

Files are stored in Supabase storage with the following structure:
```
receipts/
  {tenant_id}/
    {expense_id}/
      {timestamp}_{original_filename}
```

## Database Schema

The `expenses` table now includes:
```sql
ALTER TABLE expenses ADD COLUMN receipt_attachments text[] DEFAULT ARRAY[]::text[];
```

## Integration Points

### With Expense Forms
The component can be integrated into expense forms by:
1. Adding the component to the form
2. Managing receipt state in the parent component
3. Saving receipt URLs when the expense is created/updated

### With Existing Expenses
For editing existing expenses:
1. Load existing receipt URLs from the database
2. Convert URLs to ReceiptFile objects for display
3. Enable immediate database updates via `expenseId` prop

## Technical Features

### File Validation
- **Supported formats**: Images (JPEG, PNG, GIF, WebP) and PDF files
- **Size limits**: Configurable per component (default: 10MB)
- **File count**: Configurable maximum files (default: 5)

### Upload Status Tracking
- **Uploading**: Shows spinner and "Uploading..." status
- **Uploaded**: Shows checkmark and "✓ Uploaded" status
- **Pending**: Shows "Pending" for manual upload mode
- **Failed**: Error handling with user feedback

### Multi-tenant Security
- All uploads are isolated by `tenant_id`
- RLS policies ensure users can only access their tenant's files
- File paths include tenant identification for additional security

## Error Handling

The system includes comprehensive error handling for:
- Network failures during upload
- File validation errors
- Database update failures
- Storage deletion failures
- Tenant authentication issues

All errors are displayed to users via toast notifications with appropriate messages.

## Performance Considerations

- **Parallel uploads**: Multiple files can be uploaded simultaneously
- **Progress tracking**: Real-time upload status prevents user confusion
- **Efficient storage**: Files are organized by tenant and expense for optimal access
- **Cleanup**: Failed uploads and removed files are properly cleaned up

## Future Enhancements

Potential improvements that could be added:
1. **Image preview**: Full-size image preview in modal
2. **OCR integration**: Extract text from receipt images
3. **Automatic categorization**: AI-powered expense categorization from receipts
4. **Compression**: Automatic image compression before upload
5. **Batch operations**: Bulk upload and management features