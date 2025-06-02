# Implementation Plan: Excel-to-Web App Migration

## Phase 1: Critical Fixes (Immediate)

### 1. ✓ Fix SKU Edit Button
- **Status**: COMPLETED
- **Solution**: Created missing API route `/api/skus/[id]/route.ts`
- **Test**: Navigate to SKUs page and click edit button on any SKU

### 2. Warehouse Configuration Integration
- **Current State**: Warehouses exist but no rate configuration
- **Required Changes**:
  1. Extend warehouse schema with configuration fields
  2. Update warehouse UI to include rate settings
  3. Create API endpoints for rate management

### 3. Inventory Balance Display
- **Current State**: Movements tracked but no balance summary
- **Required Changes**:
  1. Add balance calculation to inventory page
  2. Show current stock levels by SKU/warehouse
  3. Add movement history view

## Phase 2: Core Workflows (Week 1)

### 1. Invoice Upload & Processing
- Implement file upload for Excel/CSV invoices
- Parse invoice data into InvoiceItems
- Add validation and error handling
- Create review interface before saving

### 2. Cost Calculations
- Implement storage cost calculator (monthly average inventory × rate)
- Add handling fee calculations
- Create pick & pack fee calculations
- Generate monthly cost summaries

### 3. Reconciliation Workflow
- Compare uploaded invoices with calculated costs
- Highlight discrepancies
- Add resolution tracking
- Generate reconciliation reports

## Phase 3: Enhanced Features (Week 2)

### 1. Reporting Suite
- Storage Ledger Report (monthly storage costs by SKU)
- Calculated Costs Report (all warehouse charges)
- Inventory Movement Report
- Reconciliation Summary Report

### 2. Batch Operations
- Bulk inventory updates
- Batch invoice processing
- Mass SKU updates
- Bulk rate changes

### 3. Dashboard Improvements
- Real-time inventory levels
- Cost trends visualization
- Reconciliation status overview
- Alert system for low stock or discrepancies

## Quick Wins (Can implement now)

### 1. Combine Warehouse + Config Pages
Create a unified warehouse management page that includes both warehouse details and rate configuration.

### 2. Add Inventory Summary to Inventory Page
Show total quantities by SKU at the top of the inventory page.

### 3. Improve Invoice Page Flow
Add clear steps: Upload → Review → Process → Reconcile

### 4. Add Helper Text
Add explanatory text to each page explaining its purpose and how it relates to the overall workflow.

## Technical Implementation Notes

### Database Schema Updates Needed:
```sql
-- Add to Warehouses table
ALTER TABLE Warehouses ADD COLUMN monthlyStorageRate DECIMAL(10,2);
ALTER TABLE Warehouses ADD COLUMN orderHandlingFee DECIMAL(10,2);
ALTER TABLE Warehouses ADD COLUMN pickPackFee DECIMAL(10,2);
ALTER TABLE Warehouses ADD COLUMN minimumMonthlyCharge DECIMAL(10,2);

-- Add to track configuration history
CREATE TABLE WarehouseRateHistory (
  id VARCHAR(36) PRIMARY KEY,
  warehouseId VARCHAR(36) NOT NULL,
  effectiveDate DATE NOT NULL,
  monthlyStorageRate DECIMAL(10,2),
  orderHandlingFee DECIMAL(10,2),
  pickPackFee DECIMAL(10,2),
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (warehouseId) REFERENCES Warehouses(id)
);
```

### API Endpoints to Create:
1. `GET/POST/PUT /api/warehouses/[id]/config` - Warehouse configuration
2. `GET /api/inventory/balances` - Current inventory balances
3. `POST /api/invoices/upload` - Bulk invoice upload
4. `GET /api/calculations/storage-costs` - Storage cost calculations
5. `POST /api/reconciliation/run` - Run reconciliation process

### UI Components to Build:
1. `WarehouseConfigForm` - Rate configuration form
2. `InventoryBalanceTable` - Stock level summary
3. `InvoiceUploader` - Drag-drop Excel/CSV upload
4. `ReconciliationDashboard` - Comparison view
5. `CostCalculator` - Interactive cost preview

## Testing Checklist

- [ ] SKU edit functionality works
- [ ] Warehouse rates can be configured
- [ ] Inventory balances calculate correctly
- [ ] Invoices can be uploaded and parsed
- [ ] Storage costs calculate accurately
- [ ] Reconciliation identifies discrepancies
- [ ] Reports generate with correct data
- [ ] All workflows match Excel process

## Success Metrics

1. **Data Accuracy**: 100% match with Excel calculations
2. **User Efficiency**: 50% reduction in manual data entry
3. **Error Reduction**: 90% fewer reconciliation errors
4. **Processing Time**: 75% faster month-end closing
5. **User Adoption**: All users migrated from Excel within 30 days