import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkCostRates() {
  try {
    const rates = await prisma.costRate.findMany({
      include: {
        warehouse: true
      }
    })
    
    console.log('=== Cost Rates ===')
    console.log('Total rates:', rates.length)
    
    if (rates.length > 0) {
      console.log('\nRates by warehouse:')
      rates.forEach(rate => {
        console.log(`- ${rate.warehouse.name}: ${rate.costName} (${rate.costCategory}) - £${rate.costValue} per ${rate.unit}`)
      })
    } else {
      console.log('No cost rates found. Please add rates through the admin interface.')
    }
    
    await prisma.$disconnect()
  } catch (error) {
    console.error('Error:', error)
    await prisma.$disconnect()
    process.exit(1)
  }
}

checkCostRates()