# Modules Directory

This directory follows a domain-driven design approach, organizing code by business features rather than technical layers.

## Module Structure

Each module contains:
- **api/**: API route handlers specific to the module
- **components/**: React components for the module
- **pages/**: Page components (if not using app directory)
- **services/**: Business logic and data access
- **types/**: TypeScript types and interfaces

## Feature Modules

### admin/
Administrative features
- User management
- System settings
- Database operations
- Import/export tools

### configuration/
System configuration features
- Warehouse setup
- SKU management
- Rate configuration
- Batch attributes

### finance/
Financial management features
- Invoice processing
- Cost tracking
- Reconciliation
- Financial reporting
- Storage ledger

### integrations/
Third-party integrations
- Amazon FBA integration
- API connectors
- External system sync

### operations/
Warehouse operations
- Inventory management
- Receiving goods
- Shipping goods
- Transaction tracking
- Pallet variance

### reports/
Reporting and analytics
- Report generation
- Data visualization
- Export functionality
- Custom queries

## Module Guidelines

1. **Independence**: Modules should be as independent as possible
2. **Encapsulation**: Keep module-specific logic within the module
3. **Interfaces**: Define clear interfaces between modules
4. **Shared Code**: Use `lib/` for truly shared utilities
5. **Testing**: Each module should have its own tests

## Import Pattern

```typescript
// Import from a specific module
import { InvoiceService } from '@/modules/finance/services/invoice-service'
import { InventoryList } from '@/modules/operations/components/inventory-list'
import { ReportGenerator } from '@/modules/reports/services/report-generator'
```

## Adding New Modules

When adding a new module:
1. Create the module directory under `modules/`
2. Add the standard subdirectories (api, components, services, types)
3. Keep all feature-specific code within the module
4. Document the module's purpose and public interfaces