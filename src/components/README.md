# Components Directory

This directory contains reusable React components organized by feature area.

## Directory Structure

### common/
Shared components used across multiple features
- **export-button.tsx**: Reusable export button for data tables

### finance/
Finance-related components
- **storage-ledger-tab.tsx**: Storage ledger view component

### layout/
Layout and navigation components
- **dashboard-layout.tsx**: Main dashboard layout wrapper
- **main-nav.tsx**: Main navigation sidebar component

### operations/
Operations-related components
- **incomplete-transactions-alert.tsx**: Alert for incomplete transactions
- **inventory-tabs.tsx**: Tabbed interface for inventory views

### reports/
Reporting components
- **report-generator.tsx**: Dynamic report generation interface

### ui/
Base UI components and primitives
- **breadcrumb.tsx**: Navigation breadcrumb component
- **confirm-dialog.tsx**: Confirmation dialog modal
- **empty-state.tsx**: Empty state placeholder component
- **immutable-ledger-notice.tsx**: Notice for immutable ledger entries
- **page-header.tsx**: Consistent page header component
- **quick-start-guide.tsx**: Onboarding quick start guide
- **tooltip.tsx**: Tooltip component for hover information

### warehouse/
Warehouse visualization components
- **warehouse-map.tsx**: Interactive warehouse location map
- **warehouse-map-simple.tsx**: Simplified warehouse map view

## Core Components

### providers.tsx
- **Purpose**: Client-side providers wrapper
- **Includes**: SessionProvider, Toaster
- **Usage**: Wraps the entire application in root layout

### error-boundary.tsx
- **Purpose**: Error boundary for graceful error handling
- **Usage**: Wraps components that might throw errors

## Component Guidelines

1. **Naming**: Use PascalCase for component files
2. **Organization**: Group by feature area, not by type
3. **Reusability**: Place in `common/` or `ui/` if used across features
4. **Props**: Use TypeScript interfaces for type safety
5. **Styling**: Use Tailwind CSS classes, avoid inline styles

## Import Patterns

```typescript
// UI components
import { Button } from '@/components/ui/button'

// Feature components
import { InventoryTabs } from '@/components/operations/inventory-tabs'

// Layout components
import { MainNav } from '@/components/layout/main-nav'
```