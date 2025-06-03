import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function generateSampleCosts() {
  try {
    console.log('Generating sample calculated costs...')
    
    // Get active warehouses (excluding Amazon)
    const warehouses = await prisma.warehouse.findMany({
      where: { 
        isActive: true,
        NOT: { code: 'AMZN' }
      }
    })
    
    // Get cost rates
    const costRates = await prisma.costRate.findMany({
      where: {
        isActive: true
      }
    })
    
    if (costRates.length === 0) {
      console.log('No cost rates found. Please set up cost rates first.')
      await prisma.$disconnect()
      return
    }
    
    // Generate costs for the current billing period
    const today = new Date()
    const billingStart = today.getDate() >= 16 
      ? new Date(today.getFullYear(), today.getMonth(), 16)
      : new Date(today.getFullYear(), today.getMonth() - 1, 16)
    const billingEnd = new Date(billingStart)
    billingEnd.setMonth(billingEnd.getMonth() + 1)
    billingEnd.setDate(15)
    
    console.log(`Billing period: ${billingStart.toISOString()} to ${billingEnd.toISOString()}`)
    
    // Generate sample storage costs
    for (const warehouse of warehouses) {
      const storageRate = costRates.find(r => 
        r.warehouseId === warehouse.id && 
        r.costCategory === 'Storage'
      )
      
      if (storageRate) {
        // Generate weekly storage costs
        const weeksInPeriod = 4
        for (let week = 0; week < weeksInPeriod; week++) {
          const weekStart = new Date(billingStart)
          weekStart.setDate(weekStart.getDate() + (week * 7))
          
          const calculatedCost = await prisma.calculatedCost.create({
            data: {
              costRateId: storageRate.id,
              warehouseId: warehouse.id,
              billingPeriodStart: billingStart,
              billingPeriodEnd: billingEnd,
              calculationDate: weekStart,
              quantity: Math.floor(Math.random() * 50) + 10, // Random pallets 10-60
              unitCost: storageRate.costValue,
              baseCost: 0, // Will calculate
              finalExpectedCost: 0, // Will calculate
              calculationMethod: 'Monday snapshot',
              calculationDetails: {
                week: week + 1,
                snapshot_date: weekStart.toISOString()
              }
            }
          })
          
          // Update with calculated values
          const baseCost = calculatedCost.quantity * Number(calculatedCost.unitCost)
          await prisma.calculatedCost.update({
            where: { id: calculatedCost.id },
            data: {
              baseCost,
              finalExpectedCost: baseCost
            }
          })
          
          console.log(`Created storage cost for ${warehouse.name} week ${week + 1}: £${baseCost}`)
        }
      }
    }
    
    console.log('Sample costs generated successfully!')
    await prisma.$disconnect()
  } catch (error) {
    console.error('Error:', error)
    await prisma.$disconnect()
    process.exit(1)
  }
}

generateSampleCosts()