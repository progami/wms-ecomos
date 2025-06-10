# App Directory (Next.js App Router)

This directory contains all pages, API routes, and layouts using Next.js 14's App Router.

## Core Files

### layout.tsx
- **Purpose**: Root layout component that wraps all pages
- **Features**: Providers setup, global styles, fonts, metadata

### page.tsx
- **Purpose**: Home page that redirects based on user authentication
- **Route**: `/`

### globals.css
- **Purpose**: Global CSS styles and Tailwind CSS imports

### providers.tsx
- **Purpose**: Client-side providers wrapper (NextAuth, Toaster, etc.)

## Route Groups

### (auth)/
Authentication-related pages
- `login/` - Login page

### admin/
Admin-only pages requiring admin role
- `dashboard/` - Admin dashboard with system stats
- `import-excel/` - Excel data import interface
- `inventory/` - Inventory management
- `invoices/` - Invoice management
- `reports/` - Advanced reporting
- `settings/` - System settings (database, notifications, rates, security, SKUs, warehouses)
- `users/` - User management
- `amazon/` - Amazon integration endpoints

### analytics/
Analytics and reporting pages
- Main analytics dashboard

### config/
Configuration pages for system setup
- `batch-attributes/` - Batch attribute configuration
- `invoice-templates/` - Invoice template management
- `locations/` - Warehouse location management
- `products/` - Product/SKU management
- `rates/` - Cost rate configuration
- `warehouse-configs/` - Warehouse configuration

### dashboard/
Main user dashboard (redirects based on role)

### finance/
Financial management pages
- `cost-ledger/` - Cost ledger tracking
- `dashboard/` - Finance dashboard
- `invoices/` - Invoice creation and management
- `reconciliation/` - Invoice reconciliation
- `reports/` - Financial reports
- `storage-ledger/` - Storage cost tracking

### integrations/
Third-party integration pages
- `amazon/` - Amazon FBA integration

### operations/
Warehouse operations pages
- `import-attributes/` - Import batch attributes
- `inventory/` - Inventory ledger view
- `pallet-variance/` - Pallet variance tracking
- `receive/` - Receive goods interface
- `ship/` - Ship goods interface
- `shipment-planning/` - Shipment planning tool
- `transactions/` - Transaction details

### reports/
General reporting interface

## API Routes

### api/
All API endpoints organized by feature:
- `admin/` - Admin-only endpoints
- `amazon/` - Amazon integration APIs
- `audit-logs/` - Audit trail endpoints
- `auth/` - NextAuth authentication
- `dashboard/` - Dashboard data endpoints
- `export/` - Data export endpoints
- `finance/` - Financial data APIs
- `health/` - Health check endpoint
- `inventory/` - Inventory management APIs
- `invoices/` - Invoice management APIs
- `operations/` - Operations APIs
- `rates/` - Rate management APIs
- `reconciliation/` - Reconciliation APIs
- `reports/` - Reporting APIs
- `settings/` - Settings management APIs
- `skus/` - SKU management APIs
- `storage-ledger/` - Storage ledger APIs
- `test-db/` - Database testing endpoint
- `transactions/` - Transaction APIs
- `warehouse-configs/` - Warehouse config APIs
- `warehouses/` - Warehouse management APIs

## Naming Conventions

- **Pages**: `page.tsx` for page components
- **Layouts**: `layout.tsx` for layout components
- **API Routes**: `route.ts` for API endpoints
- **Dynamic Routes**: `[param]/` for dynamic segments
- **Route Groups**: `(name)/` for logical grouping without affecting URLs

## Authentication

Pages are protected using middleware based on user roles:
- Public: `/auth/login`
- Authenticated: Most pages
- Admin only: `/admin/*` routes
- Staff: Operations and basic features