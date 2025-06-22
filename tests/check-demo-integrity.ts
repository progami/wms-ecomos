import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  log: ['error']
});

interface IntegrityCheckResult {
  passed: boolean;
  message: string;
  details?: any;
}

async function checkDemoDataIntegrity() {
  console.log('🔍 Starting Demo Data Integrity Check...\n');
  
  const results: IntegrityCheckResult[] = [];
  
  try {
    // Check 1: Receive transactions before ship transactions
    console.log('1️⃣ Checking receive before ship rule...');
    const items = await prisma.inventoryItem.findMany();
    let receiveBeforeShipPassed = true;
    const receiveBeforeShipIssues: string[] = [];
    
    for (const item of items) {
      const transactions = await prisma.inventoryLedger.findMany({
        where: { itemId: item.id },
        orderBy: { createdAt: 'asc' }
      });
      
      if (transactions.length > 0) {
        const firstTransaction = transactions[0];
        if (firstTransaction.type !== 'receive') {
          receiveBeforeShipPassed = false;
          receiveBeforeShipIssues.push(`❌ Item ${item.sku}: First transaction is ${firstTransaction.type}, not receive`);
        }
        
        let hasReceived = false;
        for (const transaction of transactions) {
          if (transaction.type === 'receive') {
            hasReceived = true;
          }
          if (transaction.type === 'ship' && !hasReceived) {
            receiveBeforeShipPassed = false;
            receiveBeforeShipIssues.push(`❌ Item ${item.sku}: Ship transaction before any receive`);
            break;
          }
        }
      }
    }
    
    results.push({
      passed: receiveBeforeShipPassed,
      message: receiveBeforeShipPassed 
        ? '✅ All items have receive transactions before ship transactions' 
        : '❌ Some items have ship transactions before receive',
      details: receiveBeforeShipIssues
    });
    
    // Check 2: Inventory balances (received - shipped = current)
    console.log('\n2️⃣ Checking inventory balance integrity...');
    let balancePassed = true;
    const balanceIssues: string[] = [];
    
    for (const item of items) {
      const receivedSum = await prisma.inventoryLedger.aggregate({
        where: { itemId: item.id, type: 'receive' },
        _sum: { quantity: true }
      });
      
      const shippedSum = await prisma.inventoryLedger.aggregate({
        where: { itemId: item.id, type: 'ship' },
        _sum: { quantity: true }
      });
      
      const adjustmentSum = await prisma.inventoryLedger.aggregate({
        where: { itemId: item.id, type: 'adjustment' },
        _sum: { quantity: true }
      });
      
      const received = receivedSum._sum.quantity || 0;
      const shipped = shippedSum._sum.quantity || 0;
      const adjustments = adjustmentSum._sum.quantity || 0;
      const calculatedBalance = received - shipped + adjustments;
      
      if (calculatedBalance !== item.quantity) {
        balancePassed = false;
        balanceIssues.push(
          `❌ Item ${item.sku}: Calculated balance (${calculatedBalance}) != Current quantity (${item.quantity})`
        );
      }
      
      if (item.quantity < 0) {
        balancePassed = false;
        balanceIssues.push(`❌ Item ${item.sku}: Negative quantity (${item.quantity})`);
      }
    }
    
    results.push({
      passed: balancePassed,
      message: balancePassed 
        ? '✅ All inventory balances are correctly maintained' 
        : '❌ Some inventory balances are incorrect',
      details: balanceIssues
    });
    
    // Check 3: Financial data integrity
    console.log('\n3️⃣ Checking financial data integrity...');
    let financialPassed = true;
    const financialIssues: string[] = [];
    
    const purchaseOrders = await prisma.purchaseOrder.findMany({
      include: { items: true }
    });
    
    for (const po of purchaseOrders) {
      let poTotal = 0;
      for (const item of po.items) {
        poTotal += item.quantity * item.unitPrice;
      }
      
      const invoice = await prisma.invoice.findFirst({
        where: { purchaseOrderId: po.id }
      });
      
      if (invoice && Math.abs(invoice.amount - poTotal) > 0.01) {
        financialPassed = false;
        financialIssues.push(
          `❌ PO ${po.orderNumber}: Invoice amount ($${invoice.amount}) != PO total ($${poTotal})`
        );
      }
    }
    
    const salesOrders = await prisma.salesOrder.findMany({
      include: { items: true }
    });
    
    for (const so of salesOrders) {
      let soTotal = 0;
      for (const item of so.items) {
        soTotal += item.quantity * item.unitPrice;
      }
      
      if (Math.abs(so.totalAmount - soTotal) > 0.01) {
        financialPassed = false;
        financialIssues.push(
          `❌ SO ${so.orderNumber}: Total amount ($${so.totalAmount}) != Calculated total ($${soTotal})`
        );
      }
    }
    
    results.push({
      passed: financialPassed,
      message: financialPassed 
        ? '✅ All financial data matches transaction volumes' 
        : '❌ Some financial data mismatches found',
      details: financialIssues
    });
    
    // Check 4: Shipment constraints
    console.log('\n4️⃣ Checking shipment constraints...');
    let shipmentPassed = true;
    const shipmentIssues: string[] = [];
    
    const shippedSalesOrders = await prisma.salesOrder.findMany({
      where: { status: 'shipped' },
      include: {
        items: {
          include: { inventoryItem: true }
        }
      }
    });
    
    for (const so of shippedSalesOrders) {
      for (const soItem of so.items) {
        const shippedBefore = await prisma.salesOrderItem.aggregate({
          where: {
            inventoryItemId: soItem.inventoryItemId,
            salesOrder: {
              shippedAt: { lte: so.shippedAt },
              status: 'shipped'
            }
          },
          _sum: { quantity: true }
        });
        
        const receivedBefore = await prisma.inventoryLedger.aggregate({
          where: {
            itemId: soItem.inventoryItemId,
            type: 'receive',
            createdAt: { lte: so.shippedAt || new Date() }
          },
          _sum: { quantity: true }
        });
        
        const totalShipped = shippedBefore._sum.quantity || 0;
        const totalReceived = receivedBefore._sum.quantity || 0;
        
        if (totalShipped > totalReceived) {
          shipmentPassed = false;
          shipmentIssues.push(
            `❌ Item ${soItem.inventoryItem.sku} in SO ${so.orderNumber}: Shipped (${totalShipped}) > Received (${totalReceived})`
          );
        }
      }
    }
    
    results.push({
      passed: shipmentPassed,
      message: shipmentPassed 
        ? '✅ No items shipped more than available inventory' 
        : '❌ Some items shipped exceed available inventory',
      details: shipmentIssues
    });
    
    // Print summary
    console.log('\n📊 Demo Data Statistics:');
    const stats = {
      items: await prisma.inventoryItem.count(),
      locations: await prisma.location.count(),
      purchaseOrders: await prisma.purchaseOrder.count(),
      salesOrders: await prisma.salesOrder.count(),
      invoices: await prisma.invoice.count(),
      vendors: await prisma.vendor.count(),
      customers: await prisma.customer.count(),
      transactions: await prisma.inventoryLedger.count()
    };
    
    console.log(`  - Inventory Items: ${stats.items}`);
    console.log(`  - Locations: ${stats.locations}`);
    console.log(`  - Purchase Orders: ${stats.purchaseOrders}`);
    console.log(`  - Sales Orders: ${stats.salesOrders}`);
    console.log(`  - Invoices: ${stats.invoices}`);
    console.log(`  - Vendors: ${stats.vendors}`);
    console.log(`  - Customers: ${stats.customers}`);
    console.log(`  - Ledger Transactions: ${stats.transactions}`);
    
    // Print results
    console.log('\n📋 Integrity Check Results:');
    console.log('===========================');
    
    let allPassed = true;
    for (const result of results) {
      console.log(`\n${result.message}`);
      if (!result.passed && result.details && result.details.length > 0) {
        allPassed = false;
        console.log('Details:');
        result.details.forEach((detail: string) => console.log(`  ${detail}`));
      }
    }
    
    console.log('\n===========================');
    console.log(allPassed 
      ? '✅ All integrity checks passed!' 
      : '❌ Some integrity checks failed. Please review the issues above.');
    
    return allPassed;
    
  } catch (error) {
    console.error('Error running integrity checks:', error);
    return false;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the check
checkDemoDataIntegrity().then((passed) => {
  process.exit(passed ? 0 : 1);
});