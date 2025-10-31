# Print Template Customization Guide

## Overview
The CheckingCheckout system now supports fully customizable print templates, allowing hotels to personalize how their printed documents (reservations, invoices, receipts) appear.

## Features

### Header Customization
- **Business Logo**: Upload and display your hotel logo
- **Logo Position**: Choose between left, center, or right alignment
- **Header Text**: Add custom header text (e.g., "Tax Invoice", "Official Receipt")
- **Hotel Information**: Toggle display of hotel name, address, phone, email, and website

### Content Customization
- **QR Codes**: Add QR codes to documents containing:
  - Reservation number
  - Hotel website
  - Hotel email
- **Terms & Conditions**: Add custom terms and conditions text
- **Toggle Display**: Show/hide terms and conditions section

### Footer Customization
- **Footer Text**: Add custom footer message (e.g., "Thank you for your business!")
- **Signature Line**: Toggle signature line with customizable label
- **Auto Timestamp**: Automatic print date and time

### Styling Options
- **Primary Color**: Choose brand color for headers and accents
- **Font Family**: Select from 5 professional fonts:
  - Arial (default)
  - Times New Roman
  - Courier New
  - Georgia
  - Verdana
- **Font Size**: Small, Medium, or Large
- **Paper Size**: A4, Letter, or A5
- **Border**: Toggle document border
- **Custom CSS**: Advanced users can add custom CSS for additional styling

## Database Schema

### print_settings Table
```sql
- id: UUID (Primary Key)
- tenant_id: UUID (Foreign Key to tenants)
- show_logo: BOOLEAN (default: true)
- logo_position: TEXT ('left' | 'center' | 'right')
- header_text: TEXT
- show_hotel_info: BOOLEAN (default: true)
- show_qr_code: BOOLEAN (default: false)
- qr_code_content: TEXT (default: 'reservation_number')
- show_terms_and_conditions: BOOLEAN (default: true)
- terms_and_conditions: TEXT
- footer_text: TEXT
- show_signature_line: BOOLEAN (default: true)
- signature_label: TEXT (default: 'Authorized Signature')
- primary_color: TEXT (default: '#000000')
- font_family: TEXT (default: 'Arial, sans-serif')
- font_size: TEXT ('small' | 'medium' | 'large')
- paper_size: TEXT ('A4' | 'Letter' | 'A5')
- show_border: BOOLEAN (default: false)
- custom_css: TEXT
```

### Storage Bucket
**tenant-assets**: Public bucket for logo uploads
- Path structure: `logos/{tenant_id}/logo.{ext}`
- Automatic upsert on new uploads
- RLS policies ensure tenant isolation

## Usage

### For End Users

1. **Access Print Settings**
   - Navigate to Settings → Print Settings tab
   - Only users with `access_settings` permission can modify

2. **Upload Logo**
   - Click on file input in "Business Logo" section
   - Select image file (PNG, JPG, SVG recommended)
   - Click "Upload" button
   - Logo will appear on all printed documents

3. **Customize Sections**
   - Use tabs to navigate: Header, Content, Footer, Styling
   - Toggle switches to enable/disable features
   - Fill in text fields for custom messages
   - Select options from dropdowns

4. **Save Changes**
   - Click "Save Print Settings" button at bottom
   - Settings apply immediately to all new prints

### For Developers

#### Using the PrintTemplate Component

```tsx
import { PrintTemplate } from "@/components/common/print-template";

// In your printable component:
<PrintTemplate 
  qrCodeData="RES-2025-001" 
  documentType="Reservation Confirmation"
>
  {/* Your document content here */}
  <div>
    <h2>Guest Information</h2>
    {/* ... */}
  </div>
</PrintTemplate>
```

#### Using the usePrintSettings Hook

```tsx
import { usePrintSettings } from "@/hooks/use-print-settings";

function MyComponent() {
  const { printSettings, saveSettings, isLoading, isSubmitting } = usePrintSettings();
  
  // Access settings
  if (printSettings?.show_logo) {
    // Display logo
  }
  
  // Update settings
  await saveSettings({
    header_text: "Official Receipt",
    primary_color: "#0066CC"
  });
}
```

#### Existing Components Updated
- **ReservationPrintButton**: Uses PrintTemplate wrapper
- **PrintableReservation**: Wrapped with PrintTemplate
- Settings page: Added Print Settings tab

## Technical Implementation

### RLS Policies
- **View**: Users can view settings for their tenant
- **Insert**: Tenant owners and users with `access_settings` can create
- **Update**: Tenant owners and users with `access_settings` can modify
- **Delete**: Not implemented (settings are tenant-scoped)

### Storage Policies
- **Public Access**: Anyone can view uploaded assets
- **Upload**: Authenticated users can upload to their tenant folder
- **Update**: Tenant members can update their assets
- **Delete**: Only tenant owners can delete assets

### Migrations
- `create_print_settings_table.sql`: Creates table and policies
- `create_tenant_assets_storage_policies.sql`: Creates storage policies

### Type Safety
- TypeScript types auto-generated from Supabase schema
- Full type checking in components and hooks
- Proper null handling for optional fields

## Best Practices

1. **Logo Optimization**
   - Use transparent PNG or SVG for best results
   - Recommended size: 200-400px width
   - File size: < 500KB for faster loading

2. **Color Selection**
   - Use brand colors for consistency
   - Ensure good contrast for readability
   - Test prints before finalizing

3. **Terms & Conditions**
   - Keep concise and clear
   - Use plain language
   - Update regularly based on legal requirements

4. **Custom CSS**
   - Test thoroughly before deployment
   - Use `@media print` for print-specific styles
   - Avoid breaking page layouts

## Example Customizations

### Minimal Template
```
Show Logo: ✓
Header Text: (empty)
Show Hotel Info: ✓
Show QR Code: ✗
Show Terms: ✗
Show Signature: ✗
Font: Arial, Medium
Paper: A4
Border: ✗
```

### Formal Invoice Template
```
Show Logo: ✓
Logo Position: Left
Header Text: "TAX INVOICE"
Show Hotel Info: ✓
Show QR Code: ✓ (Reservation Number)
Show Terms: ✓
Footer Text: "Thank you for your business"
Show Signature: ✓ (Authorized Signature)
Font: Times New Roman, Medium
Paper: A4
Border: ✓
Primary Color: #003366
```

### Compact Receipt Template
```
Show Logo: ✓
Logo Position: Center
Header Text: "Official Receipt"
Show Hotel Info: ✗
Show QR Code: ✗
Show Terms: ✗
Footer Text: "Have a great day!"
Show Signature: ✗
Font: Arial, Small
Paper: A5
Border: ✗
Primary Color: #000000
```

## Troubleshooting

### Logo Not Showing
- Check file size (must be < 10MB)
- Verify upload success message
- Clear browser cache
- Check browser console for errors

### Settings Not Saving
- Verify user has `access_settings` permission
- Check tenant ownership
- Look for error toast messages
- Verify database connection

### Print Quality Issues
- Adjust font size (try Medium or Large)
- Use appropriate paper size for printer
- Check printer settings (color vs B&W)
- Test with different browsers

### Custom CSS Not Applied
- Validate CSS syntax
- Use `!important` sparingly
- Test in print preview mode
- Check browser compatibility

## Future Enhancements

Potential additions:
- Multiple template presets
- Template sharing between tenants
- Print template preview
- Multilingual support
- More QR code content options
- Barcode generation
- Watermark support
- Per-location customization
