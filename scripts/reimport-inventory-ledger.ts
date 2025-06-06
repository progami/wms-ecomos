import { PrismaClient } from '@prisma/client';
import * as XLSX from 'xlsx';
import { join } from 'path';

const prisma = new PrismaClient();

interface ExcelRow {
  timestamp: number;
  transactionId: string;
  warehouse: string;
  sku: string;
  shipment: string;
  transactionType: string;
  referenceId: string;
  cartonsIn: number;
  cartonsOut: number;
  storagePalletsIn: number;
  shippingPalletsOut: number;
  notes?: string;
}

interface ExtractedAttributes {
  shipName?: string;
  containerNumber?: string;
  shippingCartonsPerPallet?: number;
  storageCartonsPerPallet?: number;
}

// Helper function to extract ship name and container from reference
function extractShipAndContainer(referenceId: string): { shipName?: string; containerNumber?: string } {
  // Common patterns:
  // "OOCL Germany" - ship name
  // "MSC Idania" - ship name
  // "Container ABCD1234567" - container number
  // "36 Cartons - LTL 1 - CS007" - LTL shipment
  
  const result: { shipName?: string; containerNumber?: string } = {};
  
  // Check for known ship prefixes
  const shipPrefixes = ['OOCL', 'MSC', 'MAERSK', 'COSCO', 'CMA', 'EVERGREEN', 'HAPAG'];
  for (const prefix of shipPrefixes) {
    if (referenceId.toUpperCase().includes(prefix)) {
      // Extract ship name (usually prefix + next word)
      const match = referenceId.match(new RegExp(`${prefix}\\s+\\w+`, 'i'));
      if (match) {
        result.shipName = match[0];
      }
      break;
    }
  }
  
  // Check for container pattern (usually 4 letters + 7 digits)
  const containerMatch = referenceId.match(/[A-Z]{4}\d{7}/);
  if (containerMatch) {
    result.containerNumber = containerMatch[0];
  }
  
  return result;
}

// Calculate cartons per pallet from transaction data
function calculateCartonsPerPallet(cartons: number, pallets: number): number | undefined {
  if (pallets > 0 && cartons > 0) {
    return Math.round(cartons / pallets);
  }
  return undefined;
}

// Convert Excel date serial to JS Date
function excelDateToJSDate(serial: number): Date {
  const utc_days = Math.floor(serial - 25569);
  const utc_value = utc_days * 86400;
  const date_info = new Date(utc_value * 1000);
  
  // Adjust for timezone
  const fractional_day = serial - Math.floor(serial) + 0.0000001;
  let total_seconds = Math.floor(86400 * fractional_day);
  const seconds = total_seconds % 60;
  total_seconds -= seconds;
  const hours = Math.floor(total_seconds / (60 * 60));
  const minutes = Math.floor(total_seconds / 60) % 60;
  
  return new Date(date_info.getFullYear(), date_info.getMonth(), date_info.getDate(), hours, minutes, seconds);
}

