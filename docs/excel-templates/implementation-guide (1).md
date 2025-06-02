# Inventory & Billing Reconciliation System - README

Last Updated: June 1, 2025

## 1. Introduction

**Purpose**: This Google Sheets workbook is designed to track inventory across multiple warehouses, calculate expected 3PL (Third-Party Logistics) costs based on activities, and help reconcile monthly invoices received from warehouse partners. Accurate use of this system is crucial for managing inventory levels and ensuring correct billing.

**Overview**: The system uses 10 interconnected Google Sheets. Some are for reference data, some require regular input, some perform automatic calculations, and one provides the final invoice reconciliation report.

## 2. Workflow Overview

**Setup**: 
- Ensure sku master, warehouse config, and cost master are accurate and up-to-date
- Configure helper sheet with Monday dates and combinations
- Set up storage ledger with 4000 rows for future growth

**Daily**: Warehouse staff (or designated person) record ALL movements in inventory ledger immediately.

**Weekly**:
- System automatically calculates storage on Mondays (stock-take day)
- Review storage ledger to ensure no negative inventory values

**Monthly (around 15th - billing close)**:
- Verify all storage weeks are calculated correctly
- Admin/Finance populate calculated costs ledger with expected costs for the billing period (16th to 15th)

**On Invoice Arrival (15th-20th of month)**:
- Admin/Finance input the received 3PL invoice details into invoice input
- Ensure all expected costs for the invoice period are populated in calculated costs ledger
- Review invoice reconciliation sheet to identify and investigate discrepancies

## 3. Sheet Descriptions

### sku master
**Purpose**: Holds all static information about products (SKUs).
**Type**: Configuration/Reference Data
**Key Columns**:
- SKU_Version_ID
- SKU
- Batch_Lot_Identifier
- effective_date
- end_date
- ASIN
- Description
- Pack_Size
- Material
- Unit_Dimensions_cm
- Unit_Weight_KG
- Units_Per_Carton
- Carton_Dimensions_cm
- Carton_Weight_KG
- Packaging_Type
- Notes

**Formulas**: None (Data Input).
**Who Uses**: Setup/Admin (to add/update product info).
**Example Use**: Update when launching new products or if packaging details change. Ensure Batch_Lot_Identifier is "DEFAULT_CONFIG" for general SKU specs, or a specific batch ID if specs differ for that batch.

### warehouse config
**Purpose**: Defines how each warehouse handles each SKU (e.g., cartons per pallet for storage vs. shipping).
**Type**: Configuration/Reference Data
**Key Columns**:
- WH_Config_ID
- warehouse
- SKU
- storage_cartons_per_pallet
- shipping_cartons_per_pallet
- max_stacking_height_cm
- effective_date
- end_date
- notes

**Formulas**: None (Data Input).
**Who Uses**: Setup/Admin.
**Example Use**: Add new rows for new warehouses or SKUs, or update pallet configurations.

### cost master
**Purpose**: Stores all agreed-upon rates and fees charged by 3PL partners, with effective dates.
**Type**: Configuration/Reference Data
**Key Columns**:
- Cost_Rate_ID
- warehouse
- cost_category
- cost_name
- cost_value
- unit_of_measure
- effective_date
- end_date
- notes

**Formulas**: None (Data Input). Accuracy of rates and dates is vital.
**Who Uses**: Setup/Admin.
**Example Use**: Add new lines for rate changes, ensuring effective_date and end_date are correctly set to manage rate validity periods. **CRITICAL**: Include a "Storage cost per pallet / week" cost_name for weekly storage calculations.

