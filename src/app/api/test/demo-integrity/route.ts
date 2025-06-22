import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface IntegrityCheckResult {
  test: string;
  passed: boolean;
  message: string;
  details?: any;
}

export async function GET() {
  const results: IntegrityCheckResult[] = [];
  
  try {
    // Test 1: Receive before ship
    const items = await prisma.sku.findMany();
    let receiveBeforeShipPassed = true;
    const receiveBeforeShipIssues: string[] = [];
    
    for (const item of items) {
      const transactions = await prisma.inventoryTransaction.findMany({
        where: { skuId: item.id },
        orderBy: { transactionDate: 'asc' }
      });
      
      if (transactions.length > 0) {
        const firstTransaction = transactions[0];
        if (firstTransaction.transactionType !== 'RECEIVE') {
          receiveBeforeShipPassed = false;
          receiveBeforeShipIssues.push(`Item ${item.skuCode}: First transaction is ${firstTransaction.transactionType}, not RECEIVE`);
        }
        
        let hasReceived = false;
        for (const transaction of transactions) {
          if (transaction.transactionType === 'RECEIVE') {
            hasReceived = true;
          }
          if (transaction.transactionType === 'SHIP' && !hasReceived) {
            receiveBeforeShipPassed = false;
            receiveBeforeShipIssues.push(`Item ${item.skuCode}: Ship transaction before any receive`);
            break;
          }
        }
      }
    }
    
    results.push({
      test: 'Receive Before Ship',
      passed: receiveBeforeShipPassed,
      message: receiveBeforeShipPassed 
        ? 'All items have receive transactions before ship transactions' 
        : 'Some items have ship transactions before receive',
      details: receiveBeforeShipIssues
    });
    
    // Test 2: Inventory balance integrity
    let balancePassed = true;
    const balanceIssues: string[] = [];
    
    for (const item of items) {
      const balances = await prisma.inventoryBalance.findMany({
        where: { skuId: item.id }
      });
      
      for (const balance of balances) {
        const receivedSum = await prisma.inventoryTransaction.aggregate({
          where: { 
            skuId: item.id, 
            warehouseId: balance.warehouseId,
            batchLot: balance.batchLot,
            transactionType: 'RECEIVE' 
          },
          _sum: { cartonsIn: true }
        });
        
        const shippedSum = await prisma.inventoryTransaction.aggregate({
          where: { 
            skuId: item.id,
            warehouseId: balance.warehouseId,
            batchLot: balance.batchLot,
            transactionType: 'SHIP' 
          },
          _sum: { cartonsOut: true }
        });
        
        const received = receivedSum._sum.cartonsIn || 0;
        const shipped = shippedSum._sum.cartonsOut || 0;
        const calculatedBalance = received - shipped;
        
        if (calculatedBalance !== balance.currentCartons) {
          balancePassed = false;
          balanceIssues.push(
            `SKU ${item.skuCode} at warehouse ${balance.warehouseId}: Calculated balance (${calculatedBalance}) != Current balance (${balance.currentCartons})`
          );
        }
        
        if (balance.currentCartons < 0) {
          balancePassed = false;
          balanceIssues.push(`SKU ${item.skuCode}: Negative balance (${balance.currentCartons})`);
        }
      }
    }
    
    results.push({
      test: 'Inventory Balance Integrity',
      passed: balancePassed,
      message: balancePassed 
        ? 'All inventory balances are correctly maintained' 
        : 'Some inventory balances are incorrect',
      details: balanceIssues
    });
    
    // Test 3: Financial integrity
    let financialPassed = true;
    const financialIssues: string[] = [];
    
    const invoices = await prisma.invoice.findMany({
      include: { lineItems: true }
    });
    
    for (const invoice of invoices) {
      let calculatedTotal = 0;
      for (const item of invoice.lineItems) {
        calculatedTotal += Number(item.amount);
      }
      
      if (Math.abs(Number(invoice.subtotal) - calculatedTotal) > 0.01) {
        financialPassed = false;
        financialIssues.push(
          `Invoice ${invoice.invoiceNumber}: Subtotal ($${invoice.subtotal}) != Sum of line items ($${calculatedTotal})`
        );
      }
    }
    
    results.push({
      test: 'Financial Data Integrity',
      passed: financialPassed,
      message: financialPassed 
        ? 'All financial data matches transaction volumes' 
        : 'Some financial data mismatches found',
      details: financialIssues
    });
    
    // Test 4: No negative inventory throughout history
    let noNegativeInventoryPassed = true;
    const negativeInventoryIssues: string[] = [];
    
    for (const item of items) {
      const warehouses = await prisma.warehouse.findMany();
      
      for (const warehouse of warehouses) {
        const transactions = await prisma.inventoryTransaction.findMany({
          where: { 
            skuId: item.id,
            warehouseId: warehouse.id
          },
          orderBy: { transactionDate: 'asc' }
        });
        
        let runningBalance = 0;
        for (const transaction of transactions) {
          if (transaction.transactionType === 'RECEIVE') {
            runningBalance += transaction.cartonsIn || 0;
          } else if (transaction.transactionType === 'SHIP') {
            runningBalance -= transaction.cartonsOut || 0;
          }
          
          if (runningBalance < 0) {
            noNegativeInventoryPassed = false;
            negativeInventoryIssues.push(
              `SKU ${item.skuCode} at ${warehouse.name}: Negative balance on ${transaction.transactionDate.toISOString()}`
            );
            break;
          }
        }
      }
    }
    
    results.push({
      test: 'No Negative Inventory History',
      passed: noNegativeInventoryPassed,
      message: noNegativeInventoryPassed 
        ? 'No negative inventory found throughout transaction history' 
        : 'Negative inventory detected in transaction history',
      details: negativeInventoryIssues
    });
    
    // Get statistics
    const stats = {
      skus: await prisma.sku.count(),
      warehouses: await prisma.warehouse.count(),
      transactions: await prisma.inventoryTransaction.count(),
      invoices: await prisma.invoice.count(),
      users: await prisma.user.count(),
      balances: await prisma.inventoryBalance.count()
    };
    
    return NextResponse.json({
      results,
      stats,
      summary: {
        totalTests: results.length,
        passed: results.filter(r => r.passed).length,
        failed: results.filter(r => !r.passed).length
      }
    });
    
  } catch (error) {
    console.error('Error running integrity checks:', error);
    return NextResponse.json({ 
      error: 'Failed to run integrity checks',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}