# Data Directory

This directory contains sample data files and Excel templates for system setup and testing.

## Files

### Warehouse Management.xlsx
- **Purpose**: Master Excel template for system data
- **Sheets**:
  - SKUs: Product master data
  - Rates: Cost rate configurations
  - Warehouse Configs: Per-warehouse settings
- **Usage**: Import via Admin > Import Excel

### inventory_ledger_restructured.xlsx
- **Purpose**: Sample inventory transactions
- **Contents**: Historical transaction data
- **Usage**: Import via scripts/import-inventory-ledger.ts

## Excel Template Structure

### SKUs Sheet
- SKU Code (required)
- Description
- Category
- Handling requirements

### Rates Sheet
- Rate Type
- Amount
- Currency
- Effective dates
- Warehouse (optional)

### Warehouse Configs Sheet
- Warehouse Code
- Configuration Type
- Configuration Value
- Effective dates

## Import Process

1. Prepare Excel file following template structure
2. Navigate to Admin > Import Excel
3. Select file and sheet to import
4. Review validation results
5. Confirm import

## Data Guidelines

- Always backup before importing
- Validate data formats match templates
- Check for duplicate entries
- Ensure referential integrity
- Test with small datasets first

## Sample Data

Sample files demonstrate:
- Proper formatting
- Required vs optional fields
- Relationship between sheets
- Common use cases