### inventory ledger
**Purpose**: Records EVERY SINGLE movement of inventory (in, out, or adjusted). CRITICAL INPUT SHEET.
**Type**: INPUT (with some formula columns for pallet calculation if needed at transaction time)
**Key Columns**:
- A: Timestamp (Manual Input)
- B: Transaction_ID (Manual Input - Unique ID you create)
- C: Warehouse (Manual Input)
- D: SKU (Manual Input)
- E: Shipment (Your Batch/Lot identifier - Manual Input)
- F: Transaction_Type (Manual Input: RECEIVE, SHIP, ADJUST_IN, ADJUST_OUT)
- G: Reference_ID (Email tag) (Manual Input: Container#, Shipment ID, Reason for adjustment)
- H: Cartons_In (Manual Input)
- I: Cartons_Out (Manual Input)
- J: storage_pallets_in (Formula)
- K: shipping_pallets_out (Formula)

**Formulas**:
- Column J (storage_pallets_in) (e.g., J2, drag down): `=IF(H2>0, IFERROR(ROUNDUP(H2 / MAX(1, INDEX(FILTER('warehouse config'!$D:$D, ('warehouse config'!$B:$B=C2) * ('warehouse config'!$C:$C=D2) * ('warehouse config'!$G:$G<=A2) * (('warehouse config'!$H:$H>=A2) + ISBLANK('warehouse config'!$H:$H))),1))), 0), 0)`
- Column K (shipping_pallets_out) (e.g., K2, drag down): `=IF(I2>0, IFERROR(ROUNDUP(I2 / MAX(1, INDEX(FILTER('warehouse config'!$E:$E, ('warehouse config'!$B:$B=C2) * ('warehouse config'!$C:$C=D2) * ('warehouse config'!$G:$G<=A2) * (('warehouse config'!$H:$H>=A2) + ISBLANK('warehouse config'!$H:$H))),1))), 0), 0)`

**Who Uses**: Warehouse Staff (primary for daily entries), Admin (oversight/corrections).
**Example Use**: Record goods arrival (RECEIVE), shipment (SHIP), or cycle count differences (ADJUST_IN/OUT). Accuracy and timeliness are critical.
**CRITICAL**: Initial inventory must be entered as RECEIVE transactions. Never ship more than received.

### inventory balance
**Purpose**: Shows current calculated inventory (cartons, storage pallets, units) for each SKU/Batch/Warehouse.
**Type**: Calculation / Output
**Key Columns**:
- A: Warehouse
- B: SKU
- C: Shipment (Your Batch/Lot identifier)
- D: Current_Carton_Balance (Formula)
- E: Current_Storage_Pallets (Formula)
- F: Current_Unit_Balance (Formula)

Cell K1 (outside the main table) can be used as an optional Balance Date input. If blank, formulas default to TODAY().

**Formulas** (example for row 2, drag down):
- Column D (Current_Carton_Balance): `=LET(bal_date, IF(ISBLANK($K$1), TODAY(), $K$1)+TIME(23,59,59), SUMIFS('inventory ledger'!$H:$H, 'inventory ledger'!$C:$C, A2, 'inventory ledger'!$D:$D, B2, 'inventory ledger'!$E:$E, C2, 'inventory ledger'!$A:$A, "<="&bal_date) - SUMIFS('inventory ledger'!$I:$I, 'inventory ledger'!$C:$C, A2, 'inventory ledger'!$D:$D, B2, 'inventory ledger'!$E:$E, C2, 'inventory ledger'!$A:$A, "<="&bal_date))`
- Column E (Current_Storage_Pallets): `=IFERROR(ROUNDUP(D2 / MAX(1, INDEX(FILTER('warehouse config'!$D:$D, ('warehouse config'!$B:$B=A2) * ('warehouse config'!$C:$C=B2) * ('warehouse config'!$G:$G<=IF(ISBLANK($K$1),TODAY(),$K$1)) * (('warehouse config'!$H:$H>=IF(ISBLANK($K$1),TODAY(),$K$1)) + ISBLANK('warehouse config'!$H:$H))),1))),0)`
- Column F (Current_Unit_Balance): Complex formula using LET to lookup units_per_carton from sku master

**Who Uses**: All staff (Read-Only recommended for most) for checking stock.

### helper (NEW)
**Purpose**: Support sheet containing Monday dates and unique warehouse/SKU/batch combinations for automated storage ledger generation.
**Type**: Configuration/Calculation
**Key Sections**:
- **Monday Dates** (Columns A-B): 52 weeks of Monday dates starting from first Monday of year
- **Active Combinations** (Columns D-F): Unique combinations pulled from inventory ledger
- **Summary Statistics** (Columns H-I): Total rows calculation and counts

**Key Formulas**:
- Cell A3: `=DATE(2025,1,6)` (First Monday)
- Cell A4 and down: `=A3+7` (Each subsequent Monday)
- Cell D3: `=UNIQUE(FILTER('inventory ledger'!C2:E,LEN('inventory ledger'!C2:C)>0))`
- Cell I5: `=H3*I3` (Total Mondays × Total Combinations = Storage Ledger Rows)

**Who Uses**: System Admin for initial setup and monitoring.
**Note**: This sheet enables automatic generation of all storage ledger combinations.

### storage ledger (Performs Monday Stock-Take Calculations)
**Purpose**: Calculates cartons and storage pallets on hand at the end of each Monday to determine weekly storage fees, mapped to monthly billing periods.
**Type**: Calculation / Output
**Headers** (Row 1: A1 to K1):
- A1: SL_ID (Changed from WSC_ID)
- B1: Week_Ending_Date
- C1: Warehouse
- D1: SKU
- E1: Batch_Lot
- F1: Cartons_End_of_Monday
- G1: Storage_Pallets_Charged_Week
- H1: Applicable_Weekly_Storage_Rate
- I1: Calculated_Weekly_Storage_Cost
- J1: Billing_Period_Start (NEW)
- K1: Billing_Period_End (NEW)

**Setup**: Pre-create 4000 rows using formulas that reference helper sheet combinations.

**Formulas** (Starting in Row 2):
- Cell A2: `=IF(B2="","","SL-"&TEXT(B2,"YYYYMMDD")&"-"&C2&"-"&D2&IF(E2<>"","-"&E2,""))`
- Cell B2: `=IFERROR(INDEX(helper!$A$3:$A,ROUNDUP((ROW()-1)/COUNTA(helper!$D$3:$D),0)),"")`
- Cell C2: `=IF(B2="","",INDEX(helper!$D$3:$D,MOD(ROW()-2,COUNTA(helper!$D$3:$D))+1))`
- Cell D2: `=IF(B2="","",INDEX(helper!$E$3:$E,MOD(ROW()-2,COUNTA(helper!$D$3:$D))+1))`
- Cell E2: `=IF(B2="","",INDEX(helper!$F$3:$F,MOD(ROW()-2,COUNTA(helper!$D$3:$D))+1))`
- Cell F2: `=IF(B2="","",SUMIFS('inventory ledger'!$H:$H,'inventory ledger'!$C:$C,C2,'inventory ledger'!$D:$D,D2,'inventory ledger'!$E:$E,E2,'inventory ledger'!$A:$A,"<="&B2+TIME(23,59,59))-SUMIFS('inventory ledger'!$I:$I,'inventory ledger'!$C:$C,C2,'inventory ledger'!$D:$D,D2,'inventory ledger'!$E:$E,E2,'inventory ledger'!$A:$A,"<="&B2+TIME(23,59,59)))`
- Cell G2: `=IF(F2<=0,0,IFERROR(ROUNDUP(F2/INDEX(FILTER('warehouse config'!$D:$D,('warehouse config'!$B:$B=C2)*('warehouse config'!$C:$C=D2)*('warehouse config'!$G:$G<=B2)*(('warehouse config'!$H:$H>=B2)+ISBLANK('warehouse config'!$H:$H))),1)),0))`
- Cell H2: `=IFERROR(INDEX(FILTER('cost master'!$E:$E,('cost master'!$B:$B=C2)*('cost master'!$D:$D="Storage cost per pallet / week")*('cost master'!$G:$G<=B2)*(('cost master'!$H:$H>=B2)+ISBLANK('cost master'!$H:$H))),1),0)`
- Cell I2: `=G2*H2`
- Cell J2: `=IF(DAY(B2)<=15,DATE(YEAR(B2),MONTH(B2)-1,16),DATE(YEAR(B2),MONTH(B2),16))`
- Cell K2: `=IF(DAY(B2)<=15,DATE(YEAR(B2),MONTH(B2),15),DATE(YEAR(B2),MONTH(B2)+1,15))`

**Note**: Monday stock-takes align with 3PL practice. Billing periods run 16th to 15th.
**Who Uses**: Admin/Finance (to verify calculations and feed data into calculated costs ledger).
**Important**: Filter by Cartons_End_of_Monday > 0 to see only active inventory.

### calculated costs ledger
**Purpose**: Calculates the expected cost for every individual billable activity.
**Type**: Calculation + Manual Input Required
**Key Columns & Formulas** (example for row 2, drag down):
- A: Calculated_Cost_ID (Manual: "CCL-1", "CCL-2", etc. or formula `="CCL-"&ROW()-1`)
- B: Transaction_type (Manual Input: "inventory", "storage")
- C: Transaction_ID (Manual Input: Link to 'inventory ledger'!B:B or 'storage ledger'!A:A)
- D: Cost_Rate_ID (Manual Input: Link to 'cost master'!A:A)
- E: Cost_Type (Formula): `=IF(D2="","",VLOOKUP(D2,'cost master'!A:C,3,FALSE))`
- F: Transaction_Date (Formula): `=IF(B2="storage",VLOOKUP(C2,'storage ledger'!A:B,2,FALSE),IF(B2="inventory",VLOOKUP(C2,'inventory ledger'!B:A,2,TRUE),""))`
- G: Billing_Week_Ending (Formula): `=IF(B2="storage",F2,IF(F2="","",F2-WEEKDAY(F2,3)+7))`
- H: Billing_Period_Start (NEW - Formula): `=IF(B2="storage",VLOOKUP(C2,'storage ledger'!A:J,10,FALSE),IF(B2="inventory",IF(DAY(F2)<=15,DATE(YEAR(F2),MONTH(F2)-1,16),DATE(YEAR(F2),MONTH(F2),16)),""))`
- I: Billing_Period_End (NEW - Formula): `=IF(B2="storage",VLOOKUP(C2,'storage ledger'!A:K,11,FALSE),IF(B2="inventory",IF(DAY(F2)<=15,DATE(YEAR(F2),MONTH(F2),15),DATE(YEAR(F2),MONTH(F2)+1,15)),""))`
- J: Warehouse (Formula): `=IF(B2="storage",VLOOKUP(C2,'storage ledger'!A:C,3,FALSE),IF(B2="inventory",VLOOKUP(C2,'inventory ledger'!B:C,2,FALSE),""))`
- K: SKU (Formula): `=IF(B2="storage",VLOOKUP(C2,'storage ledger'!A:D,4,FALSE),IF(B2="inventory",VLOOKUP(C2,'inventory ledger'!B:D,3,FALSE),""))`
- L: Batch_Lot (Formula): `=IF(B2="storage",VLOOKUP(C2,'storage ledger'!A:E,5,FALSE),IF(B2="inventory",VLOOKUP(C2,'inventory ledger'!B:E,4,FALSE),""))`
- M: Reference_ID_Source (Formula): `=IF(B2="storage","Storage Calc: "&C2,IF(B2="inventory",VLOOKUP(C2,'inventory ledger'!B:G,6,FALSE),""))`
- N: Quantity_Charged (Formula for storage, Manual for inventory): `=IF(B2="storage",VLOOKUP(C2,'storage ledger'!A:G,7,FALSE),"")`
- O: Applicable_Rate (Formula): `=IF(D2="",0,INDEX(FILTER('cost master'!E:E,('cost master'!A:A=D2)*('cost master'!G:G<=F2)*(('cost master'!H:H>=F2)+ISBLANK('cost master'!H:H))),1))`
- P: Calculated_Cost (Formula): `=IF(OR(N2="",O2=""),0,N2*O2)`
- Q: Cost_Adjustment_Value (Manual Input: Optional, for overrides)
- R: Final_Expected_Cost (Formula): `=P2+IF(Q2="",0,Q2)`
- S: Cost_Name_From_Master (NEW - Formula): `=IF(D2="","",VLOOKUP(D2,'cost master'!A:D,4,FALSE))`

**Who Uses**: Admin/Finance.
**Note**: Column order has shifted to accommodate billing period columns.

### invoice input
**Purpose**: Log lines from actual 3PL invoices.
**Type**: INPUT
**Key Columns**:
- Invoice_Received_Date
- Invoice_Number
- Warehouse
- Billing_Period_Start (Should be 16th of previous month)
- Billing_Period_End (Should be 15th of current month)
- Cost_Category
- Cost_Name
- Invoiced_Quantity
- Invoiced_Amount
- Notes

**Formulas**: None.
**Who Uses**: Finance/Admin.
**Note**: Billing periods must match format used throughout system (16th to 15th).

### invoice reconciliation
**Purpose**: Compares expected costs against invoiced amounts.
**Type**: Output / Report
**Key Columns & Formulas** (example for row 2):
- A: Invoice_Number
- B: Warehouse
- C: Billing_Period_Start
- D: Billing_Period_End
- E: Cost_Category
- F: Cost_Name
- G: Expected_Amount (Formula)
- H: Invoiced_Amount (Formula)
- I: Difference (Formula)
- J: Status (Formula)
- K: Notes (Manual input)

**Formulas**:
- Column G (Expected_Amount): `=SUMIFS('calculated costs ledger'!R:R,'calculated costs ledger'!J:J,B2,'calculated costs ledger'!E:E,E2,'calculated costs ledger'!S:S,F2,'calculated costs ledger'!H:H,C2,'calculated costs ledger'!I:I,D2)`
- Column H (Invoiced_Amount): `=SUMIFS('invoice input'!I:I,'invoice input'!B:B,A2,'invoice input'!C:C,B2,'invoice input'!F:F,E2,'invoice input'!G:G,F2,'invoice input'!D:D,C2,'invoice input'!E:E,D2)`
- Column I (Difference): `=G2-H2`
- Column J (Status): `=IF(ABS(I2)<0.01,"Match",IF(I2<0,"Overbilled by 3PL","Underbilled by 3PL"))`

**Who Uses**: Finance/Admin.
**Note**: Updated to use billing periods and new Cost_Name_From_Master column (S) in calculated costs ledger.

## 4. Instructions for Specific Roles

### Warehouse Staff
- Accurately and promptly add new rows to inventory ledger for every RECEIVE, SHIP, or ADJUSTMENT
- Ensure batch/lot identifiers are consistent
- Never ship more inventory than received

### Finance / Admin
- Maintain cost master with accurate rates and dates
- After month close (15th), populate calculated costs ledger for all storage weeks in the billing period
- Enter invoice details into invoice input when received
- Review invoice reconciliation, investigate discrepancies

### System Manager
- Initial setup including helper sheet configuration
- Master data maintenance
- Monitor for negative inventory in storage ledger
- Troubleshoot formulas
- Train users

## 5. Important Notes

- **Accuracy is Paramount**: Especially batch/lot consistency
- **Timeliness**: Enter data promptly
- **Do Not Delete Rows**: Use correcting entries (ADJUST_IN/OUT)
- **Consistency**: Use consistent naming across all sheets
- **Formulas**: Storage ledger now uses simpler INDEX/MOD formulas instead of complex dynamic formula
- **Pre-allocated Rows**: Storage ledger has 4000 rows for future growth
- **Locale**: Formulas provided use commas (,) as separators (US locale). Adjust if your locale uses semicolons (;)

## 6. Handling Deviations

### Inventory Deviations
- Use ADJUST_IN/ADJUST_OUT in inventory ledger
- Use Reference_ID for reasons
- Never delete transactions - add corrections

### Billing Deviations
1. Invoice reconciliation identifies differences
2. Investigate root cause
3. If accepting 3PL charge: In calculated costs ledger, use the Cost_Adjustment_Value column (Q) to enter the difference
4. Final_Expected_Cost (column R) will update automatically
5. Invoice reconciliation sums Final_Expected_Cost

## 7. Troubleshooting Common Issues

### Negative Inventory in Storage Ledger
- **Cause**: Shipping more than received for a SKU/Batch/Warehouse
- **Fix**: Add missing RECEIVE transactions or correct batch identifiers

### Formula Parse Errors
- Check parentheses, commas (for US locale), valid function names
- No comments like /*...*/ inside formulas

### #REF! Errors
- Broken links (deleted sheets, rows, columns)
- Check sheet names match exactly

### #N/A Errors
- Lookup value not found
- Check for typos in SKU, Batch, Warehouse names

### Zero Storage Costs
- Verify "Storage cost per pallet / week" exists in cost master for each warehouse
- Check warehouse config has storage_cartons_per_pallet values

### Incorrect Calculations
- Trace data back through the sheets
- Verify inventory ledger entries are complete
- Check effective dates in master data

### Performance
- With 4000 rows in storage ledger, filtering is recommended
- Filter Cartons_End_of_Monday > 0 to show only active inventory

## 8. Monthly Billing Cycle Timeline

**Throughout Month**: Daily inventory transactions
**Every Monday**: Automatic stock-take calculation
**15th**: Month closes at 3PL
**16th-20th**: Invoice arrives
**Upon Receipt**: Enter invoice, run reconciliation, investigate differences

## 9. Key Formulas Reference

For detailed formulas, see each sheet description above. Key patterns:
- **VLOOKUP**: Links between sheets
- **SUMIFS**: Conditional sums for inventory calculations
- **INDEX/FILTER**: Date-sensitive lookups for config data
- **INDEX/MOD/ROUNDUP**: Combination generation in storage ledger
- **IF(DAY()<=15...)**: Billing period assignment logic