import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testDataIsolation() {
  try {
    // Get all users
    const users = await prisma.user.findMany({
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        warehouseId: true
      }
    });
    
    console.log('=== USERS ===');
    users.forEach(user => {
      console.log(`${user.fullName} (${user.email})`);
      console.log(`  Role: ${user.role}`);
      console.log(`  Warehouse: ${user.warehouseId}`);
      console.log('');
    });
    
    // Get all SKUs
    const skus = await prisma.sku.findMany({
      select: {
        skuCode: true,
        description: true,
        asin: true,
        createdAt: true
      }
    });
    
    console.log('=== SKUs (Shared across all users) ===');
    skus.forEach(sku => {
      console.log(`${sku.skuCode}: ${sku.description}`);
      console.log(`  ASIN: ${sku.asin || 'N/A'}`);
      console.log(`  Created: ${sku.createdAt.toISOString()}`);
      console.log('');
    });
    
    // Get all transactions
    const transactions = await prisma.inventoryTransaction.findMany({
      select: {
        id: true,
        warehouse: true,
        sku: true,
        skuDescription: true,
        batchLot: true,
        cartonsIn: true,
        cartonsOut: true,
        createdBy: {
          select: {
            fullName: true,
            email: true
          }
        },
        createdAt: true
      }
    });
    
    console.log('=== INVENTORY TRANSACTIONS ===');
    if (transactions.length === 0) {
      console.log('No transactions found');
    } else {
      transactions.forEach(tx => {
        console.log(`Transaction ${tx.id}`);
        console.log(`  Warehouse: ${tx.warehouse}`);
        console.log(`  SKU: ${tx.sku} - ${tx.skuDescription}`);
        console.log(`  Batch: ${tx.batchLot || 'N/A'}`);
        console.log(`  Cartons In: ${tx.cartonsIn || 0}`);
        console.log(`  Cartons Out: ${tx.cartonsOut || 0}`);
        console.log(`  Created By: ${tx.createdBy?.fullName} (${tx.createdBy?.email})`);
        console.log(`  Created At: ${tx.createdAt.toISOString()}`);
        console.log('');
      });
    }
    
    // Get all invoices
    const invoices = await prisma.invoice.findMany({
      select: {
        id: true,
        invoiceNumber: true,
        warehouse: true,
        status: true,
        createdBy: {
          select: {
            fullName: true,
            email: true
          }
        },
        createdAt: true
      }
    });
    
    console.log('=== INVOICES ===');
    if (invoices.length === 0) {
      console.log('No invoices found');
    } else {
      invoices.forEach(inv => {
        console.log(`Invoice ${inv.invoiceNumber}`);
        console.log(`  Warehouse: ${inv.warehouse}`);
        console.log(`  Status: ${inv.status}`);
        console.log(`  Created By: ${inv.createdBy?.fullName} (${inv.createdBy?.email})`);
        console.log(`  Created At: ${inv.createdAt.toISOString()}`);
        console.log('');
      });
    }
    
    // Check warehouse-based filtering
    console.log('=== DATA ISOLATION ANALYSIS ===');
    console.log('1. SKUs: Shared across ALL users (no isolation)');
    console.log('2. Inventory Transactions: Should be filtered by user\'s warehouse');
    console.log('3. Invoices: Should be filtered by user\'s warehouse');
    console.log('');
    
    // Check if warehouse filtering is applied
    const adminUser = users.find(u => u.role === 'admin');
    const staffUser = users.find(u => u.role === 'staff' && u.warehouseId !== 'all');
    
    if (adminUser && staffUser) {
      console.log(`Admin (${adminUser.fullName}) can access: ${adminUser.warehouseId} warehouses`);
      console.log(`Staff (${staffUser.fullName}) can access: ${staffUser.warehouseId} warehouse only`);
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testDataIsolation();