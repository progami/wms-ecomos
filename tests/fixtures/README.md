# Test Fixtures

This directory contains test data files used in E2E and integration tests.

## Files

- `test-inventory-import.xlsx` - Valid inventory import file for testing
- `invalid-inventory-import.xlsx` - Invalid data for testing validation
- `custom-columns-import.xlsx` - File with custom column headers
- `bulk-transactions.xlsx` - Large file for bulk import testing
- `mixed-valid-invalid.xlsx` - Mix of valid and invalid rows

## Creating Test Files

To create test Excel files programmatically, use the `create-test-fixtures.js` script:

```bash
node tests/fixtures/create-test-fixtures.js
```

## Structure

Each test file follows the expected import format with variations for different test scenarios:

### Standard Import Columns
- Warehouse
- SKU Code
- Batch/Lot
- Cartons
- Type (RECEIVE/SHIP/ADJUST)
- Reference
- Transaction Date

### Custom Column Examples
- Facility Code → Warehouse
- Product Code → SKU Code
- Lot Number → Batch/Lot