# Role Simplification Summary

## Overview
The system has been simplified from 5 roles to just 2 roles:

### Previous Roles:
- `system_admin`
- `finance_admin`
- `warehouse_staff`
- `manager`
- `viewer`

### New Roles:
1. **`admin`** - Full system access, can manage users and security settings
2. **`staff`** - Access to all operational features (warehouse, finance, reports, analytics)

## Changes Made

### 1. Database Schema
- Updated `prisma/schema.prisma` to only include `admin` and `staff` in the UserRole enum
- Created migration script to update existing users in the database

### 2. Navigation
- **Admin users** see all pages including admin-only features
- **Staff users** see:
  - Dashboard
  - Warehouse Operations (Dashboard, Inventory, Receive, Ship)
  - Finance Functions (Dashboard, Invoices, Reconciliation)
  - Analytics & Reports
  - Configuration (Cost Rates, SKUs)

### 3. Middleware
- Admin routes (`/admin/*`) - only accessible by admin role
- Finance routes (`/finance/*`) - accessible by both admin and staff
- Warehouse routes (`/warehouse/*`) - accessible by both admin and staff

### 4. New Staff Users Created
1. **Hashar (Finance Manager)**
   - Email: hashar@warehouse.com
   - Role: staff
   - Password: staff123

2. **Umair (Operations Manager)**
   - Email: umair@warehouse.com
   - Role: staff
   - Password: staff123
   - Assigned to: FMC Warehouse

### 5. Updated Files
- `/prisma/schema.prisma` - Updated UserRole enum
- `/prisma/migrations/update_user_roles.sql` - Migration to update existing roles
- `/prisma/seed.ts` - Updated to create new staff users
- `/src/components/layout/main-nav.tsx` - Updated navigation structure
- `/src/middleware.ts` - Simplified permission checks
- `/src/app/admin/users/page.tsx` - Updated to show new roles
- `/src/app/api/settings/rates/route.ts` - Updated role checks
- `/src/app/api/settings/rates/[id]/route.ts` - Updated role checks
- `/src/app/finance/dashboard/page.tsx` - Updated role checks

## Migration Instructions

1. Run the migration script:
   ```bash
   ./run-role-migration.sh
   ```

2. Or manually run these commands:
   ```bash
   # Generate Prisma client
   npx prisma generate
   
   # Run SQL migration
   npx prisma db execute --file ./prisma/migrations/update_user_roles.sql
   
   # Seed new users
   npx prisma db seed
   ```

## Testing
After migration, test the following:

1. **Admin login** (admin@warehouse.com / admin123)
   - Should see all pages including admin settings
   - Can manage users

2. **Staff login** (hashar@warehouse.com or umair@warehouse.com / staff123)
   - Should see operational pages but not admin settings
   - Can access warehouse, finance, and reports

3. **Navigation**
   - Verify correct menu items appear for each role
   - Test access to restricted pages

## Benefits
1. **Simplified permissions** - Easier to manage with just 2 roles
2. **Clear separation** - Admin for system management, Staff for operations
3. **Flexibility** - Staff can handle both finance and warehouse operations
4. **Better titles** - Users now have descriptive titles (Finance Manager, Operations Manager)