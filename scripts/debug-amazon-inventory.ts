import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function debugAmazonInventory() {
  try {
    console.log('=== Amazon Inventory Debug ===\n')
    
    // 1. Check warehouses
    console.log('1. Checking warehouses:')
    const warehouses = await prisma.warehouse.findMany()
    console.log('Total warehouses:', warehouses.length)
    warehouses.forEach(w => {
      console.log(`  - ${w.name} (${w.code}) - Active: ${w.isActive}`)
    })
    
    // 2. Find Amazon warehouse
    console.log('\n2. Looking for Amazon warehouse:')
    const amazonWarehouse = await prisma.warehouse.findFirst({
      where: {
        OR: [
          { code: 'AMZN-UK' },
          { code: 'AMZN' },
          { name: 'Amazon FBA UK' },
          { name: { contains: 'Amazon' } }
        ]
      }
    })
    
    if (amazonWarehouse) {
      console.log(`Found: ${amazonWarehouse.name} (${amazonWarehouse.code})`)
      console.log(`ID: ${amazonWarehouse.id}`)
    } else {
      console.log('No Amazon warehouse found!')
    }
    
    // 3. Check inventory balances
    console.log('\n3. Checking inventory balances:')
    const inventoryBalances = await prisma.inventoryBalance.findMany({
      include: {
        warehouse: true,
        sku: true
      }
    })
    
    console.log(`Total inventory balance records: ${inventoryBalances.length}`)
    
    // Group by warehouse
    const warehouseGroups = inventoryBalances.reduce((acc, balance) => {
      const key = balance.warehouse.name
      if (!acc[key]) acc[key] = 0
      acc[key] += balance.currentCartons
      return acc
    }, {} as Record<string, number>)
    
    console.log('\nCartons by warehouse:')
    Object.entries(warehouseGroups).forEach(([warehouse, cartons]) => {
      console.log(`  - ${warehouse}: ${cartons} cartons`)
    })
    
    // Check Amazon specific inventory
    if (amazonWarehouse) {
      const amazonBalances = inventoryBalances.filter(b => b.warehouseId === amazonWarehouse.id)
      console.log(`\nAmazon warehouse has ${amazonBalances.length} SKUs with inventory`)
      
      if (amazonBalances.length > 0) {
        console.log('\nTop 5 Amazon SKUs by cartons:')
        amazonBalances
          .sort((a, b) => b.currentCartons - a.currentCartons)
          .slice(0, 5)
          .forEach(balance => {
            console.log(`  - ${balance.sku.skuCode}: ${balance.currentCartons} cartons (${balance.currentCartons * (balance.sku.unitsPerCarton || 1)} units)`)
          })
      }
    }
    
    // 4. Check SKUs
    console.log('\n4. Checking SKUs:')
    const skus = await prisma.sku.findMany()
    console.log(`Total SKUs: ${skus.length}`)
    
    // 5. Check transactions for Amazon warehouse
    if (amazonWarehouse) {
      console.log('\n5. Checking Amazon transactions:')
      const allTransactions = await prisma.inventoryTransaction.findMany({
        where: {
          warehouseId: amazonWarehouse.id
        },
        include: {
          sku: true
        }
      })
      
      console.log(`Total Amazon transactions: ${allTransactions.length}`)
      
      if (allTransactions.length === 0) {
        console.log('No transactions found for Amazon warehouse')
        
        // Check if there are any transactions with Amazon in warehouse name
        console.log('\nChecking for transactions with Amazon in warehouse name:')
        const amazonNameTransactions = await prisma.inventoryTransaction.findMany({
          where: {
            warehouse: {
              name: { contains: 'Amazon' }
            }
          },
          take: 5,
          include: {
            warehouse: true,
            sku: true
          }
        })
        
        console.log(`Found ${amazonNameTransactions.length} transactions`)
        amazonNameTransactions.forEach(tx => {
          console.log(`  - Warehouse: ${tx.warehouse.name} (${tx.warehouse.id})`)
        })
      } else {
        // Show recent transactions
        const recentTransactions = allTransactions
          .sort((a, b) => b.transactionDate.getTime() - a.transactionDate.getTime())
          .slice(0, 5)
        
        console.log('\nRecent Amazon transactions:')
        recentTransactions.forEach(tx => {
          console.log(`  - ${tx.transactionDate.toISOString().split('T')[0]} ${tx.transactionType}: ${tx.sku.skuCode} - In: ${tx.cartonsIn}, Out: ${tx.cartonsOut}`)
        })
        
        // Calculate total inventory
        const skuTotals = allTransactions.reduce((acc, tx) => {
          const skuCode = tx.sku.skuCode
          if (!acc[skuCode]) acc[skuCode] = 0
          acc[skuCode] += tx.cartonsIn - tx.cartonsOut
          return acc
        }, {} as Record<string, number>)
        
        console.log('\nCalculated Amazon inventory by SKU:')
        Object.entries(skuTotals)
          .filter(([_, cartons]) => cartons > 0)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 5)
          .forEach(([sku, cartons]) => {
            console.log(`  - ${sku}: ${cartons} cartons`)
          })
      }
    }
    
    await prisma.$disconnect()
  } catch (error) {
    console.error('Error:', error)
    await prisma.$disconnect()
    process.exit(1)
  }
}

debugAmazonInventory()