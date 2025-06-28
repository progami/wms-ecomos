# SKU vs Batch View Toggle

## Overview

The inventory balance page now features a toggle between two viewing modes:
- **By SKU**: Aggregated view showing total stock levels per SKU across all batches
- **By Batch**: Detailed view showing individual batch breakdown with packaging configurations

## View Toggle UI

A sleek toggle button appears at the top of the inventory balance tab:
```
[By SKU] [By Batch]
```

The active view is highlighted with a white background and shadow.

## By SKU View

### Purpose
Shows total inventory levels grouped by SKU and warehouse, aggregating all batches together.

### Features
- **Aggregated Totals**: Combines cartons, pallets, and units across all batches
- **Batch Count**: Shows number of batches under each SKU in the description field
- **No Expandable Rows**: Simplified view without expansion capability
- **Hidden Columns**: Batch/Lot and Received By columns are hidden

### Use Cases
- Quick overview of total stock levels
- Planning shipments without concern for specific batches
- High-level inventory reporting
- Identifying which SKUs need restocking

### Example Display
```
Warehouse | SKU Code | Description           | Cartons | Pallets | Units
LAX       | SKU001   | Product ABC          | 500     | 25      | 5,000
                      2 batches
```

## By Batch View

### Purpose
Shows detailed inventory with batch-level breakdown and packaging configurations.

### Features
- **Batch Details**: Individual batch/lot numbers displayed
- **Pallet Configurations**: Storage and shipping cartons per pallet shown
- **Expandable Rows**: Click to see detailed batch information
- **Batch Indicators**: Purple badges for batches with custom configurations
- **Full Attribute Display**: Shows who received each batch

### Use Cases
- FIFO/FEFO inventory management
- Tracking specific batch attributes
- Quality control and traceability
- Detailed inventory auditing

### Expandable Row Information
When clicking on a batch row, see:
- Batch creation date
- Person who received the goods
- Full pallet configuration details
- Total value breakdown

## Technical Implementation

### Data Aggregation
```typescript
const inventoryBySku = useMemo(() => {
  const skuMap = new Map()
  inventoryData.forEach(item => {
    const key = `${item.warehouse.id}-${item.sku.skuCode}`
    // Aggregate cartons, pallets, units
    // Track batch count
  })
  return Array.from(skuMap.values())
}, [inventoryData])
```

### Conditional Rendering
- Columns filtered based on view mode
- Expandable functionality disabled in SKU view
- Summary stats updated to reflect current view

## Benefits

1. **Flexibility**: Users can switch between high-level and detailed views instantly
2. **Performance**: Data is already loaded, switching is instantaneous
3. **Context**: Appropriate information shown for each use case
4. **Clean UI**: Reduces clutter by hiding irrelevant columns per view
5. **Workflow Efficiency**: Supports both strategic planning (SKU view) and operational tasks (Batch view)