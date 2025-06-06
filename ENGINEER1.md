# Engineer 1 Tasks

## Task 1: Move Storage Ledger to Finance Module
- Move storage ledger functionality from `/src/app/operations/` to `/src/app/finance/`
- Update all imports and routes accordingly
- Storage ledger should be part of the overall cost management in finance

## Task 2: Create Comprehensive Cost Ledger
- Build a unified cost ledger in finance module that includes:
  - Storage costs (weekly calculations)
  - Container unloading fees
  - Pallet handling charges
  - Carton fees
  - Unit pick/pack charges
  - Shipment freight costs
  - Accessorial charges
- Each cost entry must link back to original transactions
- Week-by-week breakdown with proper aggregation
- Should replace the separate storage ledger with integrated cost view

## Task 3: Handle Pallet Variance
- Implement functionality to track and reconcile differences between:
  - Inventory ledger pallet counts
  - Actual warehouse pallet counts
- Create adjustment workflows for pallet discrepancies
- Add reporting for pallet variance analysis
- Consider side effects on billing and storage calculations