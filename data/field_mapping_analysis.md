# Field Mapping Analysis: Inventory Ledger Export to WMS Reference

## Overview
This document maps the fields from the exported inventory ledger to the WMS.xlsx reference file's inventory ledger sheet.

## Field Mapping

### Direct Mappings (Same or Similar Names)

| Exported Field | WMS Reference Field | Mapping Logic |
|----------------|-------------------|---------------|
| Transaction ID | Transaction_ID | Direct mapping |
| Warehouse | Warehouse | Direct mapping |
| Batch/Lot | Shipment | Maps to shipment identifier |
| Type | Transaction_Type | Maps RECEIVE/SHIP to same values |
| Reference | Reference_ID (Email tag) | Maps reference/tracking info |
| Cartons In | Cartons_In | Direct mapping |
| Cartons Out | Cartons_Out | Direct mapping |
| Storage Pallets In | storage_pallets_in | Direct mapping |
| Shipping Pallets Out | shipping_pallets_out | Direct mapping |
| Transaction Date | Timestamp | Date conversion needed |
| SKU Code | SKU | Direct mapping |

### Additional Mappings Considerations

1. **Notes Field**: The WMS reference has a Notes column that could map to multiple fields:
   - Ship Name
   - Container Number
   - Mode of Transportation
   - FBA Tracking ID
   - These could be concatenated into the Notes field

2. **Missing in Export**: 
   - The WMS reference doesn't have separate fields for:
     - Pickup Date
     - Is Reconciled
     - Created At
     - Attachments
     - Created By
   - These are additional metadata in the export

3. **Duplicate/Redundant Fields in Export**:
   - "Warehouse" appears twice
   - "Created By" appears twice
   - These seem to be export formatting issues

## Recommended Mapping Strategy

1. **Primary Fields** (Essential for inventory tracking):
   - Transaction ID → Transaction_ID
   - Warehouse → Warehouse
   - SKU Code → SKU
   - Batch/Lot → Shipment
   - Type → Transaction_Type
   - Reference → Reference_ID
   - Cartons In → Cartons_In
   - Cartons Out → Cartons_Out
   - Storage Pallets In → storage_pallets_in
   - Shipping Pallets Out → shipping_pallets_out
   - Transaction Date → Timestamp

2. **Secondary Fields** (Combine into Notes):
   - Ship Name + Container Number + Mode of Transportation + FBA Tracking ID → Notes
   - Format: "Ship: [Ship Name] | Container: [Container Number] | Mode: [Mode] | FBA: [Tracking ID]"

3. **Metadata Fields** (Not mapped to WMS reference):
   - Pickup Date
   - Is Reconciled
   - Created At
   - Attachments
   - Created By
   - SKU Description (this is looked up from SKU master sheet)

## Data Type Conversions

1. **Dates**: 
   - Export uses date format (e.g., "2024-06-11")
   - WMS uses Excel serial date numbers (e.g., 45429)
   - Conversion needed during import

2. **Boolean**:
   - "Is Reconciled" in export is Yes/No
   - No equivalent in WMS reference

3. **Numbers**:
   - All quantity fields (cartons, pallets) should be numeric
   - Ensure proper parsing during import

## Import Process Recommendations

1. Clean duplicate columns from export
2. Convert date formats to Excel serial numbers
3. Concatenate shipping details into Notes field
4. Map fields according to the primary mappings above
5. Validate SKU codes exist in SKU master sheet
6. Ensure warehouse codes match warehouse config