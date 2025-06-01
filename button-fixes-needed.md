# Button Fixes Required

## Pages with Non-Functional Buttons

### 1. SKU Management Page (`/admin/settings/skus/page.tsx`)
**Issues:**
- "Add SKU" button (line 29-32) - No onClick handler
- Edit buttons in table (line 95-97) - No onClick handler

**Fix:** Convert to client component or add proper navigation

### 2. Warehouse Settings Page (`/admin/settings/warehouses/page.tsx`)
**Status:** Already fixed - uses Link component for "Add Warehouse" button

### 3. User Management Page (`/admin/users/page.tsx`)
**Status:** Already fixed - uses Link component for "Add User" button

### 4. Admin Dashboard Page (`/admin/dashboard/page.tsx`)
**Status:** Already has onClick handlers for all buttons

### 5. Settings Page (`/admin/settings/page.tsx`)
**Status:** Already has onClick handlers for all buttons

## Common Patterns to Fix

1. **Server Components with Buttons**: Convert to client components when buttons need interactivity
2. **Missing onClick Handlers**: Add proper event handlers or convert to Link components
3. **Form Submissions**: Ensure forms have proper onSubmit handlers

## Recommended Fixes

### For SKU Management Page:
1. Convert to client component
2. Add onClick handlers for:
   - Add SKU button → Navigate to `/admin/settings/skus/new`
   - Edit buttons → Navigate to `/admin/settings/skus/[id]/edit`

### General Pattern:
- For navigation: Use `<Link>` component
- For actions: Convert to client component with proper handlers
- For forms: Ensure proper form submission handling