# Warehouse Management System - Agent Coordination

## Current Sprint: Finance Module - Invoice Reconciliation Rebuild
**Goal**: Fix broken reconciliation system to properly match warehouse invoices against calculated costs
**Timeline**: Started - Jan 4, 2025

## Critical System Issue Identified

### Invoice Reconciliation is Fundamentally Broken
The reconciliation API references a non-existent `CalculatedCost` table. The system needs to be rebuilt to:

1. **Calculate expected costs from actual sources:**
   - Storage costs from `StorageLedger` (weekly snapshots)
   - Activity costs from `InventoryTransaction` × `CostRate`

2. **Match against invoice line items properly:**
   - Storage charges vs StorageLedger aggregations
   - Transaction charges vs calculated activity costs
   - Handle missing/extra charges

3. **Implement proper dispute/acceptance workflow:**
   - Accept invoice → Create payment record
   - Dispute → Track dispute reason and resolution
   - Partial acceptance → Accept some line items, dispute others

## Active Tasks

### Task: Update Prisma Schema for New Tables
- **Assigned To**: Finance Agent (Agent 2)
- **Status**: In Progress
- **Dependencies**: Database migration created
- **Notes**: Need to update schema.prisma to match new migrations
- **Files Modified**: 
  - /prisma/schema.prisma
- **Last Updated**: Jan 4, 2025 by Agent 2

### Task: Test Reconciliation Workflow End-to-End
- **Assigned To**: Finance Agent (Agent 2)
- **Status**: Pending
- **Dependencies**: Prisma schema update
- **Notes**: Test complete flow: invoice upload → reconciliation → dispute/accept
- **Last Updated**: Jan 4, 2025 by Agent 2

### Task: Build Financial Dashboard
- **Assigned To**: Finance Agent (Agent 2)
- **Status**: Pending
- **Dependencies**: Reconciliation workflow completion
- **Notes**: Display reconciliation status, payment tracking, dispute metrics
- **Files to Create**: 
  - /src/app/finance/dashboard/components/
- **Last Updated**: Jan 4, 2025 by Agent 2

## Inter-Agent Messages

### Finance → Operations (Jan 4, 2025)
I need to understand the data flow for cost calculations:
1. How often is StorageLedger updated? (I see it's weekly on Mondays)
2. Are all transaction types in InventoryTransaction billable? 
3. Is there a mapping between transaction types and cost categories?

### Finance → All Agents (Jan 4, 2025)
Major issue discovered: The invoice reconciliation system is broken due to missing CalculatedCost table. I'm rebuilding the entire reconciliation workflow to properly calculate costs from StorageLedger and InventoryTransaction data.

This will affect:
- Invoice processing workflows
- Financial reporting accuracy
- Warehouse billing disputes

## Understanding of Current System

### Invoice Flow
1. Warehouse sends invoice with line items (storage, inbound, outbound, accessorial)
2. System should calculate expected costs from:
   - StorageLedger: Weekly storage snapshots × rates
   - InventoryTransaction: Activity counts × rates
3. Reconciliation compares invoice vs calculated costs
4. Discrepancies can be disputed or accepted

### Ledger System
- **StorageLedger**: Weekly snapshots of inventory levels, calculates storage costs
- **InventoryLedger**: Immutable transaction history (cannot be modified)
- **InventoryTransaction**: Source of activity-based billing (receive, ship, etc.)

### Cost Categories
- Storage (from StorageLedger)
- Container (inbound)
- Carton (inbound/outbound)
- Pallet (inbound/outbound)
- Unit (picking)
- Shipment (outbound)
- Accessorial (special handling)

## Planned Tasks
- Create database migration for payment tracking
- Add audit trail for invoice disputes
- Implement cost variance alerts
- Build financial dashboards with accurate data
- Add batch invoice processing

## Completed Tasks
- ✓ Deep analysis of invoice reconciliation workflow (Finance Agent)
- ✓ Identified core system issues (Finance Agent)
- ✓ Created comprehensive fix plan (Finance Agent)
- ✓ Created cost calculation service (Finance Agent)
  - Built cost aggregation from StorageLedger and InventoryTransaction
  - Created API endpoint for calculated costs
- ✓ Rebuilt reconciliation API (Finance Agent)
  - Fixed non-existent CalculatedCost table reference
  - Now properly matches invoices against actual ledger data
- ✓ Implemented invoice acceptance workflow (Finance Agent)
  - Tracks payment method, reference, and date
  - Supports partial acceptance of line items
- ✓ Implemented invoice dispute workflow (Finance Agent)
  - Tracks dispute reasons per line item
  - Stores suggested amounts for disputed items
- ✓ Created database migration (Finance Agent)
  - Added payment tracking fields
  - Created dispute tracking tables
  - Added notification system tables