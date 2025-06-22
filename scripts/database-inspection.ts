import { PrismaClient } from '@prisma/client'
import fs from 'fs'
import path from 'path'

const prisma = new PrismaClient()

async function inspectDatabase() {
  console.log('🔍 Database Inspection Report')
  console.log('============================')
  console.log(`Generated: ${new Date().toISOString()}\n`)

  const report: string[] = []
  report.push('# Database Inspection Report')
  report.push(`Generated: ${new Date().toISOString()}\n`)

  // 1. SKUs
  console.log('\n📦 SKUS')
  console.log('-------')
  const skuCount = await prisma.sku.count()
  const skuSamples = await prisma.sku.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' }
  })
  
  console.log(`Total SKUs: ${skuCount}`)
  report.push('## SKUs')
  report.push(`Total Count: ${skuCount}\n`)
  
  if (skuSamples.length > 0) {
    console.log('\nRecent SKUs:')
    report.push('### Sample SKUs:')
    skuSamples.forEach(sku => {
      console.log(`  - ${sku.skuCode}: ${sku.description} (Pack: ${sku.packSize}, Units/Carton: ${sku.unitsPerCarton})`)
      report.push(`- **${sku.skuCode}**: ${sku.description}`)
      report.push(`  - Pack Size: ${sku.packSize}`)
      report.push(`  - Units per Carton: ${sku.unitsPerCarton}`)
      report.push(`  - FBA Stock: ${sku.fbaStock}`)
      report.push(`  - Active: ${sku.isActive}`)
      report.push('')
    })
  }

  // 2. Inventory Transactions
  console.log('\n📊 INVENTORY TRANSACTIONS')
  console.log('------------------------')
  const transactionCount = await prisma.inventoryTransaction.count()
  const transactionTypeBreakdown = await prisma.inventoryTransaction.groupBy({
    by: ['transactionType'],
    _count: true
  })
  const recentTransactions = await prisma.inventoryTransaction.findMany({
    take: 5,
    orderBy: { transactionDate: 'desc' },
    include: {
      sku: true,
      warehouse: true
    }
  })

  console.log(`Total Transactions: ${transactionCount}`)
  report.push('\n## Inventory Transactions')
  report.push(`Total Count: ${transactionCount}\n`)
  
  console.log('\nBreakdown by Type:')
  report.push('### Breakdown by Transaction Type:')
  transactionTypeBreakdown.forEach(item => {
    console.log(`  - ${item.transactionType}: ${item._count}`)
    report.push(`- ${item.transactionType}: ${item._count}`)
  })

  if (recentTransactions.length > 0) {
    console.log('\nRecent Transactions:')
    report.push('\n### Recent Transactions:')
    recentTransactions.forEach(tx => {
      const date = tx.transactionDate.toISOString().split('T')[0]
      console.log(`  - ${tx.transactionId} (${date}): ${tx.transactionType} - ${tx.sku.skuCode} @ ${tx.warehouse.code}`)
      console.log(`    Cartons: In=${tx.cartonsIn}, Out=${tx.cartonsOut}`)
      report.push(`- **${tx.transactionId}** (${date})`)
      report.push(`  - Type: ${tx.transactionType}`)
      report.push(`  - SKU: ${tx.sku.skuCode}`)
      report.push(`  - Warehouse: ${tx.warehouse.code}`)
      report.push(`  - Cartons In: ${tx.cartonsIn}, Out: ${tx.cartonsOut}`)
      report.push(`  - Batch/Lot: ${tx.batchLot}`)
      report.push('')
    })
  }

  // 3. Cost Rates
  console.log('\n💰 COST RATES')
  console.log('-------------')
  const costRateCount = await prisma.costRate.count()
  const costRateBreakdown = await prisma.costRate.groupBy({
    by: ['costCategory'],
    _count: true
  })
  const costRateSamples = await prisma.costRate.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' },
    include: {
      warehouse: true
    }
  })

  console.log(`Total Cost Rates: ${costRateCount}`)
  report.push('\n## Cost Rates')
  report.push(`Total Count: ${costRateCount}\n`)

  console.log('\nBreakdown by Category:')
  report.push('### Breakdown by Cost Category:')
  costRateBreakdown.forEach(item => {
    console.log(`  - ${item.costCategory}: ${item._count}`)
    report.push(`- ${item.costCategory}: ${item._count}`)
  })

  if (costRateSamples.length > 0) {
    console.log('\nSample Cost Rates:')
    report.push('\n### Sample Cost Rates:')
    costRateSamples.forEach(rate => {
      console.log(`  - ${rate.costName} @ ${rate.warehouse.code}: $${rate.costValue}/${rate.unitOfMeasure}`)
      report.push(`- **${rate.costName}** @ ${rate.warehouse.code}`)
      report.push(`  - Category: ${rate.costCategory}`)
      report.push(`  - Rate: $${rate.costValue} per ${rate.unitOfMeasure}`)
      report.push(`  - Effective: ${rate.effectiveDate.toISOString().split('T')[0]}`)
      report.push('')
    })
  }

  // 4. Inventory Balances
  console.log('\n📈 INVENTORY BALANCES')
  console.log('--------------------')
  const balanceCount = await prisma.inventoryBalance.count()
  const totalCartons = await prisma.inventoryBalance.aggregate({
    _sum: {
      currentCartons: true,
      currentPallets: true,
      currentUnits: true
    }
  })
  const balancesByWarehouse = await prisma.inventoryBalance.groupBy({
    by: ['warehouseId'],
    _count: true,
    _sum: {
      currentCartons: true,
      currentPallets: true
    }
  })

  console.log(`Total Balance Records: ${balanceCount}`)
  console.log(`Total Stock: ${totalCartons._sum.currentCartons || 0} cartons, ${totalCartons._sum.currentPallets || 0} pallets`)
  
  report.push('\n## Inventory Balances')
  report.push(`Total Balance Records: ${balanceCount}`)
  report.push(`Total Stock Levels:`)
  report.push(`- Cartons: ${totalCartons._sum.currentCartons || 0}`)
  report.push(`- Pallets: ${totalCartons._sum.currentPallets || 0}`)
  report.push(`- Units: ${totalCartons._sum.currentUnits || 0}\n`)

  // Get warehouse details for balance breakdown
  const warehouseMap = new Map()
  const warehouses = await prisma.warehouse.findMany()
  warehouses.forEach(w => warehouseMap.set(w.id, w))

  console.log('\nStock by Warehouse:')
  report.push('### Stock Levels by Warehouse:')
  for (const balance of balancesByWarehouse) {
    const warehouse = warehouseMap.get(balance.warehouseId)
    if (warehouse) {
      console.log(`  - ${warehouse.code}: ${balance._sum.currentCartons || 0} cartons, ${balance._sum.currentPallets || 0} pallets (${balance._count} SKUs)`)
      report.push(`- **${warehouse.code}**: ${balance._sum.currentCartons || 0} cartons, ${balance._sum.currentPallets || 0} pallets (${balance._count} SKUs)`)
    }
  }

  // Sample balances with details
  const sampleBalances = await prisma.inventoryBalance.findMany({
    take: 5,
    where: {
      currentCartons: { gt: 0 }
    },
    orderBy: { currentCartons: 'desc' },
    include: {
      sku: true,
      warehouse: true
    }
  })

  if (sampleBalances.length > 0) {
    console.log('\nTop Stock Items:')
    report.push('\n### Top Stock Items:')
    sampleBalances.forEach(balance => {
      console.log(`  - ${balance.sku.skuCode} @ ${balance.warehouse.code}: ${balance.currentCartons} cartons (Batch: ${balance.batchLot})`)
      report.push(`- **${balance.sku.skuCode}** @ ${balance.warehouse.code}`)
      report.push(`  - Cartons: ${balance.currentCartons}`)
      report.push(`  - Pallets: ${balance.currentPallets}`)
      report.push(`  - Units: ${balance.currentUnits}`)
      report.push(`  - Batch/Lot: ${balance.batchLot}`)
      report.push('')
    })
  }

  // 5. Warehouses
  console.log('\n🏢 WAREHOUSES')
  console.log('-------------')
  const warehouseCount = await prisma.warehouse.count()
  const warehouseList = await prisma.warehouse.findMany({
    orderBy: { code: 'asc' }
  })

  console.log(`Total Warehouses: ${warehouseCount}`)
  report.push('\n## Warehouses')
  report.push(`Total Count: ${warehouseCount}\n`)

  if (warehouseList.length > 0) {
    console.log('\nWarehouse List:')
    report.push('### Warehouse List:')
    warehouseList.forEach(warehouse => {
      console.log(`  - ${warehouse.code}: ${warehouse.name} (Active: ${warehouse.isActive})`)
      report.push(`- **${warehouse.code}**: ${warehouse.name}`)
      report.push(`  - Active: ${warehouse.isActive}`)
      if (warehouse.address) report.push(`  - Address: ${warehouse.address}`)
      if (warehouse.contactEmail) report.push(`  - Email: ${warehouse.contactEmail}`)
      report.push('')
    })
  }

  // 6. Other Data
  console.log('\n📋 OTHER DATA')
  console.log('-------------')
  report.push('\n## Other Data\n')

  // Users
  const userCount = await prisma.user.count()
  const usersByRole = await prisma.user.groupBy({
    by: ['role'],
    _count: true
  })
  console.log(`Users: ${userCount}`)
  report.push(`### Users: ${userCount}`)
  usersByRole.forEach(item => {
    console.log(`  - ${item.role}: ${item._count}`)
    report.push(`- ${item.role}: ${item._count}`)
  })

  // Invoices
  const invoiceCount = await prisma.invoice.count()
  const invoicesByStatus = await prisma.invoice.groupBy({
    by: ['status'],
    _count: true
  })
  console.log(`\nInvoices: ${invoiceCount}`)
  report.push(`\n### Invoices: ${invoiceCount}`)
  invoicesByStatus.forEach(item => {
    console.log(`  - ${item.status}: ${item._count}`)
    report.push(`- ${item.status}: ${item._count}`)
  })

  // Calculated Costs
  const calcCostCount = await prisma.calculatedCost.count()
  console.log(`\nCalculated Costs: ${calcCostCount}`)
  report.push(`\n### Calculated Costs: ${calcCostCount}`)

  // Storage Ledger
  const storageLedgerCount = await prisma.storageLedger.count()
  console.log(`Storage Ledger Entries: ${storageLedgerCount}`)
  report.push(`### Storage Ledger Entries: ${storageLedgerCount}`)

  // Warehouse SKU Configs
  const configCount = await prisma.warehouseSkuConfig.count()
  console.log(`Warehouse SKU Configs: ${configCount}`)
  report.push(`### Warehouse SKU Configurations: ${configCount}`)

  // Save report to file
  const reportPath = path.join(process.cwd(), 'database-inspection-report.md')
  fs.writeFileSync(reportPath, report.join('\n'))
  console.log(`\n✅ Report saved to: ${reportPath}`)

  // Also save as JSON for programmatic access
  const jsonReport = {
    generatedAt: new Date().toISOString(),
    summary: {
      skus: skuCount,
      transactions: transactionCount,
      costRates: costRateCount,
      inventoryBalances: balanceCount,
      warehouses: warehouseCount,
      users: userCount,
      invoices: invoiceCount,
      calculatedCosts: calcCostCount,
      storageLedgerEntries: storageLedgerCount,
      warehouseSkuConfigs: configCount
    },
    transactionTypes: transactionTypeBreakdown,
    costCategories: costRateBreakdown,
    warehouseStock: balancesByWarehouse.map(b => ({
      warehouseId: b.warehouseId,
      warehouse: warehouseMap.get(b.warehouseId)?.code || 'Unknown',
      skuCount: b._count,
      cartons: b._sum.currentCartons || 0,
      pallets: b._sum.currentPallets || 0
    })),
    userRoles: usersByRole,
    invoiceStatuses: invoicesByStatus
  }

  const jsonPath = path.join(process.cwd(), 'database-inspection-report.json')
  fs.writeFileSync(jsonPath, JSON.stringify(jsonReport, null, 2))
  console.log(`✅ JSON report saved to: ${jsonPath}`)
}

// Run the inspection
inspectDatabase()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect()
  })