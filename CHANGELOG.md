# Changelog

All notable changes to the Warehouse Management System will be documented in this file.

## [Unreleased] - 2025-06-03

### Added
- **Pallet Columns in Inventory Ledger**
  - Added "Pallets In" column showing actual storage pallets received
  - Added "Pallets Out" column showing actual shipping pallets sent
  - Displays user-entered pallet values from transactions

- **Storage Ledger Tab**
  - New third tab in inventory page for future storage cost tracking
  - Information panel explaining billing differences:
    - Regular warehouses: Weekly charges based on Monday inventory counts (23:59:59)
    - Amazon FBA: Monthly charges based on average daily inventory volume
  - Placeholder for upcoming storage cost reconciliation features

- **Sortable Date Column**
  - Inventory ledger date column is now clickable for sorting
  - Visual arrow indicators show current sort direction
  - Default sort: Latest transactions first (descending)
  - Toggle between ascending/descending with single click

- **Immutable Ledger Implementation**
  - PostgreSQL triggers prevent editing/deleting inventory transactions
  - Visual notice in UI explaining immutability
  - Corrections must be made via ADJUST_IN/ADJUST_OUT transactions
  - Maintains permanent audit trail for compliance

- **Variance Tracking**
  - System tracks differences between actual and calculated pallet counts
  - Stores variance notes when discrepancies detected
  - Helps identify data entry errors or configuration issues

### Changed
- **Naming Consistency**
  - Standardized on "Inventory Ledger" throughout the application
  - Previously mixed usage of "Transaction Ledger" and "Transaction History"
  
- **Currency Display**
  - All monetary values now display in GBP (£)
  - Fixed inconsistent currency symbols throughout UI
  - Amazon storage rates properly shown in £/cubic foot/month

### Removed
- **Calculations Page**
  - Removed from admin navigation menu
  - Inventory balances calculated in real-time from transactions
  - Storage ledger functionality moved to inventory page tab

- **Import Scripts**
  - Removed all Excel import scripts (data already imported)
  - Removed test data generation scripts
  - Cleaned up temporary and debug scripts
  - Repository now production-ready

### Fixed
- **Test Data Contamination**
  - Removed all AMZN-CS test transactions
  - System now only contains real Excel data (174 transactions)
  
- **API Protection**
  - Added 405 Method Not Allowed for PUT/DELETE on transactions
  - Enforces immutability at API level
  
- **TypeScript Errors**
  - Fixed duplicate variable declarations
  - Resolved syntax errors in component structure

## [1.0.0] - 2025-05-15

### Initial Release
- Multi-warehouse inventory management
- Two-role system (Admin/Staff)
- Real-time inventory tracking
- Financial management and reconciliation
- Amazon FBA integration
- Comprehensive reporting system