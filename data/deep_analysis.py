#!/usr/bin/env python3
import pandas as pd
import json
from datetime import datetime

# Load the Excel file
file_path = '/Users/jarraramjad/Documents/warehouse_management/Warehouse Management.xlsx'

# Read key sheets
print("=== SYSTEM OVERVIEW ===\n")

# 1. SKU Master
sku_df = pd.read_excel(file_path, sheet_name='sku master')
print(f"1. SKU Master: {len(sku_df)} SKUs")
print(f"   SKUs: {', '.join(sku_df['SKU'].unique())}")
print(f"   Key fields: SKU, Units_Per_Carton, Carton_Weight_KG")

# 2. Warehouse Config
wh_config_df = pd.read_excel(file_path, sheet_name='warehouse config')
print(f"\n2. Warehouse Config: {len(wh_config_df)} configurations")
print(f"   Warehouses: {', '.join(wh_config_df['warehouse'].unique())}")
print(f"   Key fields: warehouse, SKU, storage_cartons_per_pallet, shipping_cartons_per_pallet")

# 3. Cost Master
cost_df = pd.read_excel(file_path, sheet_name='cost master')
print(f"\n3. Cost Master: {len(cost_df)} cost rates")
print(f"   Warehouses: {', '.join(cost_df['warehouse'].unique())}")
print(f"   Cost categories: {', '.join(cost_df['cost_category'].unique())}")
print(f"   Sample costs:")
for _, row in cost_df.head(5).iterrows():
    print(f"     - {row['cost_name']}: {row['cost_value']} per {row['unit_of_measure']}")

# 4. Inventory Ledger
inv_ledger_df = pd.read_excel(file_path, sheet_name='inventory ledger')
print(f"\n4. Inventory Ledger: {len(inv_ledger_df)} transactions")
print(f"   Transaction types: {', '.join(inv_ledger_df['Transaction_Type'].dropna().unique())}")
print(f"   Date range: {inv_ledger_df['Timestamp'].min()} to {inv_ledger_df['Timestamp'].max()}")
print(f"   Total cartons in: {inv_ledger_df['Cartons_In'].sum()}")
print(f"   Total cartons out: {inv_ledger_df['Cartons_Out'].sum()}")

# 5. Inventory Balance
inv_balance_df = pd.read_excel(file_path, sheet_name='inventory balance')
print(f"\n5. Inventory Balance: {len(inv_balance_df)} SKU/Batch combinations")
print(f"   Non-zero balances: {len(inv_balance_df[inv_balance_df['Current_Carton_Balance'] > 0])}")

# 6. Storage Ledger
storage_df = pd.read_excel(file_path, sheet_name='storage ledger')
print(f"\n6. Storage Ledger: {len(storage_df)} weekly records")
print(f"   Date range: {storage_df['Week_Ending_Date'].min()} to {storage_df['Week_Ending_Date'].max()}")
print(f"   Total storage cost: ${storage_df['Calculated_Weekly_Storage_Cost'].sum():,.2f}")

# 7. Helper Sheet
helper_df = pd.read_excel(file_path, sheet_name='helper')
print(f"\n7. Helper Sheet:")
print(f"   Monday dates: {len(helper_df[helper_df.iloc[:, 0].notna()])} weeks")
print(f"   Active combinations: {len(helper_df[helper_df.iloc[:, 3].notna()]) - 1} combinations")

print("\n=== KEY INSIGHTS ===")
print("\n1. System tracks inventory for multiple warehouses with SKU-level detail")
print("2. Uses batch/lot tracking (shipment numbers)")
print("3. Calculates weekly storage costs based on Monday stock-takes")
print("4. Billing periods run from 16th to 15th of each month")
print("5. Cost structure includes:")
print("   - Container handling charges")
print("   - Carton/pallet handling")
print("   - Weekly storage fees")
print("   - Outbound shipping costs")

print("\n=== CURRENT STATE ===")
# Check for empty sheets
calc_costs_df = pd.read_excel(file_path, sheet_name='calculated costs ledger')
invoice_input_df = pd.read_excel(file_path, sheet_name='invoice input')
print(f"\nCalculated Costs Ledger: {'EMPTY - Needs to be populated' if len(calc_costs_df) == 0 else f'{len(calc_costs_df)} records'}")
print(f"Invoice Input: {'EMPTY - No invoices entered yet' if len(invoice_input_df) == 0 else f'{len(invoice_input_df)} records'}")

print("\n=== DATA FLOW ===")
print("1. SKU Master + Warehouse Config → Define product and storage rules")
print("2. Cost Master → Define pricing for all activities")
print("3. Inventory Ledger → Record all movements (RECEIVE, SHIP, ADJUST)")
print("4. Storage Ledger → Auto-calculate weekly storage (every Monday)")
print("5. Calculated Costs Ledger → Expected costs for billing period")
print("6. Invoice Input → Actual invoice from 3PL")
print("7. Invoice Reconciliation → Compare expected vs actual")