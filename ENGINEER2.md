# Engineer 2 Tasks

## Task 1: Reimport Inventory Ledger with All Attributes
- Review Excel file at `/data/Warehouse Management.xlsx` for reference attributes
- Current inventory ledger is missing required attributes that exist in Excel
- Add UI for uploading missing documentation when attributes are incomplete
- Required attributes to extract from Excel:
  - All existing transaction fields
  - Additional metadata from Excel columns
  - Document references and attachments
- Ensure data integrity during reimport process

## Task 2: Define Warehouse-Specific Invoice Templates
- Create invoice template system (strategies) for each warehouse:
  - FMC warehouse template
  - VGlobal warehouse template  
  - 4AS warehouse template
  - Amazon FBA template
- Each template defines how standard transactions (SHIP, RECEIVE, etc.) are treated for billing
- Different warehouses have different billing structures for same transaction types
- Templates should be configurable in the Configuration module
- Link templates to invoice generation in Finance module