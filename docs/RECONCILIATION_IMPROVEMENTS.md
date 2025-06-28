# Reconciliation Workflow Improvements

## Overview
This document outlines the improvements made to the reconciliation workflow to properly track predicted vs actual costs with full traceability.

## Key Changes

### 1. Database Schema Updates

#### Added `ReconciliationDetail` Model
- Links `InvoiceReconciliation` records to `CalculatedCost` records
- Provides transaction-level traceability for cost variances
- Enables drill-down from summary to source transactions

```prisma
model ReconciliationDetail {
  id                   String                @id @default(uuid())
  reconciliationId     String                @map("reconciliation_id")
  calculatedCostId     String                @map("calculated_cost_id")
  quantity             Decimal               @db.Decimal(12, 2)
  amount               Decimal               @db.Decimal(12, 2)
  createdAt            DateTime              @default(now()) @map("created_at")
  reconciliation       InvoiceReconciliation @relation(...)
  calculatedCost       CalculatedCost        @relation(...)
}
```

### 2. Cost Calculation Service

#### Enhanced `CostCalculationService`
- `calculateAndStoreCosts()` - Populates CalculatedCost table from transactions
- `getCalculatedCostsForReconciliation()` - Retrieves stored costs for reconciliation
- Links costs to source transactions for full audit trail

### 3. Reconciliation Process Updates

#### Updated `/api/reconciliation/run`
- Now uses stored calculated costs instead of recalculating
- Creates `ReconciliationDetail` records linking to `CalculatedCost`
- Provides transaction-level detail for each variance

### 4. UI Enhancements

#### Enhanced Reconciliation Page
- Added expandable rows to show transaction details
- Click on any variance to see contributing transactions
- Shows transaction ID, type, date, SKU, quantity, and cost
- Real-time loading of detail data

### 5. Cost Ledger Updates

#### Updated Cost Ledger
- Now uses stored calculated costs from database
- Ensures consistency between ledger and reconciliation
- Improved performance by avoiding recalculation

## Benefits

1. **Full Traceability**
   - Every reconciliation variance can be traced to source transactions
   - Complete audit trail from invoice line item to warehouse operation

2. **Data Consistency**
   - Single source of truth for calculated costs
   - Reconciliation and cost ledger use same data

3. **Performance**
   - Costs calculated once and stored
   - Faster reconciliation and reporting

4. **Transparency**
   - Users can drill down to understand variances
   - Clear visibility into cost calculations

## Usage

### Running Reconciliation

1. Upload invoice via Invoice Management page
2. Click "Run Reconciliation" on Reconciliation page
3. System will:
   - Calculate and store costs if not already done
   - Match invoice line items to calculated costs
   - Create reconciliation records with full details

### Viewing Details

1. On reconciliation page, variances show expand arrow
2. Click arrow to load transaction details
3. View all transactions contributing to the cost

### Manual Cost Calculation

For admin users, costs can be manually calculated:

```bash
POST /api/finance/calculate-costs
{
  "warehouseId": "uuid",
  "startDate": "2024-01-16",
  "endDate": "2024-02-15"
}
```

## Testing

Run the test script to verify reconciliation:

```bash
npm run tsx scripts/test-reconciliation.ts
```

This will:
- Calculate costs for a test warehouse
- Show cost summary by category
- Compare with any existing invoices
- Display variance analysis

## Migration

Run the migration to add the new ReconciliationDetail table:

```bash
npx prisma migrate dev
```

## Future Enhancements

1. **Automated Alerts**
   - Notify when variances exceed thresholds
   - Flag unusual cost patterns

2. **Bulk Operations**
   - Process multiple invoices at once
   - Batch reconciliation for efficiency

3. **Advanced Analytics**
   - Trend analysis of variances
   - Predictive cost modeling

4. **Integration**
   - API endpoints for external systems
   - Webhook notifications for reconciliation events