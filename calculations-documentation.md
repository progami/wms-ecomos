# Calculations Page Documentation

## Overview
The Calculations page is a system administration tool that allows admins to manually trigger important warehouse calculations. This page is accessible only to system administrators and finance administrators.

## Purpose
The Calculations page serves two primary functions:

### 1. Inventory Balance Calculation
- **What it does**: Updates current inventory balances by summing all transactions
- **When to use**: After importing new transaction data or when inventory counts seem off
- **Process**:
  - Sums all inventory transactions by SKU/batch
  - Calculates current carton counts
  - Updates pallet requirements
  - Converts to unit quantities

### 2. Storage Ledger Generation
- **What it does**: Generates weekly storage charges for a specific billing period
- **When to use**: At the end of each billing period or when preparing invoices
- **Process**:
  - Takes Monday snapshots of inventory levels
  - Calculates pallets used per week
  - Applies weekly storage rates
  - Generates billing period charges
- **Parameters**: Requires year and month selection

## Access & Permissions
- Only accessible to users with `system_admin` or `finance_admin` roles
- Located at `/admin/calculations` in the navigation menu

## Technical Details
- Calculations are performed server-side via the `/api/calculations` endpoint
- Results are stored in the database for reporting and billing purposes
- All calculations are idempotent (can be run multiple times safely)

## Best Practices
1. Run inventory balance calculation after any bulk data import
2. Generate storage ledger at the end of each month for billing
3. Review calculation results in the Reports section after running