import * as XLSX from 'xlsx';
import { join } from 'path';

// Read the Excel file
const filePath = join(process.cwd(), 'data', 'Warehouse Management.xlsx');
const workbook = XLSX.readFile(filePath);

// Focus on inventory ledger sheet
const inventorySheet = workbook.Sheets['inventory ledger'];
const inventoryData = XLSX.utils.sheet_to_json(inventorySheet, { header: 1 }) as any[][];

console.log('=== INVENTORY LEDGER DETAILED ANALYSIS ===\n');

// Get all headers including empty ones
const headers = inventoryData[0];
console.log('All column positions (including empty):');
headers.forEach((header, idx) => {
  console.log(`  Column ${idx + 1}: ${header || '(empty)'}`);
});

// Check for data in columns beyond the standard ones
console.log('\n=== CHECKING FOR ADDITIONAL DATA ===');
let additionalDataFound = false;
for (let rowIdx = 1; rowIdx < Math.min(50, inventoryData.length); rowIdx++) {
  const row = inventoryData[rowIdx];
  for (let colIdx = 12; colIdx < row.length; colIdx++) {
    if (row[colIdx] !== undefined && row[colIdx] !== '' && row[colIdx] !== null) {
      if (!additionalDataFound) {
        console.log('\nAdditional data found in columns beyond standard fields:');
        additionalDataFound = true;
      }
      console.log(`  Row ${rowIdx + 1}, Column ${colIdx + 1}: ${row[colIdx]}`);
    }
  }
}

// Analyze RECEIVE transactions for ship/container info
console.log('\n=== ANALYZING RECEIVE TRANSACTIONS ===');
const receiveTransactions = [];
for (let i = 1; i < inventoryData.length; i++) {
  const row = inventoryData[i];
  if (row[5] === 'RECEIVE') {
    receiveTransactions.push({
      row: i + 1,
      transactionId: row[1],
      referenceId: row[6],
      notes: row[11]
    });
  }
}

console.log(`Found ${receiveTransactions.length} RECEIVE transactions`);
console.log('Sample RECEIVE transactions:');
receiveTransactions.slice(0, 10).forEach(t => {
  console.log(`  Row ${t.row}: ${t.transactionId}`);
  console.log(`    Reference: ${t.referenceId}`);
  if (t.notes) console.log(`    Notes: ${t.notes}`);
});

// Check if reference_id contains ship/container info
console.log('\n=== REFERENCE_ID PATTERNS ===');
const referencePatterns = new Map();
receiveTransactions.forEach(t => {
  if (t.referenceId) {
    // Check if it looks like a ship name or container reference
    const pattern = t.referenceId.toLowerCase().includes('oocl') ? 'Ship Name' :
                   t.referenceId.toLowerCase().includes('container') ? 'Container Ref' :
                   t.referenceId.toLowerCase().includes('ltl') ? 'LTL Shipment' :
                   t.referenceId.toLowerCase().includes('fba') ? 'FBA Shipment' :
                   'Other';
    referencePatterns.set(pattern, (referencePatterns.get(pattern) || 0) + 1);
  }
});

console.log('Reference ID patterns found:');
referencePatterns.forEach((count, pattern) => {
  console.log(`  ${pattern}: ${count} occurrences`);
});

// Check for pallet configuration data
console.log('\n=== PALLET CONFIGURATION ANALYSIS ===');
const palletConfigs = new Map();
for (let i = 1; i < Math.min(100, inventoryData.length); i++) {
  const row = inventoryData[i];
  const sku = row[3];
  const warehouse = row[2];
  const storagePallets = row[9];
  const shippingPallets = row[10];
  const cartons = row[7] || row[8];
  
  if (sku && warehouse && (storagePallets > 0 || shippingPallets > 0) && cartons > 0) {
    const key = `${warehouse}-${sku}`;
    if (!palletConfigs.has(key)) {
      palletConfigs.set(key, {
        warehouse,
        sku,
        samples: []
      });
    }
    
    const config = palletConfigs.get(key);
    if (storagePallets > 0 && row[7] > 0) {
      config.samples.push({
        type: 'storage',
        cartons: row[7],
        pallets: storagePallets,
        cartonsPerPallet: Math.round(row[7] / storagePallets)
      });
    }
    if (shippingPallets > 0 && row[8] > 0) {
      config.samples.push({
        type: 'shipping',
        cartons: row[8],
        pallets: shippingPallets,
        cartonsPerPallet: Math.round(row[8] / shippingPallets)
      });
    }
  }
}

console.log('Pallet configurations found:');
palletConfigs.forEach((config, key) => {
  console.log(`\n${key}:`);
  const storageConfigs = config.samples.filter(s => s.type === 'storage');
  const shippingConfigs = config.samples.filter(s => s.type === 'shipping');
  
  if (storageConfigs.length > 0) {
    const avgStorage = Math.round(storageConfigs.reduce((sum, s) => sum + s.cartonsPerPallet, 0) / storageConfigs.length);
    console.log(`  Storage: ~${avgStorage} cartons/pallet`);
  }
  if (shippingConfigs.length > 0) {
    const avgShipping = Math.round(shippingConfigs.reduce((sum, s) => sum + s.cartonsPerPallet, 0) / shippingConfigs.length);
    console.log(`  Shipping: ~${avgShipping} cartons/pallet`);
  }
});