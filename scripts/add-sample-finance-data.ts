import prisma from '../src/lib/prisma'
import { InvoiceStatus, CostCategory } from '@prisma/client'

async function addSampleFinanceData() {
  try {
    console.log('Adding sample finance data...\n')

    // Get warehouses and a user
    const warehouses = await prisma.warehouse.findMany()
    const user = await prisma.user.findFirst({
      where: { role: 'admin' }
    })

    if (!user) {
      console.error('No admin user found!')
      return
    }

    if (warehouses.length === 0) {
      console.error('No warehouses found!')
      return
    }

    // Get current billing period
    const now = new Date()
    const day = now.getDate()
    const billingStart = day <= 15 
      ? new Date(now.getFullYear(), now.getMonth() - 1, 16)
      : new Date(now.getFullYear(), now.getMonth(), 16)
    const billingEnd = day <= 15
      ? new Date(now.getFullYear(), now.getMonth(), 15)
      : new Date(now.getFullYear(), now.getMonth() + 1, 15)

    // Create some invoices for different warehouses
    const invoicesData = [
      {
        invoiceNumber: 'INV-2025-001',
        warehouseId: warehouses[0].id,
        billingPeriodStart: billingStart,
        billingPeriodEnd: billingEnd,
        invoiceDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        totalAmount: 12500.50,
        status: InvoiceStatus.paid,
        createdById: user.id
      },
      {
        invoiceNumber: 'INV-2025-002',
        warehouseId: warehouses[1]?.id || warehouses[0].id,
        billingPeriodStart: billingStart,
        billingPeriodEnd: billingEnd,
        invoiceDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
        dueDate: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000),
        totalAmount: 8750.25,
        status: InvoiceStatus.pending,
        createdById: user.id
      },
      {
        invoiceNumber: 'INV-2025-003',
        warehouseId: warehouses[2]?.id || warehouses[0].id,
        billingPeriodStart: billingStart,
        billingPeriodEnd: billingEnd,
        invoiceDate: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000), // 45 days ago (overdue)
        dueDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), // Due 15 days ago
        totalAmount: 5430.00,
        status: InvoiceStatus.pending,
        createdById: user.id
      }
    ]

    // Create invoices with line items
    for (const invoiceData of invoicesData) {
      const invoice = await prisma.invoice.create({
        data: {
          ...invoiceData,
          lineItems: {
            create: [
              {
                costCategory: CostCategory.Storage,
                costName: 'Pallet Storage',
                quantity: 150,
                unitRate: 9.00,
                amount: 1350.00
              },
              {
                costCategory: CostCategory.Pallet,
                costName: 'Pallet Handling',
                quantity: 50,
                unitRate: 13.50,
                amount: 675.00
              },
              {
                costCategory: CostCategory.Unit,
                costName: 'Unit Pick & Pack',
                quantity: 1000,
                unitRate: 0.64,
                amount: 640.00
              }
            ]
          }
        }
      })
      console.log(`Created invoice: ${invoice.invoiceNumber}`)
    }

    // Create some calculated costs to show cost variance
    const costRates = await prisma.costRate.findMany({
      take: 5,
      include: { warehouse: true }
    })

    const skus = await prisma.sku.findMany({ take: 3 })

    if (costRates.length > 0 && skus.length > 0) {
      const calculatedCostsData = []
      
      for (let i = 0; i < 10; i++) {
        const costRate = costRates[i % costRates.length]
        const sku = skus[i % skus.length]
        
        calculatedCostsData.push({
          calculatedCostId: `CALC-2025-${String(i + 1).padStart(3, '0')}`,
          transactionType: i % 2 === 0 ? 'inventory' : 'storage',
          transactionReferenceId: `TRANS-${String(i + 1).padStart(3, '0')}`,
          costRateId: costRate.id,
          warehouseId: costRate.warehouseId,
          skuId: sku.id,
          transactionDate: new Date(Date.now() - i * 24 * 60 * 60 * 1000),
          billingWeekEnding: billingEnd,
          billingPeriodStart: billingStart,
          billingPeriodEnd: billingEnd,
          quantityCharged: 10 + i * 5,
          applicableRate: costRate.costValue,
          calculatedCost: (10 + i * 5) * Number(costRate.costValue),
          costAdjustmentValue: 0,
          finalExpectedCost: (10 + i * 5) * Number(costRate.costValue),
          createdById: user.id
        })
      }

      await prisma.calculatedCost.createMany({
        data: calculatedCostsData
      })
      console.log(`\nCreated ${calculatedCostsData.length} calculated costs`)
    }

    // Create some reconciliation data
    const pendingInvoice = await prisma.invoice.findFirst({
      where: { status: InvoiceStatus.pending }
    })

    if (pendingInvoice) {
      await prisma.invoiceReconciliation.create({
        data: {
          invoiceId: pendingInvoice.id,
          costCategory: CostCategory.Storage,
          costName: 'Pallet Storage',
          expectedAmount: 1250.00,
          invoicedAmount: 1350.00,
          difference: 100.00,
          status: 'overbilled',
          createdAt: new Date()
        }
      })
      console.log('\nCreated reconciliation record')
    }

    console.log('\nSample finance data added successfully!')

  } catch (error) {
    console.error('Error adding sample finance data:', error)
  } finally {
    await prisma.$disconnect()
  }
}

addSampleFinanceData()