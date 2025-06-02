import prisma from '../src/lib/prisma'

async function verifyFinanceDashboard() {
  try {
    console.log('Verifying Finance Dashboard Data...\n')

    // Calculate billing period
    const now = new Date()
    const day = now.getDate()
    const billingStart = day >= 16 
      ? new Date(now.getFullYear(), now.getMonth(), 16)
      : new Date(now.getFullYear(), now.getMonth() - 1, 16)
    const billingEnd = new Date(billingStart)
    billingEnd.setMonth(billingEnd.getMonth() + 1)
    billingEnd.setDate(15)

    console.log(`Current billing period: ${billingStart.toDateString()} to ${billingEnd.toDateString()}`)
    console.log(`Today: ${now.toDateString()} (day ${day})\n`)

    // Check invoices
    const allInvoices = await prisma.invoice.findMany({
      include: { warehouse: true }
    })
    console.log(`Total invoices in database: ${allInvoices.length}`)
    
    allInvoices.forEach(inv => {
      console.log(`- Invoice ${inv.invoiceNumber}: ${inv.warehouse.name} - £${inv.totalAmount} - Status: ${inv.status}`)
      console.log(`  Period: ${inv.billingPeriodStart.toDateString()} to ${inv.billingPeriodEnd.toDateString()}`)
    })

    // Check calculated costs
    const calcCosts = await prisma.calculatedCost.findMany({
      include: { costRate: true, warehouse: true }
    })
    console.log(`\nTotal calculated costs: ${calcCosts.length}`)
    
    const totalCost = calcCosts.reduce((sum, cost) => sum + Number(cost.finalExpectedCost), 0)
    console.log(`Total calculated cost amount: £${totalCost.toFixed(2)}`)

    // Group by category
    const categoryBreakdown = new Map<string, number>()
    calcCosts.forEach(cost => {
      const category = cost.costRate.costCategory
      const current = categoryBreakdown.get(category) || 0
      categoryBreakdown.set(category, current + Number(cost.finalExpectedCost))
    })

    console.log('\nCost breakdown by category:')
    categoryBreakdown.forEach((amount, category) => {
      console.log(`- ${category}: £${amount.toFixed(2)}`)
    })

    // Check what the API would return
    const invoiceStats = await prisma.invoice.groupBy({
      by: ['status'],
      _count: true,
      _sum: { totalAmount: true }
    })

    console.log('\nInvoice status summary:')
    invoiceStats.forEach(stat => {
      console.log(`- ${stat.status}: ${stat._count} invoices, £${stat._sum.totalAmount || 0}`)
    })

  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

verifyFinanceDashboard()