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
    const skus = await prisma.sku.findMany();
    let receiveBeforeShipPassed = true;
    const receiveBeforeShipIssues: string[] = [];
    
    for (const sku of skus) {
      const transactions = await prisma.inventoryTransaction.findMany({
        where: { skuId: sku.id },
        orderBy: { transactionDate: 'asc' }
      });
      
      if (transactions.length > 0) {
        const firstTransaction = transactions[0];
        if (firstTransaction.transactionType !== 'RECEIVE') {
          receiveBeforeShipPassed = false;
          receiveBeforeShipIssues.push(`❌ SKU ${sku.skuCode}: First transaction is ${firstTransaction.transactionType}, not RECEIVE`);
        }
        
        let hasReceived = false;
        for (const transaction of transactions) {
          if (transaction.transactionType === 'RECEIVE') {
            hasReceived = true;
          }
          if (transaction.transactionType === 'SHIP' && !hasReceived) {
            receiveBeforeShipPassed = false;
            receiveBeforeShipIssues.push(`❌ SKU ${sku.skuCode}: Ship transaction before any receive`);
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
    
    const warehouses = await prisma.warehouse.findMany();
    
    for (const warehouse of warehouses) {
      for (const sku of skus) {
        const balance = await prisma.inventoryBalance.findUnique({
          where: {
            warehouseId_skuId_batchLot: {
              warehouseId: warehouse.id,
              skuId: sku.id,
              batchLot: 'DEFAULT'
            }
          }
        });
        
        if (balance) {
          const receivedSum = await prisma.inventoryTransaction.aggregate({
            where: {
              warehouseId: warehouse.id,
              skuId: sku.id,
              batchLot: 'DEFAULT',
              transactionType: 'RECEIVE'
            },
            _sum: { cartonsIn: true }
          });
          
          const shippedSum = await prisma.inventoryTransaction.aggregate({
            where: {
              warehouseId: warehouse.id,
              skuId: sku.id,
              batchLot: 'DEFAULT',
              transactionType: 'SHIP'
            },
            _sum: { cartonsOut: true }
          });
          
          const adjustInSum = await prisma.inventoryTransaction.aggregate({
            where: {
              warehouseId: warehouse.id,
              skuId: sku.id,
              batchLot: 'DEFAULT',
              transactionType: 'ADJUST_IN'
            },
            _sum: { cartonsIn: true }
          });
          
          const adjustOutSum = await prisma.inventoryTransaction.aggregate({
            where: {
              warehouseId: warehouse.id,
              skuId: sku.id,
              batchLot: 'DEFAULT',
              transactionType: 'ADJUST_OUT'
            },
            _sum: { cartonsOut: true }
          });
          
          const received = receivedSum._sum.cartonsIn || 0;
          const shipped = shippedSum._sum.cartonsOut || 0;
          const adjustedIn = adjustInSum._sum.cartonsIn || 0;
          const adjustedOut = adjustOutSum._sum.cartonsOut || 0;
          const calculatedBalance = received + adjustedIn - shipped - adjustedOut;
          
          if (Math.abs(calculatedBalance - balance.currentCartons) > 0.01) {
            balancePassed = false;
            balanceIssues.push(
              `❌ SKU ${sku.skuCode} at ${warehouse.name}: Calculated balance (${calculatedBalance}) != Current quantity (${balance.currentCartons})`
            );
          }
          
          if (balance.currentCartons < 0) {
            balancePassed = false;
            balanceIssues.push(`❌ SKU ${sku.skuCode} at ${warehouse.name}: Negative quantity (${balance.currentCartons})`);
          }
        }
      }
    }
    
    results.push({
      passed: balancePassed,
      message: balancePassed 
        ? '✅ All inventory balances are correctly maintained' 
        : '❌ Some inventory balances are incorrect',
      details: balanceIssues
    });
    
    // Check 3: Invoice data integrity
    console.log('\n3️⃣ Checking invoice data integrity...');
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
          `❌ Invoice ${invoice.invoiceNumber}: Subtotal ($${invoice.subtotal}) != Line items total ($${calculatedTotal})`
        );
      }
      
      const expectedTotal = Number(invoice.subtotal) + Number(invoice.taxAmount);
      if (Math.abs(Number(invoice.totalAmount) - expectedTotal) > 0.01) {
        financialPassed = false;
        financialIssues.push(
          `❌ Invoice ${invoice.invoiceNumber}: Total amount ($${invoice.totalAmount}) != Subtotal + Tax ($${expectedTotal})`
        );
      }
    }
    
    results.push({
      passed: financialPassed,
      message: financialPassed 
        ? '✅ All invoice data is correctly calculated' 
        : '❌ Some invoice data mismatches found',
      details: financialIssues
    });
    
    // Check 4: Transaction date constraints
    console.log('\n4️⃣ Checking transaction date constraints...');
    let datePassed = true;
    const dateIssues: string[] = [];
    
    const transactions = await prisma.inventoryTransaction.findMany({
      include: { sku: true, warehouse: true },
      orderBy: { transactionDate: 'asc' }
    });
    
    // Group by SKU and warehouse to check date logic
    const grouped = new Map<string, typeof transactions>();
    for (const tx of transactions) {
      const key = `${tx.warehouseId}-${tx.skuId}-${tx.batchLot}`;
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(tx);
    }
    
    for (const [key, txList] of Array.from(grouped.entries())) {
      let runningBalance = 0;
      for (const tx of txList) {
        if (tx.transactionType === 'RECEIVE' || tx.transactionType === 'ADJUST_IN') {
          runningBalance += tx.cartonsIn;
        } else if (tx.transactionType === 'SHIP' || tx.transactionType === 'ADJUST_OUT' || tx.transactionType === 'TRANSFER') {
          runningBalance -= tx.cartonsOut;
          if (runningBalance < 0) {
            datePassed = false;
            dateIssues.push(
              `❌ ${tx.sku.skuCode} at ${tx.warehouse.name}: Negative balance on ${tx.transactionDate.toISOString().split('T')[0]}`
            );
          }
        }
      }
    }
    
    results.push({
      passed: datePassed,
      message: datePassed 
        ? '✅ All transactions maintain positive inventory balance over time' 
        : '❌ Some transactions result in negative inventory',
      details: dateIssues
    });
    
    // Print summary
    console.log('\n📊 Demo Data Statistics:');
    const stats = {
      skus: await prisma.sku.count(),
      warehouses: await prisma.warehouse.count(),
      inventoryBalances: await prisma.inventoryBalance.count(),
      inventoryTransactions: await prisma.inventoryTransaction.count(),
      invoices: await prisma.invoice.count(),
      costRates: await prisma.costRate.count(),
      calculatedCosts: await prisma.calculatedCost.count(),
      users: await prisma.user.count()
    };
    
    console.log(`  - SKUs: ${stats.skus}`);
    console.log(`  - Warehouses: ${stats.warehouses}`);
    console.log(`  - Inventory Balances: ${stats.inventoryBalances}`);
    console.log(`  - Inventory Transactions: ${stats.inventoryTransactions}`);
    console.log(`  - Invoices: ${stats.invoices}`);
    console.log(`  - Cost Rates: ${stats.costRates}`);
    console.log(`  - Calculated Costs: ${stats.calculatedCosts}`);
    console.log(`  - Users: ${stats.users}`);
    
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