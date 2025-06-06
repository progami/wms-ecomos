import * as XLSX from 'xlsx';
import { readFileSync } from 'fs';
import { join } from 'path';

// Read the Excel file
const filePath = join(process.cwd(), 'data', 'Warehouse Management.xlsx');
const workbook = XLSX.readFile(filePath);

// Focus on inventory ledger sheet
const inventorySheet = workbook.Sheets['inventory ledger'];
const inventoryData = XLSX.utils.sheet_to_json(inventorySheet, { header: 1 }) as any[][];

console.log('=== INVENTORY LEDGER COMPARISON ===\n');

// Get Excel headers
const excelHeaders = inventoryData[0].filter(h => h);
console.log('Excel Columns:');
excelHeaders.forEach((header, idx) => {
  console.log(`  ${idx + 1}. ${header}`);
});

// Database fields from InventoryTransaction model
const dbFields = [
  'id',
  'transactionId',
  'warehouseId',
  'skuId', 
  'batchLot',
  'transactionType',
  'referenceId',
  'cartonsIn',
  'cartonsOut',
  'storagePalletsIn',
  'shippingPalletsOut',
  'notes',
  'transactionDate',
  'pickupDate',
  'isReconciled',
  'createdAt',
  'createdById',
  'shippingCartonsPerPallet',
  'storageCartonsPerPallet',
  'shipName',
  'containerNumber',
  'attachments'
];

console.log('\nDatabase Fields:');
dbFields.forEach(field => {
  console.log(`  - ${field}`);
});

// Map Excel columns to DB fields
const columnMapping = {
  'Timestamp': 'transactionDate',
  'Transaction_ID': 'transactionId',
  'Warehouse': 'warehouseId',
  'SKU': 'skuId',
  'Shipment': 'batchLot',
  'Transaction_Type': 'transactionType',
  'Reference_ID (Email tag)': 'referenceId',
  'Cartons_In': 'cartonsIn',
  'Cartons_Out': 'cartonsOut',
  'storage_pallets_in': 'storagePalletsIn',
  'shipping_pallets_out': 'shippingPalletsOut',
  'Notes': 'notes'
};

console.log('\n=== MISSING ATTRIBUTES ===');
console.log('\nColumns in Excel but not mapped to database:');
const mappedExcelColumns = Object.keys(columnMapping);
const unmappedColumns = excelHeaders.filter(h => !mappedExcelColumns.includes(h));
unmappedColumns.forEach(col => {
  console.log(`  - ${col}`);
});

console.log('\nDatabase fields not populated from Excel:');
const mappedDbFields = Object.values(columnMapping);
const unmappedDbFields = dbFields.filter(f => !mappedDbFields.includes(f) && 
  !['id', 'createdAt', 'createdById', 'pickupDate', 'isReconciled'].includes(f));
unmappedDbFields.forEach(field => {
  console.log(`  - ${field}`);
});

// Analyze sample data to identify patterns
console.log('\n=== SAMPLE DATA ANALYSIS ===');
console.log('\nFirst 5 rows of data:');
for (let i = 1; i < Math.min(6, inventoryData.length); i++) {
  const row = inventoryData[i];
  console.log(`\nRow ${i}:`);
  excelHeaders.forEach((header, idx) => {
    if (row[idx] !== undefined && row[idx] !== '') {
      console.log(`  ${header}: ${row[idx]}`);
    }
  });
}

// Check for document references
console.log('\n=== DOCUMENT REFERENCES ===');
let hasDocumentReferences = false;
for (let i = 1; i < inventoryData.length; i++) {
  const row = inventoryData[i];
  // Check if there are any columns that might contain document references
  for (let j = 12; j < row.length; j++) {
    if (row[j] && typeof row[j] === 'string' && row[j].length > 0) {
      hasDocumentReferences = true;
      console.log(`Found potential document reference in row ${i}, column ${j}: ${row[j]}`);
      break;
    }
  }
  if (hasDocumentReferences) break;
}

// Additional analysis for other sheets
console.log('\n=== OTHER RELEVANT SHEETS ===');

// SKU Master
const skuSheet = workbook.Sheets['sku master'];
const skuData = XLSX.utils.sheet_to_json(skuSheet, { header: 1 }) as any[][];
console.log('\nSKU Master columns:');
if (skuData.length > 0) {
  skuData[0].forEach((col, idx) => {
    if (col) console.log(`  ${idx + 1}. ${col}`);
  });
}

// Warehouse Config
const warehouseConfigSheet = workbook.Sheets['warehouse config'];
const warehouseConfigData = XLSX.utils.sheet_to_json(warehouseConfigSheet, { header: 1 }) as any[][];
console.log('\nWarehouse Config columns:');
if (warehouseConfigData.length > 0) {
  warehouseConfigData[0].forEach((col, idx) => {
    if (col) console.log(`  ${idx + 1}. ${col}`);
  });
}