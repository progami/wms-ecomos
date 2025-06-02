# Excel to Web App Mapping - Complete Architecture

## 📊 Excel Structure (10 Sheets) → Web App Pages

### 1. **Master Data Configuration**
These are reference sheets that define the system setup:

#### Excel: `sku master` → Web: `/admin/settings/skus`
- **Purpose**: Define all products with codes, descriptions, dimensions, weights
- **Key Data**: SKU codes, ASIN, pack sizes, carton specs, units per carton
- **Web Features**: Add/Edit/Delete SKUs, search, filter active/inactive

#### Excel: `warehouse config` → Web: `/admin/settings/warehouses` + SKU Config
- **Purpose**: Define how each warehouse handles each SKU (cartons per pallet)
- **Key Data**: Storage cartons/pallet, shipping cartons/pallet, max height
- **Web Features**: Configure per-warehouse SKU settings, pallet configurations

#### Excel: `cost master` → Web: `/admin/settings/rates` 
- **Purpose**: Define all 3PL rates (storage per pallet/week, handling fees)
- **Key Data**: Cost categories, rates, effective dates, units of measure
- **Web Features**: Manage rates by warehouse, set effective dates

### 2. **Daily Operations Input**
These sheets capture daily transactions:

#### Excel: `inventory ledger` → Web: `/warehouse/receive` + `/warehouse/ship`
- **Purpose**: Record EVERY inventory movement (receive, ship, adjust)
- **Key Data**: Transaction ID, warehouse, SKU, batch, cartons in/out
- **Web Features**: Create receive/ship transactions, view history

#### Excel: `invoice input` → Web: `/finance/invoices/new`
- **Purpose**: Enter invoices received FROM 3PL warehouses
- **Key Data**: Invoice number, warehouse, billing period, line items, amounts
- **Web Features**: Upload or manually enter invoices, track payment status

### 3. **Automated Calculations**
These sheets calculate values automatically:

#### Excel: `inventory balance` → Web: `/warehouse/inventory`
- **Purpose**: Show current stock levels (calculated from ledger)
- **Key Data**: Current cartons, pallets, units by SKU/batch/warehouse
- **Web Features**: Real-time inventory levels, low stock alerts

#### Excel: `helper` → Web: Internal calculations (not visible)
- **Purpose**: Support calculations with Monday dates and combinations
- **Key Data**: 52 Monday dates, unique warehouse/SKU/batch combos
- **Web Features**: Built into calculation engine

#### Excel: `storage ledger` → Web: `/admin/calculations` + Reports
- **Purpose**: Calculate weekly storage charges based on Monday snapshots
- **Key Data**: End-of-Monday cartons, pallets charged, weekly costs
- **Web Features**: Run storage calculations, view in reports

#### Excel: `calculated costs ledger` → Web: `/admin/calculations` + Reports
- **Purpose**: Calculate expected costs for all activities
- **Key Data**: Storage costs, handling costs, total expected charges
- **Web Features**: Auto-calculate expected costs for reconciliation

### 4. **Reconciliation & Reporting**
Compare expected vs actual:

#### Excel: `invoice reconciliation` → Web: `/finance/reconciliation`
- **Purpose**: Compare invoiced amounts vs calculated expected costs
- **Key Data**: Expected vs invoiced amounts, variances, discrepancies
- **Web Features**: Automatic matching, variance analysis, dispute tracking

## 🔄 Data Flow in Web App

### 1. **Setup Phase**
```
1. Define SKUs (/admin/settings/skus)
   ↓
2. Configure Warehouses (/admin/settings/warehouses)
   ↓
3. Set SKU configs per warehouse (cartons/pallet)
   ↓
4. Define Cost Rates (/admin/settings/rates)
```

### 2. **Daily Operations**
```
1. Record Receives (/warehouse/receive)
   ↓
2. Record Shipments (/warehouse/ship)
   ↓
3. View Current Inventory (/warehouse/inventory)
```

### 3. **Monthly Billing Cycle**
```
1. Run Storage Calculations (/admin/calculations)
   - Calculates Monday snapshots
   - Generates weekly storage charges
   ↓
2. Upload 3PL Invoices (/finance/invoices/new)
   - Enter invoice details
   - Map to billing period (16th-15th)
   ↓
3. Run Reconciliation (/finance/reconciliation)
   - Compare calculated vs invoiced
   - Identify discrepancies
   ↓
4. Generate Reports (/admin/reports)
   - Export reconciliation results
   - Analyze costs by warehouse/SKU
```

## 📋 Key Business Rules

### Storage Calculation
- **Snapshot Day**: Every Monday end-of-day
- **Billing Period**: 16th of month to 15th of next month
- **Pallet Calculation**: ALWAYS round up (10 cartons with 8/pallet = 2 pallets)
- **Rate Application**: Use rate effective on Monday date

### Inventory Rules
- **FIFO**: First In, First Out by batch/lot
- **No Negative**: Cannot ship more than available
- **Batch Tracking**: Optional but recommended

### Invoice Processing
- **Timing**: Invoices arrive 15th-20th of month
- **Period**: Always 16th to 15th billing cycle
- **Categories**: Storage, Handling In, Handling Out, Pick & Pack, etc.

## 🎯 Quick Reference

| Excel Sheet | Web Page | Purpose |
|------------|----------|---------|
| sku master | /admin/settings/skus | Product definitions |
| warehouse config | /admin/settings/warehouses | Pallet configurations |
| cost master | /admin/settings/rates | 3PL pricing |
| inventory ledger | /warehouse/receive, /ship | Daily transactions |
| inventory balance | /warehouse/inventory | Current stock levels |
| storage ledger | /admin/calculations | Weekly storage costs |
| invoice input | /finance/invoices | 3PL invoice entry |
| invoice reconciliation | /finance/reconciliation | Compare expected vs actual |

## 💡 Tips for Users

1. **Daily**: Enter all receives and shipments immediately
2. **Weekly**: Review inventory levels for accuracy
3. **Monthly**: 
   - Run storage calculations after 15th
   - Upload invoices when received
   - Complete reconciliation before month-end
4. **Always**: Keep rates and configurations up-to-date