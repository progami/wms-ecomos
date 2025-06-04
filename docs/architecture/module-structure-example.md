# Module Structure Implementation Example

## Current vs Proposed Structure

### Current Structure (Technical Layers)
```
src/
├── app/
│   ├── admin/
│   ├── warehouse/
│   └── finance/
├── components/
│   ├── ui/
│   └── layout/
├── lib/
│   ├── auth.ts
│   ├── prisma.ts
│   └── utils.ts
└── types/
    └── index.ts
```

### Proposed Structure (Feature Modules)
```
src/
├── modules/
│   ├── inventory/
│   │   ├── pages/
│   │   │   ├── ledger.page.tsx
│   │   │   ├── balances.page.tsx
│   │   │   └── storage-ledger.page.tsx
│   │   ├── components/
│   │   │   ├── transaction-table.tsx
│   │   │   ├── balance-card.tsx
│   │   │   └── storage-chart.tsx
│   │   ├── api/
│   │   │   ├── transactions/route.ts
│   │   │   ├── balances/route.ts
│   │   │   └── storage-ledger/route.ts
│   │   ├── services/
│   │   │   ├── transaction.service.ts
│   │   │   ├── balance.service.ts
│   │   │   └── storage.service.ts
│   │   ├── hooks/
│   │   │   ├── use-transactions.ts
│   │   │   └── use-inventory-balance.ts
│   │   ├── types.ts
│   │   └── index.ts
│   │
│   ├── warehouse-operations/
│   │   ├── pages/
│   │   │   ├── receive.page.tsx
│   │   │   └── ship.page.tsx
│   │   ├── components/
│   │   │   ├── sku-selector.tsx
│   │   │   ├── batch-input.tsx
│   │   │   └── attachment-upload.tsx
│   │   ├── api/
│   │   │   ├── receive/route.ts
│   │   │   └── ship/route.ts
│   │   ├── services/
│   │   │   └── operations.service.ts
│   │   ├── types.ts
│   │   └── index.ts
│   │
│   ├── finance/
│   │   ├── pages/
│   │   │   ├── invoices.page.tsx
│   │   │   ├── reconciliation.page.tsx
│   │   │   └── dashboard.page.tsx
│   │   ├── components/
│   │   │   ├── invoice-form.tsx
│   │   │   ├── reconciliation-table.tsx
│   │   │   └── cost-summary.tsx
│   │   ├── api/
│   │   │   ├── invoices/route.ts
│   │   │   └── reconciliation/route.ts
│   │   ├── services/
│   │   │   ├── invoice.service.ts
│   │   │   └── reconciliation.service.ts
│   │   ├── types.ts
│   │   └── index.ts
│   │
│   ├── master-data/
│   │   ├── pages/
│   │   │   ├── skus.page.tsx
│   │   │   ├── warehouses.page.tsx
│   │   │   └── rates.page.tsx
│   │   ├── components/
│   │   │   ├── sku-form.tsx
│   │   │   ├── warehouse-form.tsx
│   │   │   └── rate-form.tsx
│   │   ├── api/
│   │   │   ├── skus/route.ts
│   │   │   ├── warehouses/route.ts
│   │   │   └── rates/route.ts
│   │   ├── services/
│   │   │   └── master-data.service.ts
│   │   ├── types.ts
│   │   └── index.ts
│   │
│   ├── reports/
│   │   ├── pages/
│   │   │   └── reports.page.tsx
│   │   ├── components/
│   │   │   ├── report-generator.tsx
│   │   │   └── export-button.tsx
│   │   ├── api/
│   │   │   └── reports/route.ts
│   │   ├── services/
│   │   │   └── report.service.ts
│   │   ├── types.ts
│   │   └── index.ts
│   │
│   └── amazon-integration/
│       ├── pages/
│       │   └── overview.page.tsx
│       ├── components/
│       │   ├── inventory-comparison-table.tsx
│       │   └── sync-status.tsx
│       ├── api/
│       │   ├── setup-warehouse/route.ts
│       │   ├── sync-to-database/route.ts
│       │   ├── inventory-comparison/route.ts
│       │   └── sync/route.ts
│       ├── services/
│       │   ├── amazon-warehouse.service.ts
│       │   ├── amazon-sync.service.ts
│       │   └── amazon-inventory.service.ts
│       ├── lib/
│       │   └── amazon-client.ts
│       ├── types.ts
│       └── index.ts
│
├── shared/
│   ├── components/
│   │   ├── ui/
│   │   │   ├── button.tsx
│   │   │   ├── modal.tsx
│   │   │   └── table.tsx
│   │   └── layout/
│   │       ├── dashboard-layout.tsx
│   │       └── main-nav.tsx
│   ├── hooks/
│   │   ├── use-auth.ts
│   │   └── use-toast.ts
│   ├── lib/
│   │   ├── prisma.ts
│   │   ├── auth.ts
│   │   └── utils.ts
│   ├── types/
│   │   ├── database.ts
│   │   └── common.ts
│   └── events/
│       └── event-bus.ts
│
└── app/  # Next.js routing only
    ├── (auth)/
    │   └── login/page.tsx
    ├── (admin)/
    │   ├── admin/
    │   │   ├── inventory/page.tsx
    │   │   ├── settings/
    │   │   └── reports/page.tsx
    │   └── layout.tsx
    ├── (warehouse)/
    │   ├── warehouse/
    │   │   ├── receive/page.tsx
    │   │   └── ship/page.tsx
    │   └── layout.tsx
    └── (finance)/
        ├── finance/
        │   ├── invoices/page.tsx
        │   └── reconciliation/page.tsx
        └── layout.tsx
```