async function reimportInventoryLedger() {
  console.log('Starting inventory ledger reimport...\n');
  
  try {
    // Read Excel file
    const filePath = join(process.cwd(), 'data', 'Warehouse Management.xlsx');
    const workbook = XLSX.readFile(filePath);
    const inventorySheet = workbook.Sheets['inventory ledger'];
    const rawData = XLSX.utils.sheet_to_json(inventorySheet, { header: 1 }) as any[][];
    
    // Skip header row
    const dataRows = rawData.slice(1).filter(row => row[0]); // Filter out empty rows
    
    console.log(`Found ${dataRows.length} transactions to process\n`);
    
    // Get warehouses and SKUs for lookup
    const warehouses = await prisma.warehouse.findMany();
    const warehouseMap = new Map(warehouses.map(w => [w.code, w.id]));
    
    const skus = await prisma.sku.findMany();
    const skuMap = new Map(skus.map(s => [s.skuCode, s.id]));
    
    // Get existing transactions to check for updates
    const existingTransactions = await prisma.inventoryTransaction.findMany({
      select: { transactionId: true, id: true }
    });
    const existingMap = new Map(existingTransactions.map(t => [t.transactionId, t.id]));
    
    let created = 0;
    let updated = 0;
    let errors = 0;
    
    for (const row of dataRows) {
      try {
        const excelData: ExcelRow = {
          timestamp: row[0],
          transactionId: row[1],
          warehouse: row[2],
          sku: row[3],
          shipment: row[4]?.toString() || '0',
          transactionType: row[5],
          referenceId: row[6] || '',
          cartonsIn: parseInt(row[7]) || 0,
          cartonsOut: parseInt(row[8]) || 0,
          storagePalletsIn: parseInt(row[9]) || 0,
          shippingPalletsOut: parseInt(row[10]) || 0,
          notes: row[13] || undefined
        };
        
        // Extract additional attributes
        const { shipName, containerNumber } = extractShipAndContainer(excelData.referenceId);
        const shippingCartonsPerPallet = calculateCartonsPerPallet(excelData.cartonsOut, excelData.shippingPalletsOut);
        const storageCartonsPerPallet = calculateCartonsPerPallet(excelData.cartonsIn, excelData.storagePalletsIn);
        
        // Get warehouse and SKU IDs
        const warehouseId = warehouseMap.get(excelData.warehouse);
        const skuId = skuMap.get(excelData.sku);
        
        if (!warehouseId) {
          console.error(`Warehouse not found: ${excelData.warehouse}`);
          errors++;
          continue;
        }
        
        if (!skuId) {
          console.error(`SKU not found: ${excelData.sku}`);
          errors++;
          continue;
        }
        
        // Convert transaction type
        const transactionType = excelData.transactionType as any;
        
        // Prepare transaction data
        const transactionData = {
          transactionId: excelData.transactionId,
          warehouseId,
          skuId,
          batchLot: excelData.shipment,
          transactionType,
          referenceId: excelData.referenceId || null,
          cartonsIn: excelData.cartonsIn,
          cartonsOut: excelData.cartonsOut,
          storagePalletsIn: excelData.storagePalletsIn,
          shippingPalletsOut: excelData.shippingPalletsOut,
          notes: excelData.notes || null,
          transactionDate: excelDateToJSDate(excelData.timestamp),
          shipName,
          containerNumber,
          shippingCartonsPerPallet,
          storageCartonsPerPallet,
          createdById: 'system-import', // This will need to be updated with actual user ID
          isReconciled: false
        };
        
        // Check if transaction exists
        const existingId = existingMap.get(excelData.transactionId);
        
        if (existingId) {
          // Update existing transaction with new attributes
          await prisma.inventoryTransaction.update({
            where: { id: existingId },
            data: {
              shipName: transactionData.shipName,
              containerNumber: transactionData.containerNumber,
              shippingCartonsPerPallet: transactionData.shippingCartonsPerPallet,
              storageCartonsPerPallet: transactionData.storageCartonsPerPallet,
              notes: transactionData.notes
            }
          });
          updated++;
          
          if (updated % 10 === 0) {
            console.log(`Updated ${updated} transactions...`);
          }
        } else {
          // Create new transaction
          await prisma.inventoryTransaction.create({
            data: transactionData as any
          });
          created++;
          
          if (created % 10 === 0) {
            console.log(`Created ${created} transactions...`);
          }
        }
        
      } catch (error) {
        console.error(`Error processing transaction ${row[1]}:`, error);
        errors++;
      }
    }
    
    console.log('\n=== REIMPORT COMPLETE ===');
    console.log(`Created: ${created} new transactions`);
    console.log(`Updated: ${updated} existing transactions`);
    console.log(`Errors: ${errors}`);
    
    // Show sample of extracted attributes
    console.log('\n=== SAMPLE EXTRACTED ATTRIBUTES ===');
    const samples = await prisma.inventoryTransaction.findMany({
      where: {
        OR: [
          { shipName: { not: null } },
          { containerNumber: { not: null } },
          { shippingCartonsPerPallet: { not: null } },
          { storageCartonsPerPallet: { not: null } }
        ]
      },
      take: 10
    });
    
    samples.forEach(s => {
      console.log(`\nTransaction ${s.transactionId}:`);
      if (s.shipName) console.log(`  Ship: ${s.shipName}`);
      if (s.containerNumber) console.log(`  Container: ${s.containerNumber}`);
      if (s.shippingCartonsPerPallet) console.log(`  Shipping: ${s.shippingCartonsPerPallet} cartons/pallet`);
      if (s.storageCartonsPerPallet) console.log(`  Storage: ${s.storageCartonsPerPallet} cartons/pallet`);
    });
    
  } catch (error) {
    console.error('Fatal error during reimport:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Check if this is being run directly
if (require.main === module) {
  console.log('Note: This will update existing transactions with new attributes.');
  console.log('Make sure you have a database backup before proceeding.\n');
  
  reimportInventoryLedger()
    .then(() => console.log('\nReimport process completed'))
    .catch(console.error);
}