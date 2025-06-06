import * as XLSX from 'xlsx';
import { readFileSync } from 'fs';
import { join } from 'path';

// Read the Excel file
const filePath = join(process.cwd(), 'data', 'Warehouse Management.xlsx');
const workbook = XLSX.readFile(filePath);

console.log('=== Excel File Analysis ===\n');

// List all sheet names
console.log('Sheet names:', workbook.SheetNames);

// Analyze each sheet
workbook.SheetNames.forEach(sheetName => {
  console.log(`\n=== Sheet: ${sheetName} ===`);
  
  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
  
  if (data.length > 0) {
    // Get headers (first row)
    const headers = data[0];
    console.log('Column headers:');
    headers.forEach((header, index) => {
      if (header) {
        console.log(`  ${index + 1}. ${header}`);
      }
    });
    
    // Show sample data (first 5 rows)
    console.log(`\nTotal rows: ${data.length - 1}`);
    console.log('Sample data (first 5 rows):');
    for (let i = 1; i < Math.min(6, data.length); i++) {
      console.log(`Row ${i}:`, data[i].slice(0, 10).map(cell => cell || '').join(' | '));
    }
  }
});

// Focus on the main sheet (likely "Inventory Ledger" or similar)
const mainSheet = workbook.Sheets[workbook.SheetNames[0]];
const mainData = XLSX.utils.sheet_to_json(mainSheet);

console.log('\n=== Detailed Analysis of Main Sheet ===');
if (mainData.length > 0) {
  const sampleRow = mainData[0];
  console.log('All attributes found:');
  Object.keys(sampleRow).forEach(key => {
    console.log(`  - ${key}: ${typeof sampleRow[key]}`);
  });
}