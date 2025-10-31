# Print Settings Live Preview Feature

## Overview
The Print Settings page now includes a **Live Preview** tab that allows users to see exactly how their customizations will appear on printed documents without needing to create actual reservations or navigate to other pages.

## Features

### 1. Real-Time Preview
- All customization changes reflect immediately in the preview
- No need to save settings to see changes
- Switch between tabs to make changes and view them instantly

### 2. Sample Reservation Data
The preview displays a realistic sample reservation with:
- Guest Information (name, email, phone, nationality)
- Reservation Details (room, check-in/out dates, nights)
- Payment Summary (total, advance, paid, balance)
- Additional notes and footer

### 3. Print Testing
- "Print Preview" button allows testing actual print output
- Uses browser's native print dialog
- Verifies all customizations work in real print scenarios

## Components

### PrintPreviewSample Component
**Location:** `src/components/settings/print-preview-sample.tsx`

**Purpose:** Renders a sample reservation document with all print customizations applied

**Features:**
- Uses actual PrintTemplate wrapper (same as real reservations)
- Sample data mimics real reservation structure
- All fields populated with realistic values
- QR code generation with sample reservation number

**Props:**
```typescript
interface PrintPreviewSampleProps {
  printSettings?: any; // Optional, uses current settings from context if not provided
}
```

### Updated PrintSettingsTab
**Location:** `src/components/settings/print-settings-tab.tsx`

**Changes:**
1. Added 5th tab: "Preview"
2. Imported PrintPreviewSample component
3. Added react-to-print integration
4. Added ref for print functionality
5. Real-time form data passed to preview

## User Workflow

### Testing Customizations
1. Navigate to **Settings → Print Settings**
2. Make changes in any tab:
   - **Header:** Upload logo, set header text, toggle logo visibility
   - **Content:** Configure hotel info, QR codes
   - **Footer:** Add terms, conditions, signature line
   - **Styling:** Change colors, fonts, paper size
3. Click **Preview** tab
4. See all changes reflected immediately
5. Click **Print Preview** to test actual print output
6. Click **Save Print Settings** when satisfied

### Logo Upload Workflow
1. Go to **Header** tab
2. Upload logo
3. Switch to **Preview** tab
4. Logo appears immediately (thanks to refreshTenant() fix)
5. Test different logo positions (left/center/right)
6. Toggle "Show Logo" on/off to see effect

## Technical Implementation

### State Management
```typescript
const [formData, setFormData] = useState({
  show_logo: true,
  logo_position: "left",
  header_text: "",
  // ... other settings
});

// Preview receives formData as prop
<PrintPreviewSample printSettings={formData} />
```

### Print Integration
```typescript
const printPreviewRef = useRef<HTMLDivElement>(null);

const handlePrintPreview = useReactToPrint({
  contentRef: printPreviewRef,
});

// In Preview tab
<div ref={printPreviewRef}>
  <PrintPreviewSample printSettings={formData} />
</div>
```

### Real-Time Updates
Changes in `formData` trigger React re-renders, which automatically update the preview since it receives `formData` as a prop. No manual refresh needed!

## Sample Data Structure

```typescript
const sampleReservation = {
  reservation_number: "RES-2024-001",
  guest_name: "John Doe",
  guest_email: "john.doe@example.com",
  guest_phone: "+1 234 567 8900",
  guest_nationality: "United States",
  adults: 2,
  children: 1,
  check_in_date: "2024-11-15",
  check_out_date: "2024-11-18",
  nights: 3,
  room_rate: 150,
  total_amount: 450,
  advance_amount: 150,
  paid_amount: 150,
  balance_amount: 300,
  currency: "USD",
  status: "confirmed",
  special_requests: "Late check-in requested",
  room: {
    room_number: "101",
    room_type: "Deluxe Room",
  },
  location: {
    name: "Sample Hotel",
  },
  created_at: new Date().toISOString(),
};
```

## Benefits

### For Users
✅ **Instant Feedback:** See changes immediately without saving
✅ **No Test Data Needed:** No need to create sample reservations
✅ **Easy Testing:** Print button tests actual output
✅ **Confidence:** Know exactly how prints will look before going live
✅ **Faster Workflow:** Iterate on design without switching pages

### For Developers
✅ **Reusable Component:** PrintPreviewSample can be used elsewhere
✅ **Consistent Rendering:** Uses same PrintTemplate as real documents
✅ **Type-Safe:** TypeScript ensures data structure matches real reservations
✅ **Maintainable:** Changes to PrintTemplate automatically apply to preview

## Testing Scenarios

### Test 1: Logo Customization
1. Upload logo in Header tab
2. Go to Preview tab - logo should appear
3. Change logo position (left/center/right)
4. Preview updates immediately
5. Toggle "Show Logo" off - logo disappears in preview
6. Toggle back on - logo reappears

### Test 2: Color Customization
1. Go to Styling tab
2. Change primary color (e.g., to blue #0000FF)
3. Go to Preview tab
4. Headers should use new color
5. Try different colors and see updates

### Test 3: Header Text
1. Go to Header tab
2. Add custom header text: "Welcome to Our Hotel"
3. Go to Preview tab
4. Text should appear above reservation content
5. Clear text - preview updates

### Test 4: QR Code
1. Go to Content tab
2. Toggle "Show QR Code" on
3. Select QR code content type
4. Go to Preview tab
5. QR code should appear in document
6. Toggle off - QR code disappears

### Test 5: Print Output
1. Make various customizations
2. Go to Preview tab
3. Click "Print Preview" button
4. Browser print dialog opens
5. Preview shows all customizations
6. Print or save as PDF to verify

## Edge Cases Handled

✅ **No Logo:** Preview works even without uploaded logo
✅ **Partial Settings:** Uses defaults for missing settings
✅ **Long Text:** Terms/conditions wrap properly
✅ **Different Paper Sizes:** A4, Letter, A5 all preview correctly
✅ **Custom CSS:** Applied to preview if provided

## Future Enhancements

🔮 **Multiple Templates:** Preview different document types (invoice, receipt)
🔮 **Language Toggle:** Preview in different languages (i18n)
🔮 **Side-by-Side:** Compare old vs new settings
🔮 **Export Preview:** Download preview as PDF without printing
🔮 **Mobile Preview:** Show how it looks on mobile devices

## Conclusion

The Live Preview feature significantly improves the user experience of customizing print templates. Users can now:
- See changes instantly
- Test print output without leaving settings
- Confidently customize their documents
- Save time by not creating test reservations

This feature demonstrates the power of React's reactive state management and component reusability.
