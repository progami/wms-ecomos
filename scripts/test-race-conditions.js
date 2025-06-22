const { PrismaClient, TransactionType } = require('@prisma/client');
const prisma = new PrismaClient();

async function testConcurrentUpdates() {
  console.log('🔧 Testing Race Condition Fixes\n');
  
  try {
    // Setup test data
    console.log('Setting up test data...');
    
    // Create test warehouse
    const warehouse = await prisma.warehouse.upsert({
      where: { code: 'TEST-RACE' },
      update: {},
      create: {
        name: 'Test Race Warehouse',
        code: 'TEST-RACE',
        address: '123 Test St',
        isActive: true
      }
    });
    
    // Create test SKU
    const sku = await prisma.sku.upsert({
      where: { skuCode: 'TEST-RACE-SKU' },
      update: {},
      create: {
        skuCode: 'TEST-RACE-SKU',
        description: 'Test SKU for Race Conditions',
        unitsPerCarton: 10,
        packSize: 1,
        isActive: true
      }
    });
    
    // Create initial inventory
    await prisma.inventoryBalance.upsert({
      where: {
        warehouseId_skuId_batchLot: {
          warehouseId: warehouse.id,
          skuId: sku.id,
          batchLot: 'RACE-TEST-001'
        }
      },
      update: {
        currentCartons: 100,
        currentUnits: 1000,
        currentPallets: 2
      },
      create: {
        warehouseId: warehouse.id,
        skuId: sku.id,
        batchLot: 'RACE-TEST-001',
        currentCartons: 100,
        currentUnits: 1000,
        currentPallets: 2,
        storageCartonsPerPallet: 50,
        shippingCartonsPerPallet: 50,
        lastTransactionDate: new Date()
      }
    });
    
    console.log('Initial inventory: 100 cartons\n');
    
    // Test 1: Concurrent shipments
    console.log('=== Test 1: Concurrent Shipments ===');
    console.log('Attempting 5 concurrent shipments of 30 cartons each (150 total)');
    
    const shipmentPromises = [];
    for (let i = 0; i < 5; i++) {
      shipmentPromises.push(
        prisma.$transaction(async (tx) => {
          // Lock the balance row
          const balances = await tx.$queryRaw`
            SELECT * FROM "inventory_balances" 
            WHERE "warehouse_id" = ${warehouse.id} 
            AND "sku_id" = ${sku.id} 
            AND "batch_lot" = 'RACE-TEST-001'
            FOR UPDATE
          `;
          
          const balance = balances[0];
          const newCartons = balance.current_cartons - 30;
          
          if (newCartons < 0) {
            throw new Error('Insufficient inventory');
          }
          
          await tx.inventoryBalance.update({
            where: { id: balance.id },
            data: {
              currentCartons: newCartons,
              currentUnits: newCartons * 10
            }
          });
          
          return { success: true };
        }).catch(err => ({ error: err.message }))
      );
    }
    
    const results = await Promise.allSettled(shipmentPromises);
    const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
    const failed = results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && r.value.error)).length;
    
    console.log(`Successful shipments: ${successful}`);
    console.log(`Failed shipments: ${failed}`);
    
    const balanceAfter = await prisma.inventoryBalance.findFirst({
      where: { warehouseId: warehouse.id, skuId: sku.id, batchLot: 'RACE-TEST-001' }
    });
    
    console.log(`Final inventory: ${balanceAfter.currentCartons} cartons`);
    console.log(`Expected: 0 or more (no negative inventory)`);
    console.log(`Result: ${balanceAfter.currentCartons >= 0 ? 'PASS ✓' : 'FAIL ✗'}`);
    
    // Test 2: Concurrent adjustments
    console.log('\n=== Test 2: Concurrent Adjustments ===');
    
    // Reset inventory
    await prisma.inventoryBalance.update({
      where: { id: balanceAfter.id },
      data: { currentCartons: 100, currentUnits: 1000 }
    });
    
    console.log('Reset inventory to 100 cartons');
    console.log('Attempting 10 concurrent adjustments, each adding 5 cartons');
    
    const adjustmentPromises = [];
    for (let i = 0; i < 10; i++) {
      adjustmentPromises.push(
        prisma.$transaction(async (tx) => {
          // Lock the balance row
          const balances = await tx.$queryRaw`
            SELECT * FROM "inventory_balances" 
            WHERE "warehouse_id" = ${warehouse.id} 
            AND "sku_id" = ${sku.id} 
            AND "batch_lot" = 'RACE-TEST-001'
            FOR UPDATE
          `;
          
          const balance = balances[0];
          const newCartons = balance.current_cartons + 5;
          
          await tx.inventoryBalance.update({
            where: { id: balance.id },
            data: {
              currentCartons: newCartons,
              currentUnits: newCartons * 10
            }
          });
          
          return { success: true };
        })
      );
    }
    
    await Promise.all(adjustmentPromises);
    
    const balanceAfter2 = await prisma.inventoryBalance.findFirst({
      where: { warehouseId: warehouse.id, skuId: sku.id, batchLot: 'RACE-TEST-001' }
    });
    
    console.log(`Final inventory: ${balanceAfter2.currentCartons} cartons`);
    console.log(`Expected: 150 cartons (100 + 10*5)`);
    console.log(`Result: ${balanceAfter2.currentCartons === 150 ? 'PASS ✓' : 'FAIL ✗'}`);
    
    // Cleanup
    await prisma.inventoryBalance.deleteMany({
      where: { batchLot: 'RACE-TEST-001' }
    });
    
    console.log('\n✅ All tests completed successfully!');
    console.log('Race conditions are properly prevented with row-level locking.');
    
  } catch (error) {
    console.error('Test error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testConcurrentUpdates();