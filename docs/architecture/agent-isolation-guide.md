# Agent Isolation Architecture Guide

## Overview
This guide provides recommendations for structuring the warehouse management system to enable multiple AI agents to work on different parts of the codebase with minimal conflicts and dependencies.

## Current Architecture Analysis

### 1. Page-Based Structure (Good Foundation)
The project already follows Next.js App Router conventions with page-based routing:
```
src/app/
├── admin/           # Admin-only pages
├── warehouse/       # Warehouse operations
├── finance/         # Financial operations
├── auth/           # Authentication
└── api/            # API routes
```

### 2. Shared Dependencies (Areas for Improvement)
Currently, there are several tightly coupled areas:
- Database models (Prisma schema)
- Authentication (NextAuth)
- UI components (shared across pages)
- API routes (cross-module dependencies)

## Recommendations for Agent Isolation

### 1. Module Boundary Definition

Define clear module boundaries with explicit interfaces:

```typescript
// modules/inventory/index.ts
export interface InventoryModule {
  // Public API
  getInventoryBalance(warehouseId: string, skuId: string): Promise<Balance>
  createTransaction(data: TransactionInput): Promise<Transaction>
  
  // Events emitted
  events: {
    onInventoryChanged: (handler: (data: InventoryChangeEvent) => void) => void
  }
}
```

### 2. Vertical Slice Architecture

Organize code by feature/domain rather than technical layers:

```
src/
├── modules/
│   ├── inventory/
│   │   ├── api/          # API routes for inventory
│   │   ├── components/   # Inventory-specific components
│   │   ├── pages/        # Inventory pages
│   │   ├── hooks/        # Inventory-specific hooks
│   │   ├── types/        # Inventory types
│   │   ├── services/     # Business logic
│   │   └── index.ts      # Module public API
│   ├── finance/
│   │   └── ... (same structure)
│   └── warehouse/
│       └── ... (same structure)
└── shared/              # Truly shared code
    ├── components/      # Generic UI components
    ├── utils/          # Generic utilities
    └── types/          # Shared types
```

### 3. Database Isolation Strategies

#### Option A: Schema Separation
```prisma
// prisma/schema.prisma
// Core schemas (rarely change)
model User { ... }
model Warehouse { ... }
model SKU { ... }

// Module-specific schemas
// inventory.prisma
model InventoryTransaction { ... }
model InventoryBalance { ... }

// finance.prisma
model Invoice { ... }
model CostRate { ... }
```

#### Option B: Repository Pattern
```typescript
// modules/inventory/repositories/transaction.repository.ts
export class TransactionRepository {
  async create(data: CreateTransactionDto): Promise<Transaction> {
    // Encapsulate Prisma calls
    return await prisma.inventoryTransaction.create({ data })
  }
}
```

### 4. Communication Between Modules

Use event-driven architecture for loose coupling:

```typescript
// shared/events/event-bus.ts
export class EventBus {
  private static instance: EventBus
  private handlers: Map<string, Handler[]> = new Map()
  
  emit(event: string, data: any) {
    const handlers = this.handlers.get(event) || []
    handlers.forEach(handler => handler(data))
  }
  
  on(event: string, handler: Handler) {
    const handlers = this.handlers.get(event) || []
    this.handlers.set(event, [...handlers, handler])
  }
}

// Usage in inventory module
eventBus.emit('inventory.updated', { warehouseId, skuId, quantity })

// Listening in finance module
eventBus.on('inventory.updated', async (data) => {
  await recalculateStorageCosts(data)
})
```

### 5. API Contract Definition

Define clear API contracts using TypeScript interfaces:

```typescript
// modules/inventory/contracts/api.contract.ts
export interface InventoryAPI {
  '/api/inventory/transactions': {
    GET: {
      query: {
        warehouseId?: string
        startDate?: string
        endDate?: string
      }
      response: Transaction[]
    }
    POST: {
      body: CreateTransactionDto
      response: Transaction
    }
  }
}
```

