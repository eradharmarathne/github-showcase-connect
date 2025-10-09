# Components Directory Structure

This directory contains all React components organized into logical folders for better maintainability and discoverability.

## Folder Structure

### 📁 **auth/**
Authentication-related components
- `auth-redirect.tsx` - Handles authentication redirects
- `otp-verification.tsx` - OTP verification component
- `phone-verification.tsx` - Phone number verification
- `user-credentials-dialog.tsx` - User credential management dialog

### 📁 **common/**
Reusable utility components used across the application
- `airbnb-date-picker.tsx` - Date picker component
- `booking-shortcuts.tsx` - Quick booking actions
- `currency-selector.tsx` - Currency selection component
- `dropdown-language.tsx` - Language selection dropdown
- `dropdown-profile.tsx` - User profile dropdown
- `expense-shortcuts.tsx` - Quick expense actions
- `fullscreen-toggle.tsx` - Fullscreen mode toggle
- `language-switcher.tsx` - Language switching component
- `pricing-display.tsx` - Price display component
- `profile-avatar-button.tsx` - User avatar button
- `theme-switcher.tsx` - Theme switching component

### 📁 **layout/**
Main layout and navigation components
- `layout.tsx` - Main application layout wrapper
- `nav-main.tsx` - Primary navigation component
- `nav-projects.tsx` - Project navigation
- `nav-user.tsx` - User navigation menu

### 📁 **media/**
File upload and media handling components
- `document-upload.tsx` - Document upload component
- `id-photo-upload.tsx` - ID photo upload
- `photo-attachment.tsx` - Photo attachment component
- `signature-capture.tsx` - Digital signature capture
- `signed-image.tsx` - Signed image display

### 📁 **modals/**
Dialog and modal components
- `new-reservation-dialog.tsx` - Create new reservation modal
- `reservation-edit-dialog.tsx` - Edit reservation modal
- `view-reservation-dialog.tsx` - View reservation details modal

### 📁 **routing/**
Route protection and redirection components
- `permission-route.tsx` - Permission-based route protection
- `protected-route.tsx` - Authentication-based route protection
- `smart-redirect.tsx` - Intelligent routing redirection

### 📁 **Domain-Specific Folders**
Feature-specific components organized by business domain:

- **accounts/** - Account and financial management components
- **calendar/** - Calendar and scheduling components
- **dashboard/** - Dashboard and analytics components
- **expense/** - Expense tracking components
- **master-files/** - Master data management components
- **onboarding/** - User onboarding flow components
- **reports/** - Reporting and analytics components
- **reservation/** - Booking and reservation components
- **settings/** - Application settings components
- **shared/** - Shared utility components
- **skeleton/** - Loading skeleton components
- **ui/** - Base UI components (shadcn/ui)
- **users/** - User management components

## Import Patterns

### Individual Component Import
```typescript
import { AuthRedirect } from "@/components/auth";
import { Layout } from "@/components/layout";
import { DocumentUpload } from "@/components/media";
```

### Multiple Components from Same Folder
```typescript
import { 
  AuthRedirect, 
  OTPVerification, 
  PhoneVerification 
} from "@/components/auth";
```

### Root Level Import (All Components)
```typescript
import { 
  AuthRedirect, 
  Layout, 
  DocumentUpload,
  NewReservationDialog 
} from "@/components";
```

## Guidelines

1. **Single Responsibility**: Each component should have a single, well-defined purpose
2. **Logical Grouping**: Components are grouped by functionality and business domain
3. **Consistent Exports**: All folders have index files for clean imports
4. **Type Safety**: TypeScript types are properly exported where needed
5. **Naming Convention**: Use PascalCase for component names and descriptive file names

## Adding New Components

When adding new components:

1. **Determine the appropriate folder** based on the component's purpose
2. **Create the component file** using PascalCase naming
3. **Export the component** in the folder's `index.ts` file
4. **Update this README** if adding a new category

## Folder Purpose Examples

- Put authentication flows in `auth/`
- Put reusable UI elements in `common/`
- Put upload/media components in `media/`
- Put popup dialogs in `modals/`
- Put route guards in `routing/`
- Put domain-specific components in their respective folders

This structure makes it easy to find components and understand the codebase organization at a glance.