#!/usr/bin/env python3
import pandas as pd
import openpyxl
import json

# Load the Excel file
file_path = '/Users/jarraramjad/Documents/warehouse_management/Warehouse Management.xlsx'

# Get all sheet names
wb = openpyxl.load_workbook(file_path, read_only=True)
sheet_names = wb.sheetnames
print(f"Total sheets: {len(sheet_names)}")
print(f"Sheet names: {sheet_names}\n")

# Analyze each sheet
for sheet_name in sheet_names:
    print(f"\n{'='*60}")
    print(f"Sheet: {sheet_name}")
    print('='*60)
    
    try:
        # Read sheet
        df = pd.read_excel(file_path, sheet_name=sheet_name)
        
        # Basic info
        print(f"Shape: {df.shape[0]} rows x {df.shape[1]} columns")
        
        # Column names
        print(f"\nColumns ({len(df.columns)}):")
        for i, col in enumerate(df.columns):
            print(f"  {i+1}. {col}")
        
        # Sample data (first 5 rows)
        if len(df) > 0:
            print(f"\nFirst 5 rows:")
            print(df.head().to_string(index=False, max_cols=10))
            
        # Data types
        print(f"\nData types:")
        for col, dtype in df.dtypes.items():
            print(f"  {col}: {dtype}")
            
    except Exception as e:
        print(f"Error reading sheet: {e}")

wb.close()