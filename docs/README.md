# Documentation

Comprehensive documentation for the Warehouse Management System.

## System Overview

This warehouse management system replaces a complex Excel-based solution with a modern web application while maintaining the same proven business logic. The system tracks inventory movements as transactions, calculates storage costs based on weekly Monday stock-takes, and manages billing reconciliation across multiple 3PL warehouses.

### Core Principles
1. **Transaction-Based Ledger**: Every inventory movement is an immutable transaction
2. **Real-time Balances**: Current inventory calculated from transaction history
3. **Weekly Billing Cycles**: Monday stock-takes align with 3PL industry standards
4. **Complete Audit Trail**: All changes tracked, never deleted

## Structure

### /architecture
- **database-schema.sql** - SQL schema definition
- **database-schema-optimized.sql** - Optimized schema with indexes
- **prisma-schema.prisma** - Prisma ORM schema
- **schema-migration.sql** - Migration scripts
- **web-app-architecture.md** - Application architecture overview

### /setup
- **quick-start.md** - Quick setup guide for developers

### /excel-templates
Documentation from the original Excel-based system that defines the business logic:
- **calculated-costs-ledger-monthly.md** - Monthly cost calculations and billing logic
- **excel-setup-guide.md** - Complete guide to the Excel system structure
- **helper-sheet-layout.md** - Excel helper sheet structure for calculations
- **helper-sheet-setup.md** - Setup instructions for Excel calculations
- **implementation-guide (1).md** - Original implementation guide
- **invoice-input-sheet.md** - Invoice data entry format and validation
- **invoice-reconciliation-monthly.md** - Monthly reconciliation process
- **storage-ledger-monthly.md** - Weekly Monday stock-takes and monthly billing
- **storage-ledger-simple.md** - Simplified storage calculation overview

## Key Documents

1. **Architecture Overview** - See `/architecture/web-app-architecture.md`
2. **Database Design** - See `/architecture/database-schema-optimized.sql`
3. **Setup Instructions** - See `/setup/quick-start.md`
4. **Excel System Logic** - See `/excel-templates/` for original business rules
5. **Test Coverage Report** - See `test-coverage-report.md`

## Data Import Status

### Completed
- ✅ Inventory transactions (174 records)
- ✅ SKU master data (8 products)
- ✅ Warehouse configurations (18 records)
- ✅ Cost rates (31 rates)
- ✅ Current inventory balances

### Pending
- ⏳ Storage ledger calculations
- ⏳ Cost calculations
- ⏳ Invoice reconciliation