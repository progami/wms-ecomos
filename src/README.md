# Source Code

This directory contains all the application source code for the Warehouse Management System.

## Architecture Overview

The application follows a transaction-based ledger architecture, mirroring the proven Excel system design:

1. **Transactions as Source of Truth**: All inventory movements are recorded as immutable transactions
2. **Calculated Balances**: Current inventory is calculated by summing transactions
3. **Weekly Billing Cycles**: Monday stock-takes for 3PL storage billing
4. **Multi-tenant Support**: Role-based access for Admin, Finance, and Warehouse users

## Structure

- **app/** - Next.js App Router pages and API routes
- **components/** - Reusable React components
- **lib/** - Core business logic and utilities
- **hooks/** - Custom React hooks
- **types/** - TypeScript type definitions
- **utils/** - Helper functions and utilities

## Key Areas

### App Directory
- `/admin` - Admin-only pages:
  - Dashboard with system metrics
  - User management
  - Settings (SKUs, warehouses, rates)
  - Inventory overview
  - Calculations and reports
- `/warehouse` - Warehouse staff pages:
  - Dashboard with real-time inventory
  - Inventory management (view current stock)
  - Receive goods (create RECEIVE transactions)
  - Ship goods (create SHIP transactions)
  - Operational reports
- `/finance` - Finance team pages:
  - Financial dashboard
  - Invoice management and upload
  - Rate management
  - Reconciliation tools
  - Financial reports
- `/api` - REST API endpoints:
  - Transaction management
  - Inventory calculations
  - Report generation
  - Data export

### Components
- `/common` - Shared components:
  - `export-button.tsx` - Standardized data export
- `/layout` - Layout components:
  - `dashboard-layout.tsx` - Main app layout with navigation
  - `main-nav.tsx` - Role-based navigation menu
- `/ui` - Base UI components:
  - `page-header.tsx` - Consistent page headers
  - `empty-state.tsx` - Empty data states
  - `confirm-dialog.tsx` - Confirmation dialogs
  - `breadcrumb.tsx` - Navigation breadcrumbs
  - `tooltip.tsx` - Help tooltips
  - `quick-start-guide.tsx` - User onboarding
- `/reports` - Report generation:
  - `report-generator.tsx` - Dynamic report builder
- `/forms` - Form components for data entry
- `providers.tsx` - App-wide context providers
- `error-boundary.tsx` - Error handling wrapper

### Libraries
- `/lib/auth.ts` - Authentication logic with role-based access control
- `/lib/auth-simple.ts` - Simplified auth helpers
- `/lib/calculations/` - Core business logic:
  - `inventory-balance.ts` - Calculate current inventory from transactions
  - `storage-ledger.ts` - Weekly Monday stock-take calculations
- `/lib/prisma.ts` - Database client singleton
- `/lib/db.ts` - Database utilities
- `/lib/utils.ts` - Common utility functions