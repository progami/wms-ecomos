# Operations Workflow Test Script

## Overview

The test script (`/src/scripts/test-operations-workflow.ts`) is a comprehensive testing tool that generates realistic demo data and verifies the entire operations workflow. It tests all major components including inventory transactions, cost calculations, import/export functionality, and the restock algorithm.

## Features

### 1. Test Data Generation
- Creates 15 test SKUs with various characteristics:
  - High velocity items (150-200 daily sales)
  - Medium velocity items (15-30 daily sales)  
  - Low velocity items (3-5 daily sales)
  - Critical stock items (running low)
  - Out of stock items
  - Bulk items (high volume)
  - Different packaging configurations

### 2. Transaction Generation
- Generates 50+ inventory transactions over the past month
- Transaction types tested:
  - RECEIVE: Initial inventory receipts with random quantities
  - SHIP: Outbound shipments with tracking details
  - TRANSFER: Inter-warehouse transfers
- Each transaction includes:
  - Proper batch/lot tracking
  - Carton and pallet calculations
  - Transportation details (ground/air/ocean)
  - Reference IDs and tracking numbers

### 3. Cost Calculation Testing
- Verifies cost calculation triggers work correctly
- Tests different cost categories:
  - Inbound costs (receiving fees)
  - Outbound costs (shipping fees)
  - Storage costs (pallet storage)
  - Handling costs (special handling)
- Ensures costs are properly calculated and stored

### 4. Import/Export Testing
- Exports inventory data to CSV format
- Verifies export contains correct data
- Tests import by reading exported data
- Validates data consistency
- Cleans up test files after verification

### 5. Restock Algorithm Testing
- Tests restock calculations for all SKUs
- Verifies urgency levels (critical/high/medium/low)
- Calculates:
  - Days of stock remaining
  - Optimal order quantities
  - Suggested cartons and pallets
  - Restock recommendations
- Identifies critical SKUs needing immediate attention

## Usage

### Running the Test

```bash
npm run test:operations
```

Or directly:

```bash
tsx src/scripts/test-operations-workflow.ts
```

### Test Flow

1. **Setup Phase**
   - Creates test user (admin)
   - Creates test warehouse
   - Sets up cost rates
   - Creates 15 test SKUs with configurations

2. **Transaction Generation**
   - Generates ~50 transactions per SKU
   - Creates realistic transaction patterns
   - Includes various batch lots

3. **Testing Phase**
   - Triggers cost calculations
   - Tests import/export functionality
   - Runs restock algorithm analysis

4. **Reporting**
   - Generates detailed test summary report
   - Logs all operations to `dev.log`
   - Creates markdown report with results

5. **Cleanup**
   - Prompts for cleanup confirmation
   - Removes all test data if requested
   - Maintains referential integrity

## Test Results

The script generates:

1. **Log File** (`dev.log`)
   - Detailed execution log
   - Error tracking
   - Performance metrics

2. **Summary Report** (`test-summary-{timestamp}.md`)
   - Test results overview
   - Pass/fail status for each test
   - Detailed results with data
   - Created records summary

3. **Console Output**
   - Real-time progress updates
   - Test status indicators
   - Cleanup prompt

## Error Handling

- Comprehensive try-catch blocks
- Graceful error recovery
- Detailed error logging
- Transaction rollback on failures
- Clean script termination (SIGINT handling)

## Cleanup Function

The cleanup function removes all test data in the correct order:
1. Calculated costs
2. Storage ledger entries
3. Inventory balances
4. Inventory transactions
5. Cost rates
6. Warehouse SKU configs
7. SKUs
8. Warehouses
9. Users

## Sample Output

```
Starting Operations Workflow Test...
[2025-06-22T10:00:00.000Z] [INFO] === STARTING TEST DATA CREATION ===
[2025-06-22T10:00:01.000Z] [INFO] Creating test user...
[2025-06-22T10:00:02.000Z] [INFO] Create Test User: PASS - Test user created successfully
[2025-06-22T10:00:03.000Z] [INFO] Creating test warehouse...
[2025-06-22T10:00:04.000Z] [INFO] Create Test Warehouse: PASS - Test warehouse created successfully
...
[2025-06-22T10:00:30.000Z] [INFO] Test Restock Algorithm: PASS - Restock algorithm tested on 15 SKUs

=== TEST EXECUTION COMPLETED ===
Summary report saved to: test-summary-1719050430000.md
Log file saved to: dev.log

Do you want to clean up the test data? (y/n)
```

## Integration Points

The test script integrates with:
- Prisma ORM for database operations
- Cost calculation service
- Restock algorithm
- Import/export utilities
- Logging system
- File system operations

## Best Practices

1. Always review the summary report
2. Check dev.log for any warnings
3. Clean up test data after testing
4. Don't run in production environments
5. Use for validating new features
6. Monitor performance metrics in logs