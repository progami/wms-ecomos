# Fault-Tolerant SKU Management

## Overview

The WMS now implements a fault-tolerant approach to SKU master data changes. This ensures that historical inventory data remains accurate even when SKU specifications change over time.

## Key Design Principle

**Cartons are the source of truth**, units are derived. The system captures `unitsPerCarton` at transaction time to preserve historical accuracy.

## How It Works

### Transaction Creation
When creating an inventory transaction (receive, ship, adjust):
1. The current `unitsPerCarton` value from the SKU master is captured
2. This value is stored with the transaction record
3. Unit calculations use the transaction's captured value, not the SKU's current value

### SKU Changes
When you change a SKU's `unitsPerCarton`:
1. Only future transactions use the new value
2. Historical transactions retain their original values
3. Inventory balances calculate units based on transaction history

## Example Scenario

1. **January 2023**: Receive 100 cartons of SKU001 (10 units/carton)
   - Transaction stores: 100 cartons, 10 units/carton
   - Inventory shows: 1,000 units

2. **March 2024**: Change SKU001 to 12 units/carton
   - Existing inventory still shows: 1,000 units ✓
   - No retroactive changes ✓

3. **April 2024**: Receive 50 more cartons
   - New transaction stores: 50 cartons, 12 units/carton
   - Additional inventory: 600 units
   - Total: 150 cartons, 1,600 units

## Best Practices

### When to Change Units per Carton
- **Fixing data entry mistakes**: Safe to change
- **Correcting setup errors**: Safe to change
- **Packaging changes**: Create a new SKU code instead

### Creating New SKUs for Packaging Changes
If your product changes from 10-pack to 12-pack:
1. Keep the old SKU (e.g., `PROD-001-10PK`)
2. Create a new SKU (e.g., `PROD-001-12PK`)
3. Ship out old inventory first
4. Receive new inventory under the new SKU

## Benefits

1. **Historical Accuracy**: Reports show correct values for past periods
2. **Audit Trail**: Can see what units/carton was used for each transaction
3. **No Surprises**: Changing master data doesn't alter historical records
4. **Flexibility**: Can fix genuine mistakes without complex workarounds

## Technical Implementation

### Database Changes
- Added `units_per_carton` column to `inventory_transactions` table
- This field captures the SKU's value at transaction time

### Calculation Logic
```typescript
// At transaction creation
transaction.unitsPerCarton = sku.unitsPerCarton

// For unit calculations
const units = transaction.cartonsIn * transaction.unitsPerCarton
```

### Backward Compatibility
- Existing transactions without `unitsPerCarton` fall back to current SKU value
- Migration script backfills historical data where possible

## Reports and Exports

All reports now show:
- The units/carton value used for each transaction
- Calculated units based on transaction data
- Current SKU values marked as "(Current)" for clarity

## UI Warnings

The SKU edit page displays a warning:
> "Changes to Units per Carton will only affect future transactions. Historical inventory data preserves the original values to maintain accurate records."

This ensures users understand the implications of their changes.