## Implementation Example: Inventory Module

### 1. Module Index (Public API)
```typescript
// modules/inventory/index.ts
// Public exports - other modules should only import from here

// Pages
export { InventoryLedgerPage } from './pages/ledger.page'
export { InventoryBalancesPage } from './pages/balances.page'
export { StorageLedgerPage } from './pages/storage-ledger.page'

// Services (for other modules to use)
export { inventoryService } from './services/inventory.service'

// Types
export type {
  Transaction,
  Balance,
  StorageSnapshot,
  TransactionFilters
} from './types'

// Events
export const INVENTORY_EVENTS = {
  TRANSACTION_CREATED: 'inventory.transaction.created',
  BALANCE_UPDATED: 'inventory.balance.updated',
  STORAGE_CALCULATED: 'inventory.storage.calculated'
} as const
```

### 2. Service Layer (Business Logic)
```typescript
// modules/inventory/services/inventory.service.ts
import { prisma } from '@/shared/lib/prisma'
import { eventBus } from '@/shared/events/event-bus'
import { INVENTORY_EVENTS } from '../'
import type { CreateTransactionDto, Transaction } from '../types'

class InventoryService {
  async createTransaction(data: CreateTransactionDto): Promise<Transaction> {
    const transaction = await prisma.inventoryTransaction.create({
      data: {
        ...data,
        transactionDate: new Date()
      }
    })

    // Emit event for other modules
    eventBus.emit(INVENTORY_EVENTS.TRANSACTION_CREATED, {
      transaction,
      warehouseId: data.warehouseId,
      skuId: data.skuId,
      quantity: data.cartonsIn - data.cartonsOut
    })

    return transaction
  }

  async getBalance(warehouseId: string, skuId: string): Promise<Balance> {
    return await prisma.inventoryBalance.findUnique({
      where: {
        warehouseId_skuId_batchLot: {
          warehouseId,
          skuId,
          batchLot: 'DEFAULT'
        }
      }
    })
  }
}

export const inventoryService = new InventoryService()
```

### 3. API Routes (HTTP Layer)
```typescript
// modules/inventory/api/transactions/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { inventoryService } from '../../services/inventory.service'
import { validateTransactionInput } from '../../validators'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validated = validateTransactionInput(body)
    
    const transaction = await inventoryService.createTransaction(validated)
    
    return NextResponse.json(transaction)
  } catch (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 400 }
    )
  }
}
```

### 4. Page Component
```typescript
// modules/inventory/pages/ledger.page.tsx
'use client'

import { useTransactions } from '../hooks/use-transactions'
import { TransactionTable } from '../components/transaction-table'
import { ExportButton } from '@/shared/components/export-button'

export function InventoryLedgerPage() {
  const { transactions, loading, filters, setFilters } = useTransactions()

  return (
    <div className="space-y-4">
      <div className="flex justify-between">
        <h1>Inventory Ledger</h1>
        <ExportButton 
          data={transactions}
          filename="inventory-ledger"
        />
      </div>
      
      <TransactionTable
        transactions={transactions}
        loading={loading}
        onFilterChange={setFilters}
      />
    </div>
  )
}
```

