# Agent Boundaries and File Ownership

This document clearly defines which files, directories, and database tables each agent owns and can modify.

## Agent 1: Operations Agent

### Primary Ownership
```
/src/modules/operations/
/src/app/operations/
  ├── inventory/
  ├── receive/
  └── ship/
```

### API Routes
```
/src/app/api/inventory/
/src/app/api/skus/
/src/app/api/warehouse-configs/
/src/app/api/transactions/
```

### Shared Files (Primary Responsibility)
```
/src/lib/calculations/inventory-balance.ts
/src/lib/calculations/storage-ledger.ts
/src/components/warehouse/
```

### Database Tables (Prisma Schema)
- `Warehouse`
- `Product` 
- `ProductSKU`
- `ProductBatch`
- `InventoryTransaction`
- `InventoryBalance`
- `InventoryLedger`
- `WarehouseConfig`
- `PalletSnapshot`

### Key Responsibilities
- Inventory tracking and movements
- Receiving goods processes
- Shipping workflows
- Storage calculations
- Pallet management
- Batch tracking

---

## Agent 2: Finance Agent

### Primary Ownership
```
/src/modules/finance/
/src/app/finance/
  ├── dashboard/
  ├── invoices/
  ├── reconciliation/
  └── reports/
```

### API Routes
```
/src/app/api/finance/
/src/app/api/invoices/
/src/app/api/reconciliation/
/src/app/api/storage-ledger/
```

### Shared Files (Primary Responsibility)  
```
/src/lib/calculations/storage-ledger.ts (billing aspects)
```

### Database Tables (Prisma Schema)
- `Invoice`
- `InvoiceItem`
- `InvoiceAdjustment`
- `Rate`
- `BillingPeriod`
- `StorageLedger`
- `Reconciliation`
- `ReconciliationItem`

### Key Responsibilities
- Invoice generation and management
- Billing calculations
- Rate application
- Reconciliation processes
- Financial reporting
- Cost tracking

---

## Agent 3: Configuration Agent

### Primary Ownership
```
/src/modules/configuration/
/src/app/config/
  ├── products/
  ├── locations/
  ├── rates/
  └── warehouse-configs/
/src/app/admin/settings/
  ├── general/
  ├── rates/
  ├── skus/
  ├── warehouses/
  ├── security/
  └── notifications/
/src/app/admin/users/
```

### API Routes
```
/src/app/api/settings/
/src/app/api/admin/settings/
/src/app/api/rates/
/src/app/api/auth/ (user authentication)
```

### Database Tables (Prisma Schema)
- `Settings`
- `NotificationSettings`
- Rate configuration aspects
- Warehouse configuration aspects
- Product configuration aspects

### Key Responsibilities
- Product catalog setup
- Location management
- Rate configuration
- Warehouse settings
- System parameters
- General settings
- User management and authentication
- Security settings
- Notification preferences

---

## Agent 4: Analytics Agent

### Primary Ownership
```
/src/modules/reports/
/src/modules/integrations/
/src/app/reports/
/src/app/analytics/
/src/app/integrations/
  └── amazon/
/src/app/admin/reports/
```

### API Routes
```
/src/app/api/reports/
/src/app/api/export/
/src/app/api/amazon/
/src/app/api/dashboard/stats/
/src/app/api/admin/dashboard/
```

### Shared Files (Primary Responsibility)
```
/src/components/reports/
/src/lib/amazon/
```

### Database Tables (Prisma Schema)
- Amazon integration tables
- Report generation metadata
- Analytics tracking

### Key Responsibilities
- Report generation
- Amazon FBA integration
- Data exports
- Analytics dashboards
- Performance metrics
- External integrations

---

## Shared Ownership Areas

### All Agents Can Read (But Not Modify Without Coordination)
```
/prisma/schema.prisma
/src/types/
/src/lib/auth.ts
/src/lib/db.ts
/src/lib/prisma.ts
/src/lib/utils.ts
/src/middleware.ts
```

### Admin Module (Shared Between Agents)
- **Operations**: Admin inventory views
- **Finance**: Admin financial dashboards
- **Configuration**: Admin settings
- **Analytics**: Admin reports and analytics

### Testing Files
Each agent owns tests for their modules:
```
/tests/__tests__/app/[their-module]/
/tests/__tests__/api/[their-routes]/
```

---

## Coordination Rules

### Before Modifying Shared Files
1. Check WAREHOUSE_AGENT_PLAN.md for existing work
2. Add a message in the plan indicating your intent
3. Wait for acknowledgment from the primary owner

### Database Schema Changes
1. Only modify tables you own
2. For new foreign keys to other agent's tables, coordinate first
3. Always use Prisma migrations
4. Document changes in WAREHOUSE_AGENT_PLAN.md

### API Endpoint Conflicts
1. Each agent owns their designated routes
2. For cross-module APIs, the consuming agent should coordinate
3. Never modify another agent's API without permission

### Import/Export Boundaries
- Operations exports: Inventory data, transaction history
- Finance exports: Invoices, financial reports
- Configuration exports: Settings, catalogs
- Analytics imports from all, exports reports

---

## Conflict Resolution

### Priority Order for Conflicts
1. Check primary ownership in this document
2. If shared, defer to the agent whose module is most impacted
3. If still unclear, use this precedence:
   - Database tables: Operations > Finance > Configuration > Analytics
   - Business logic: Module owner has final say
   - UI/UX: Agent implementing the feature decides

### Communication Protocol
Always document in WAREHOUSE_AGENT_PLAN.md:
- What files you're modifying
- Why you need to modify them
- Expected completion time
- Any dependencies on other agents

---

## Quick Reference

| File/Directory | Primary Owner | Can Modify | Must Coordinate |
|----------------|---------------|------------|-----------------|
| `/operations/` | Operations | ✓ | |
| `/finance/` | Finance | ✓ | |
| `/config/` | Configuration | ✓ | |
| `/reports/` | Analytics | ✓ | |
| `/integrations/` | Analytics | ✓ | |
| `schema.prisma` | All | | ✓ |
| `/lib/calculations/` | Operations/Finance | | ✓ |
| `/api/dashboard/` | Analytics | ✓ | |
| `/admin/` | Mixed | | ✓ |