### 6. Feature Flags for Isolation

Implement feature flags to allow parallel development:

```typescript
// shared/features/flags.ts
export const featureFlags = {
  NEW_INVENTORY_UI: process.env.NEXT_PUBLIC_FF_NEW_INVENTORY_UI === 'true',
  ENHANCED_REPORTS: process.env.NEXT_PUBLIC_FF_ENHANCED_REPORTS === 'true',
}

// Usage
if (featureFlags.NEW_INVENTORY_UI) {
  return <NewInventoryPage />
} else {
  return <LegacyInventoryPage />
}
```

### 7. Module Independence Checklist

For each module, ensure:
- [ ] Has its own dedicated folder structure
- [ ] Exports a clear public API
- [ ] Does not import from other modules' internal files
- [ ] Uses events or APIs for cross-module communication
- [ ] Has its own test suite
- [ ] Documents its dependencies
- [ ] Can be developed/tested in isolation

### 8. Practical Migration Steps

1. **Phase 1: Create Module Structure**
   - Create modules folder
   - Move existing code into appropriate modules
   - Keep imports working with aliases

2. **Phase 2: Define Module APIs**
   - Create index.ts for each module
   - Export only public interfaces
   - Update imports to use module APIs

3. **Phase 3: Implement Event Bus**
   - Create event bus infrastructure
   - Replace direct module calls with events
   - Add event documentation

4. **Phase 4: Database Isolation**
   - Implement repository pattern
   - Create module-specific migrations
   - Document data ownership

## Example: Inventory Module Isolation

```typescript
// modules/inventory/index.ts
export { InventoryPage } from './pages/inventory.page'
export { ReceivePage } from './pages/receive.page'
export { ShipPage } from './pages/ship.page'
export { inventoryAPI } from './api'
export type { Transaction, Balance } from './types'

// modules/inventory/api/index.ts
export const inventoryAPI = {
  async getTransactions(filters: TransactionFilters): Promise<Transaction[]> {
    // Implementation
  },
  async createTransaction(data: CreateTransactionDto): Promise<Transaction> {
    // Implementation
    eventBus.emit('inventory.transaction.created', transaction)
    return transaction
  }
}

// Other modules consume via:
import { inventoryAPI } from '@/modules/inventory'
const transactions = await inventoryAPI.getTransactions({ warehouseId })
```

## Benefits of This Approach

1. **Parallel Development**: Multiple agents can work on different modules without conflicts
2. **Clear Boundaries**: Each agent knows exactly what files they can modify
3. **Reduced Merge Conflicts**: Isolated modules mean fewer overlapping changes
4. **Better Testing**: Modules can be tested in isolation
5. **Easier Onboarding**: New agents can understand a single module without learning the entire system

## Module Ownership Matrix

| Module | Primary Functions | Dependencies | Emits Events | Consumes Events |
|--------|------------------|--------------|--------------|-----------------|
| Inventory | Transactions, Balances | SKU, Warehouse | inventory.* | amazon.inventory.synced |
| Finance | Invoices, Reconciliation | - | finance.* | inventory.* |
| Warehouse | Receive, Ship | Inventory API | - | - |
| Amazon Integration | FBA Sync, Inventory Comparison | SKU, Warehouse | amazon.inventory.synced | - |
| Admin | User Mgmt, Settings | All modules | admin.* | *.* |
| Reports | Analytics, Exports | All modules (read) | - | *.* |

## Next Steps

1. **Pilot Module**: Start with the Reports module as it's mostly read-only
2. **Document APIs**: Create OpenAPI/TypeScript definitions for each module
3. **Implement Event Bus**: Start with a simple implementation
4. **Gradual Migration**: Move one module at a time
5. **Monitor Progress**: Track reduction in merge conflicts and development speed

## Conclusion

By implementing these isolation strategies, the warehouse management system can support multiple AI agents working simultaneously with minimal conflicts. The key is to think of each module as a micro-application with its own bounded context, clear API, and minimal dependencies on other modules.