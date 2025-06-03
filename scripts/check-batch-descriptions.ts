import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkBatchDescriptions() {
  try {
    // Check SKUs
    const skus = await prisma.sku.findMany({
      where: {
        OR: [
          { description: { contains: 'pack of 3' } },
          { description: { contains: 'LD' } }
        ]
      }
    })
    
    console.log('=== SKUs with "pack of 3" or "LD" in description ===')
    skus.forEach(sku => {
      console.log(`- ${sku.skuCode}: ${sku.description}`)
    })
    
    // Check inventory balances
    console.log('\n=== Inventory Balances with TEST-2025 batch ===')
    const balances = await prisma.inventoryBalance.findMany({
      where: {
        batchLot: { contains: 'TEST-2025' }
      },
      include: {
        sku: true,
        warehouse: true
      }
    })
    
    balances.forEach(balance => {
      console.log(`- Warehouse: ${balance.warehouse.name}`)
      console.log(`  SKU: ${balance.sku.skuCode} - ${balance.sku.description}`)
      console.log(`  Batch: ${balance.batchLot}`)
      console.log(`  Cartons: ${balance.currentCartons}`)
      console.log('')
    })
    
    // Check if there's a specific format for batch lots
    console.log('=== Sample of batch/lot formats ===')
    const sampleBalances = await prisma.inventoryBalance.findMany({
      take: 10,
      include: {
        sku: true
      }
    })
    
    sampleBalances.forEach(balance => {
      console.log(`- ${balance.batchLot} (SKU: ${balance.sku.skuCode})`)
    })
    
    await prisma.$disconnect()
  } catch (error) {
    console.error('Error:', error)
    await prisma.$disconnect()
    process.exit(1)
  }
}

checkBatchDescriptions()