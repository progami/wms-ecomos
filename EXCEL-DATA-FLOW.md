# Excel-Based Warehouse Management System Data Flow

## Overview
This document explains how the 10 Excel sheets work together to manage warehouse operations, and how to reorganize the web app to match this proven workflow.

## Excel Sheet Structure

### 1. Master Data Sheets (Configuration)
These sheets contain reference data that rarely changes:

#### SKU Master (sku_master)
- **Purpose**: Product definitions and specifications
- **Key Fields**: SKU Code, Description, ASIN, Pack Size, Units/Carton, Dimensions, Weight
- **Used By**: All other sheets reference SKU codes from here
- **Web App**: `/admin/settings/skus` page

#### Warehouse Configuration (warehouse_config)
- **Purpose**: Storage cost rates and warehouse setup
- **Key Fields**: Warehouse Name, Monthly Storage Rate, Order Handling Fee, Pick & Pack Fee
- **Used By**: Storage Ledger and Calculated Costs Ledger for cost calculations
- **Web App**: Should be combined with `/admin/settings/warehouses` page

#### Cost Master (cost_master)
- **Purpose**: Additional cost configurations and business rules
- **Key Fields**: Cost Type, Rate, Effective Date
- **Used By**: Calculated Costs Ledger
- **Web App**: Should be part of `/admin/settings/rates` page

### 2. Daily Input Sheets (Transactions)
These sheets capture daily operational data:

#### Inventory Ledger (inventory_ledger)
- **Purpose**: Record all inventory movements (receipts and shipments)
- **Key Fields**: Date, SKU, Warehouse, Transaction Type, Quantity, Reference
- **Flow**: Each row represents a single inventory movement
- **Web App**: 
  - Receipts: `/warehouse/receive` page
  - Shipments: `/warehouse/ship` page
  - View all: `/admin/inventory` page

#### Invoice Input (invoice_input)
- **Purpose**: Upload and process client invoices for reconciliation
- **Key Fields**: Invoice Number, Date, SKU, Quantity, Amount, Cost Type
- **Flow**: Invoices are uploaded and parsed into line items
- **Web App**: `/finance/invoices` page (upload and review)

### 3. Automated Calculation Sheets
These sheets automatically calculate based on input data:

#### Inventory Balance (inventory_balance)
- **Purpose**: Real-time inventory levels by SKU and warehouse
- **Calculation**: Sum of all inventory movements from Inventory Ledger
- **Formula**: Opening Balance + Receipts - Shipments = Current Balance
- **Web App**: Should be shown on `/warehouse/inventory` page as a summary

#### Helper Sheet (helper)
- **Purpose**: Intermediate calculations for complex formulas
- **Key Calculations**:
  - Daily inventory snapshots
  - Average inventory per month
  - Days in storage calculations
  - Cost aggregations
- **Web App**: Not directly visible, but calculations run in backend

#### Storage Ledger (storage_ledger_monthly)
- **Purpose**: Calculate monthly storage costs
- **Calculation**: 
  - Uses daily inventory snapshots from Helper sheet
  - Multiplies average monthly inventory by storage rates
  - Groups by SKU, Warehouse, and Month
- **Web App**: Part of `/admin/reports` or `/finance/reports`

#### Calculated Costs Ledger (calculated_costs_ledger_monthly)
- **Purpose**: Calculate all warehouse costs for billing
- **Includes**:
  - Storage costs (from Storage Ledger)
  - Order handling fees
  - Pick & pack fees
  - Other operational costs
- **Web App**: Part of `/admin/reports` or `/finance/reports`

### 4. Output/Reconciliation Sheet

#### Invoice Reconciliation (invoice_reconciliation_monthly)
- **Purpose**: Compare client invoices against calculated costs
- **Process**:
  1. Takes uploaded invoices from Invoice Input
  2. Compares with Calculated Costs Ledger
  3. Identifies discrepancies
  4. Generates reconciliation report
- **Web App**: `/finance/reconciliation` page

## Data Flow Diagram

```
[SKU Master] ─────────────┐
[Warehouse Config] ────────┤
[Cost Master] ─────────────┤
                          │
                          ▼
[Inventory Ledger] ──► [Helper Sheet] ──► [Inventory Balance]
       │                    │                      │
       │                    ▼                      │
       │              [Storage Ledger]             │
       │                    │                      │
       ▼                    ▼                      ▼
[Invoice Input] ──► [Calculated Costs] ◄──────────┘
       │                    │
       ▼                    ▼
       └──────► [Invoice Reconciliation]
```

## Recommended Web App Reorganization

### 1. Combine Related Functions

#### Settings Section (`/admin/settings`)
- **SKUs**: Product master data ✓ (already exists)
- **Warehouses**: Combine warehouse list + configuration (rates)
- **Rates**: Storage rates, handling fees, other costs

#### Inventory Section (`/warehouse`)
- **Dashboard**: Show inventory balance summary
- **Receive/Ship**: Record transactions ✓ (already exists)
- **Inventory**: Show detailed balance + movement history

#### Finance Section (`/finance`)
- **Invoices**: Upload and manage client invoices
- **Reconciliation**: Compare invoices vs calculated costs
- **Reports**: Storage ledger, costs ledger, monthly summaries

### 2. Implementation Priority

1. **Fix immediate issues**:
   - ✓ SKU edit button (API route created)
   - Warehouse configuration integration
   - Invoice upload workflow

2. **Add missing calculations**:
   - Inventory balance calculation
   - Storage cost calculation
   - Monthly cost aggregation

3. **Improve workflows**:
   - Combine invoice input + reconciliation
   - Add batch operations
   - Improve report generation

### 3. Key Features to Add

#### Warehouse Configuration Page
```typescript
// Combine warehouse list with configuration
interface WarehouseWithConfig {
  id: string
  name: string
  code: string
  location: string
  isActive: boolean
  config: {
    monthlyStorageRate: number
    orderHandlingFee: number
    pickPackFee: number
    minimumCharge: number
  }
}
```

#### Inventory Balance View
```typescript
// Show real-time inventory with movements
interface InventoryBalance {
  sku: SKU
  warehouse: Warehouse
  currentBalance: number
  lastMovement: Date
  movements: InventoryMovement[]
  averageMonthly: number
}
```

#### Invoice Reconciliation Workflow
```typescript
// Unified invoice management
interface InvoiceReconciliation {
  invoice: ClientInvoice
  calculatedCosts: CalculatedCost[]
  discrepancies: Discrepancy[]
  status: 'pending' | 'reviewed' | 'resolved'
}
```

## Database Schema Alignment

The current database schema already supports most Excel functionality:
- ✓ SKUs table matches SKU Master
- ✓ Warehouses table exists (needs config extension)
- ✓ InventoryLedger matches inventory movements
- ✓ Invoices and InvoiceItems support invoice input
- ✓ CalculatedCosts can store cost calculations
- ✓ ReconciliationDiscrepancies for reconciliation

## Next Steps

1. **Update Warehouse Configuration**:
   - Add rate configuration to warehouse settings
   - Create UI for managing storage rates

2. **Implement Calculations**:
   - Create inventory balance service
   - Implement storage cost calculator
   - Build monthly aggregation logic

3. **Enhance Invoice Workflow**:
   - Improve invoice upload process
   - Add automatic reconciliation
   - Create reconciliation dashboard

4. **Add Reporting**:
   - Storage ledger report
   - Calculated costs report
   - Monthly summary reports

This structure maintains the proven Excel workflow while leveraging the web app's advantages for real-time data, multi-user access, and automated calculations.