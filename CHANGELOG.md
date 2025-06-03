# Changelog

All notable changes to the Warehouse Management System will be documented in this file.

## [1.3.0] - 2025-06-03

### Added
- **Documentation Updates**
  - Comprehensive cleanup of all documentation files
  - Fixed all outdated script references
  - Updated architecture documentation to reflect actual implementation

### Changed
- **Amazon Integration Page**
  - Changed "Difference" column to "Total" showing sum of all locations
  - Shows all SKUs including those with zero stock
  - Visual indicators for zero stock items
  - Added combined total summary card

### Removed
- **Amazon FBA UK Warehouse**
  - Completely removed from system including 4 associated cost rates
  - Updated all references throughout the application
- **Import Functionality**
  - Removed all import buttons and references
  - Removed broken import API routes
  - Updated documentation to reflect removal
- **Orphaned Pages**
  - Removed unused calculations page
  - Removed broken import page
  - Cleaned up associated API routes

### Fixed
- React hooks order error in Amazon integration page
- Removed references to non-existent scripts in documentation
- Fixed test suite to remove references to deleted pages

## [1.2.0] - 2025-06-03

### Added
- **Inventory Ledger Enhancements**
  - Pickup date tracking for all transactions
  - Reconciliation status to track unconfirmed pickup dates
  - Chronological transaction enforcement (prevents backdating)
  - Database triggers to maintain ledger integrity

- **Ship Goods Page Updates**
  - Source warehouse selection dropdown
  - Amazon carrier options (Amazon Partnered Carrier UPS, Amazon Freight)
  - FBA Tracking ID field
  - Automatic total cartons calculation display

- **Receive Goods Page Updates**  
  - Explicit document attachment categories:
    - Packing List
    - Commercial Invoice
    - Delivery Note
    - Cube Master Stacking Style (highlighted in blue)
    - Additional documents section
  - Changed "Reference Number" to "PI / CI / PO Number"

### Changed
- Amazon FBA UK warehouse excluded from all operational pages
- Warehouse dropdowns now show only operational warehouses (FMC, VGlobal, 4AS)
- Amazon integration limited to admin Amazon page and cost rates only

### Security
- Added database-level enforcement of chronological transaction order
- Immutable ledger triggers prevent transaction manipulation

## [1.1.0] - 2025-06-02

### Storage Ledger Features
- **Full Storage Ledger Implementation**
  - Calculates weekly storage costs based on Monday 23:59:59 CT inventory snapshots
  - Shows storage costs per SKU with cost share percentages
  - Displays ISO week numbers (W1, W2, etc.) for easy reference
  - Expandable rows to view SKU-level details within each snapshot

- **Monthly Aggregation View**
  - Toggle between Weekly and Monthly views
  - Monthly view aggregates by billing periods (16th to 15th)
  - Shows average pallets per week and total costs for billing period
  - Displays which weeks are included in each billing period

- **Enhanced Date Selection**
  - Quick date range buttons: Last 30 days, Last 90 days, Last 6 months, Year to date, All time
  - Improved date picker UI with floating labels and visual arrows
  - Responsive layout that works on all screen sizes

- **Export Functionality**
  - Export storage ledger data to CSV
  - Includes week numbers, cost shares, and all relevant details
  - Supports both weekly and monthly views

### UI/UX Improvements
- **Navigation Updates**
  - Renamed "Inventory Ledger" to "Ledger" in sidebar for conciseness
  
- **Performance Fixes**
  - Fixed page refresh issues when clicking UI elements
  - Added proper event handling to prevent form submissions
  - Optimized data fetching with debouncing and memoization
  - Fixed React hook initialization errors
  - Fixed tab switching blink/refresh issue for inventory ledger and current balances tabs
    - Implemented CSS-based tab switching instead of conditional rendering
    - Added data caching to prevent unnecessary re-fetches when switching tabs
    - Separated initial loading state from tab switching to maintain smooth transitions

- **Admin Credentials**
  - Updated admin login for easier testing:
    - Email: admin@admin.com
    - Password: admin

### Technical Improvements
- **API Enhancements**
  - Storage ledger API now fetches all historical transactions for accurate calculations
  - Uses inventory balance table for pallet configurations
  - Falls back to warehouse SKU configs when needed
  - Improved error handling and logging

- **Dashboard Updates**
  - Fixed dashboard showing hardcoded values instead of real data
  - Created dashboard stats API to calculate actual metrics
  - Implemented historical storage cost calculations
  - Dashboard now shows real inventory counts, storage costs, and invoice totals

- **Code Quality**
  - Fixed TypeScript errors in storage ledger components
  - Proper async/await handling in API routes
  - Consistent button types to prevent accidental form submissions

## [Previous] - 2025-06-03

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