### 5. Next.js App Route (Thin Layer)
```typescript
// app/(admin)/admin/inventory/page.tsx
import { InventoryLedgerPage } from '@/modules/inventory'

export default function Page() {
  return <InventoryLedgerPage />
}
```

## Module Communication Example

### Scenario: When inventory is received, update storage costs

```typescript
// modules/warehouse-operations/services/operations.service.ts
import { inventoryService } from '@/modules/inventory'
import { eventBus } from '@/shared/events/event-bus'

class OperationsService {
  async receiveInventory(data: ReceiveInventoryDto) {
    // Create the transaction through inventory module
    const transaction = await inventoryService.createTransaction({
      warehouseId: data.warehouseId,
      skuId: data.skuId,
      batchLot: data.batchLot,
      transactionType: 'RECEIVE',
      cartonsIn: data.cartons,
      cartonsOut: 0,
      // ... other fields
    })

    // The inventory module will emit an event
    // Finance module listens to this event
    return transaction
  }
}

// modules/finance/services/storage-cost.service.ts
import { eventBus } from '@/shared/events/event-bus'
import { INVENTORY_EVENTS } from '@/modules/inventory'

class StorageCostService {
  constructor() {
    // Listen for inventory changes
    eventBus.on(INVENTORY_EVENTS.TRANSACTION_CREATED, async (data) => {
      await this.recalculateStorageCosts(data.warehouseId)
    })
  }

  private async recalculateStorageCosts(warehouseId: string) {
    // Recalculation logic
  }
}
```

## Benefits for Multiple Agents

1. **Clear Ownership**: Each agent can own specific modules
2. **Minimal Conflicts**: Changes are isolated to module boundaries
3. **Easy Testing**: Mock module dependencies easily
4. **Parallel Development**: Multiple features can progress simultaneously
5. **Clear Contracts**: Module APIs define integration points

## Amazon Integration Module Example

### Module Structure
```typescript
// modules/amazon-integration/index.ts
export { AmazonOverviewPage } from './pages/overview.page'
export { amazonService } from './services/amazon.service'
export type { AmazonInventoryItem, SyncResult } from './types'

export const AMAZON_EVENTS = {
  INVENTORY_SYNCED: 'amazon.inventory.synced',
  WAREHOUSE_CREATED: 'amazon.warehouse.created',
  SYNC_FAILED: 'amazon.sync.failed'
} as const
```

### Service Implementation
```typescript
// modules/amazon-integration/services/amazon.service.ts
import { eventBus } from '@/shared/events/event-bus'
import { AMAZON_EVENTS } from '../'

class AmazonService {
  async syncInventory(): Promise<SyncResult> {
    // Ensure warehouse exists
    const warehouse = await this.ensureWarehouse()
    
    // Fetch from Amazon API
    const inventory = await this.fetchInventory()
    
    // Update database
    const result = await this.updateInventoryBalances(inventory)
    
    // Emit event for other modules
    eventBus.emit(AMAZON_EVENTS.INVENTORY_SYNCED, {
      warehouseId: warehouse.id,
      itemsUpdated: result.synced,
      timestamp: new Date()
    })
    
    return result
  }
  
  private async ensureWarehouse() {
    // Implementation
  }
  
  private async fetchInventory() {
    // Use Amazon SP-API
  }
  
  private async updateInventoryBalances(inventory: any[]) {
    // Update database
  }
}

export const amazonService = new AmazonService()
```

## Migration Strategy

### Phase 1: Reorganize Files (No Code Changes)
- Create module folders
- Move files maintaining imports
- Update import paths

### Phase 2: Define Module APIs
- Create index.ts for each module
- Define public exports
- Update cross-module imports

### Phase 3: Implement Event System
- Add event bus
- Replace tight coupling with events
- Document event contracts

### Phase 4: Isolate Data Access
- Implement repository pattern
- Move Prisma calls to services
- Define data ownership

### Phase 5: Enable Parallel Development
- Assign module ownership to different agents
- Document module boundaries
- Set up integration tests between modules

This structure allows multiple AI agents to work on different modules with minimal conflicts while maintaining a clean, maintainable architecture.