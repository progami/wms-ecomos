# Enhanced SKU View Implementation

## Overview

The inventory balance page now features an enhanced "By SKU" view that provides global inventory totals across all warehouses with expandable warehouse breakdowns.

## Key Features

### Global Aggregation
- Shows total cartons, pallets, and units for each SKU across ALL warehouses
- No longer groups by warehouse + SKU combination
- Provides a true company-wide inventory view

### Warehouse Breakdown
- Shows warehouse count in the description (e.g., "3 batches • 2 warehouses")
- Rows are expandable to reveal warehouse-specific details
- Each warehouse shows its cartons, pallets, units, and batch count

### Smart Filtering
- Warehouse filter in SKU view shows only SKUs that have inventory in that warehouse
- Search excludes warehouse and batch fields in SKU view for cleaner results

## UI Improvements

### Expandable Rows
- Click any SKU row to see warehouse breakdown
- Chevron indicator (▶/▼) shows expansion state
- Clean card-based layout for warehouse details

### Example Display
```
[▶] SKU001 | Product ABC | 500 | 25 | 5000 | units/carton | last activity
            3 batches • 2 warehouses

When expanded:
[▼] SKU001 | Product ABC | 500 | 25 | 5000 | units/carton | last activity
    
    Warehouse Breakdown:
    ┌─ LAX Warehouse          200 cartons  10 pallets  2000 units
    │  2 batches
    │
    └─ NYC Warehouse          300 cartons  15 pallets  3000 units
       1 batch
```

## Benefits

1. **Strategic Planning**: See total company inventory at a glance
2. **Operational Flexibility**: Quickly identify which warehouses have stock
3. **Better Decision Making**: Understand inventory distribution across locations
4. **Reduced Complexity**: No need to mentally add up same SKU across warehouses
5. **Progressive Disclosure**: Details available when needed, not cluttering the main view

## Technical Details

### Data Structure
```typescript
// SKU aggregation includes warehouse breakdown
{
  id: 'SKU001',
  sku: { skuCode: 'SKU001', description: 'Product ABC' },
  currentCartons: 500,
  currentPallets: 25,
  currentUnits: 5000,
  batchCount: 3,
  warehouseCount: 2,
  warehouseBreakdown: {
    'warehouse-id-1': {
      warehouse: { name: 'LAX Warehouse' },
      currentCartons: 200,
      currentPallets: 10,
      currentUnits: 2000,
      batchCount: 2
    },
    'warehouse-id-2': {
      warehouse: { name: 'NYC Warehouse' },
      currentCartons: 300,
      currentPallets: 15,
      currentUnits: 3000,
      batchCount: 1
    }
  }
}
```

### View Toggle Behavior
- **By SKU**: Global aggregation with warehouse breakdown
- **By Batch**: Traditional view showing individual batches with warehouse context

## User Workflow

1. Default to "By Batch" view for operational tasks
2. Switch to "By SKU" for planning and purchasing decisions
3. Click to expand any SKU to see warehouse distribution
4. Use warehouse filter to see only SKUs in specific locations