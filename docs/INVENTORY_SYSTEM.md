# Inventory System Documentation

## Overview

The warehouse management system uses a transaction-based ledger approach, directly mirroring the proven Excel system while adding real-time capabilities and multi-user support.

## Core Components

### 1. Unified Inventory Page (`/warehouse/inventory`)

A single page that combines both transaction history and current balances, accessible via tabs:

#### Transaction Ledger Tab
- **Purpose**: Shows ALL inventory movements (equivalent to Excel's "Inventory Ledger" sheet)
- **Data**: Every RECEIVE, SHIP, ADJUST_IN, ADJUST_OUT transaction
- **Features**:
  - Filter by date range, warehouse, SKU, transaction type
  - Search by SKU, batch/lot, reference number
  - Export to Excel
  - Point-in-time view with running balances

#### Current Balances Tab  
- **Purpose**: Shows current stock levels (equivalent to Excel's calculated "Inventory Balance")
- **Data**: Real-time inventory by Warehouse + SKU + Batch/Lot
- **Features**:
  - Low stock alerts (< 10 cartons)
  - Zero stock indicators
  - Filter by warehouse, stock levels
  - Point-in-time historical views

### 2. Transaction Types

All inventory movements are recorded as one of these types:
- **RECEIVE**: Goods coming into warehouse
- **SHIP**: Goods leaving warehouse  
- **ADJUST_IN**: Positive inventory adjustments
- **ADJUST_OUT**: Negative inventory adjustments

### 3. Business Rules

#### Inventory Tracking
- Every item tracked by unique combination: Warehouse + SKU + Batch/Lot
- Balances calculated as: SUM(cartonsIn) - SUM(cartonsOut)
- No negative inventory allowed - system prevents shipping more than available

#### Data Validation
- Transaction dates cannot be in future
- Transaction dates cannot be older than 1 year
- All quantities must be positive integers
- Maximum 99,999 cartons per transaction
- Duplicate SKU/batch combinations prevented in same transaction
- Duplicate transactions prevented (same reference within 1 minute)

#### Point-in-Time Views
- Select any historical date to see inventory state
- Calculates balances from all transactions up to selected date
- Shows running balance for each transaction
- Useful for month-end reporting and audits

### 4. Storage Calculations

- **Stock-Take Day**: Every Monday at 23:59:59
- **Billing Period**: 16th of previous month to 15th of current month
- **Calculation**: Weekly storage pallets × storage rate
- **Location**: Admin → Storage Ledger (for full access)

### 5. Navigation Structure

#### Admin Users See:
- Inventory Overview (admin view with recent transactions)
- Inventory Ledger (unified page with tabs)
- Receive/Ship Goods
- Storage Ledger
- Cost Calculations
- Full configuration options

#### Staff Users See:
- Inventory Ledger (unified page with tabs)
- Receive/Ship Goods
- Basic reports

### 6. Key Differences from Excel

| Feature | Excel System | Web Application |
|---------|--------------|-----------------|
| Data Entry | Manual in cells | Form-based with validation |
| Calculations | Formulas | Automated on save |
| Multi-user | File locking issues | Real-time collaboration |
| History | All data visible | Filterable views |
| Audit Trail | Manual tracking | Automatic with user/timestamp |
| Performance | Slows with data | Optimized database queries |

### 7. Data Import

The system successfully imported from Excel:
- 174 inventory transactions (May 2024 - May 2025)
- 33 RECEIVE transactions
- 141 SHIP transactions
- Current balances calculated automatically

### 8. Future Enhancements

- Barcode scanning for mobile devices
- Automated stock alerts
- Predictive analytics for stock levels
- API integration with 3PL systems
- Batch operations for bulk updates