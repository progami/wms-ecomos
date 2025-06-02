import prisma from '../src/lib/prisma'

async function checkFinanceData() {
  try {
    console.log('Checking finance data in database...\n')

    // Check invoices
    const invoiceCount = await prisma.invoice.count()
    console.log(`Total invoices: ${invoiceCount}`)

    if (invoiceCount > 0) {
      const invoices = await prisma.invoice.findMany({
        take: 5,
        include: { warehouse: true },
        orderBy: { createdAt: 'desc' }
      })
      console.log('\nRecent invoices:')
      invoices.forEach(inv => {
        console.log(`- #${inv.invoiceNumber} - ${inv.warehouse.name} - £${inv.totalAmount} - Status: ${inv.status}`)
      })
    }

    // Check cost rates
    const costRateCount = await prisma.costRate.count()
    console.log(`\nTotal cost rates: ${costRateCount}`)

    if (costRateCount > 0) {
      const costRates = await prisma.costRate.findMany({
        take: 5,
        include: { warehouse: true }
      })
      console.log('\nSample cost rates:')
      costRates.forEach(rate => {
        console.log(`- ${rate.costName} (${rate.costCategory}) - ${rate.warehouse.name} - £${rate.costValue}/${rate.unitOfMeasure}`)
      })
    }

    // Check calculated costs
    const calcCostCount = await prisma.calculatedCost.count()
    console.log(`\nTotal calculated costs: ${calcCostCount}`)

    // Check warehouses
    const warehouseCount = await prisma.warehouse.count()
    console.log(`\nTotal warehouses: ${warehouseCount}`)

    if (warehouseCount > 0) {
      const warehouses = await prisma.warehouse.findMany()
      console.log('\nWarehouses:')
      warehouses.forEach(wh => {
        console.log(`- ${wh.name} (${wh.code})`)
      })
    }

    // Check SKUs
    const skuCount = await prisma.sku.count()
    console.log(`\nTotal SKUs: ${skuCount}`)

  } catch (error) {
    console.error('Error checking finance data:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkFinanceData()