# Excel to App Feature Mapping

## Excel Sheets → App Features

### 1. **SKU Master** (Input Sheet)
- **Excel**: Product definitions, dimensions, weights
- **App Location**: Admin → Settings → SKUs (to be created)
- **Features**: View/Add/Edit SKU information

### 2. **Warehouse Config** (Input Sheet)
- **Excel**: Pallets per SKU, stacking heights per warehouse
- **App Location**: Admin → Settings → Warehouses
- **Features**: Configure warehouse-specific SKU settings

### 3. **Cost Master** (Input Sheet)
- **Excel**: Agreed rates from 3PL partners
- **App Location**: Finance → Cost Rates
- **Features**: View/Edit cost rates by warehouse and category

### 4. **Inventory Ledger** (Input Sheet)
- **Excel**: All inventory movements (RECEIVE, SHIP, ADJUST)
- **App Location**: 
  - Warehouse → Receive (for RECEIVE transactions)
  - Warehouse → Ship (for SHIP transactions)
  - Admin → Inventory (view all transactions)
- **Features**: Record new transactions, view history

### 5. **Invoice Input** (Input Sheet)
- **Excel**: 3PL invoice line items
- **App Location**: Finance → Invoices
- **Features**: Upload/Enter invoice data from 3PLs

### 6. **Inventory Balance** (Calculated Sheet)
- **Excel**: Current stock levels (calculated from transactions)
- **App Location**: 
  - Warehouse → Inventory (warehouse-specific view)
  - Admin → Inventory (all warehouses)
- **Features**: Real-time inventory levels, auto-calculated

### 7. **Storage Ledger** (Calculated Sheet)
- **Excel**: Weekly storage charges (Monday snapshots)
- **App Location**: Admin → Calculations → Storage Ledger
- **Features**: Generate weekly storage calculations for billing periods

### 8. **Invoice Reconciliation** (Hybrid Sheet)
- **Excel**: Compare expected vs actual charges
- **App Location**: Finance → Reconciliation
- **Features**: Match invoices against calculated costs

### 9. **Calculated Costs Ledger** (Calculated Sheet)
- **Excel**: Expected charges for all activities
- **App Location**: Admin → Calculations (to be implemented)
- **Features**: Auto-calculate expected costs based on rates

### 10. **Helper Sheet** (Reference Sheet)
- **Excel**: Monday dates, active combinations
- **App Location**: Not visible (used internally by calculations)
- **Features**: System-generated reference data

## User Role Access

### System Admin
- **Full Access**: All features across all warehouses
- Can access Finance, Warehouse, and Admin sections
- Can trigger calculations and generate reports

### Finance Admin
- **Finance Section**: Invoices, Reconciliation, Cost Rates, Reports
- Cannot access warehouse operations directly
- Focus on billing and cost management

### Warehouse Staff
- **Warehouse Section**: Inventory, Receive, Ship, Reports
- Limited to their assigned warehouse
- Cannot access financial data

### Manager
- **Read-Only Access**: Dashboard, Analytics, Reports
- Cross-warehouse visibility
- Strategic overview without operations

### Viewer
- **Limited Read-Only**: Dashboard and basic reports
- No operational access