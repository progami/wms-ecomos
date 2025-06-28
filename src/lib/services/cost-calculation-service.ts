import { Prisma, TransactionType, CostCategory } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { withTransaction, TransactionOptions } from '@/lib/database/transaction-utils'
import { auditLog } from '@/lib/security/audit-logger'
import { startOfWeek, endOfWeek, differenceInDays, format } from 'date-fns'
import { z } from 'zod'

// Validation schemas
const costCalculationInputSchema = z.object({
  transactionId: z.string(),
  warehouseId: z.string().uuid(),
  skuId: z.string().uuid(),
  batchLot: z.string(),
  transactionType: z.nativeEnum(TransactionType),
  transactionDate: z.date(),
  cartonsIn: z.number().int().min(0),
  cartonsOut: z.number().int().min(0),
  storagePalletsIn: z.number().int().min(0),
  shippingPalletsOut: z.number().int().min(0),
  storageCartonsPerPallet: z.number().int().positive().optional(),
  shippingCartonsPerPallet: z.number().int().positive().optional(),
})

type CostCalculationInput = z.infer<typeof costCalculationInputSchema>

export class CostCalculationService {
  /**
   * Calculate and store costs for a specific billing period
   * This is used by reconciliation to ensure all costs are calculated
   */
  static async calculateAndStoreCosts(
    warehouseId: string,
    billingPeriod: { start: Date; end: Date },
    userId: string
  ): Promise<void> {
    // Get all transactions for the period
    const transactions = await prisma.inventoryTransaction.findMany({
      where: {
        warehouseId,
        transactionDate: {
          gte: billingPeriod.start,
          lte: billingPeriod.end,
        },
        transactionType: {
          in: [TransactionType.RECEIVE, TransactionType.SHIP],
        },
      },
    });

    // Calculate costs for each transaction
    for (const transaction of transactions) {
      const input = {
        transactionId: transaction.transactionId,
        warehouseId: transaction.warehouseId,
        skuId: transaction.skuId,
        batchLot: transaction.batchLot,
        transactionType: transaction.transactionType,
        transactionDate: transaction.transactionDate,
        cartonsIn: transaction.cartonsIn,
        cartonsOut: transaction.cartonsOut,
        storagePalletsIn: transaction.storagePalletsIn,
        shippingPalletsOut: transaction.shippingPalletsOut,
        storageCartonsPerPallet: transaction.storageCartonsPerPallet || undefined,
        shippingCartonsPerPallet: transaction.shippingCartonsPerPallet || undefined,
      };

      await this.calculateTransactionCosts(input, userId);
    }

    // Calculate storage costs for the period
    const weekStart = startOfWeek(billingPeriod.start, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(billingPeriod.end, { weekStartsOn: 1 });
    
    let currentWeek = weekStart;
    while (currentWeek <= weekEnd) {
      await this.calculateWeeklyStorageCosts(currentWeek, userId, warehouseId);
      currentWeek = new Date(currentWeek);
      currentWeek.setDate(currentWeek.getDate() + 7);
    }
  }

  /**
   * Get calculated costs summary for reconciliation
   */
  static async getCalculatedCostsForReconciliation(
    warehouseId: string,
    billingPeriod: { start: Date; end: Date }
  ): Promise<Array<{
    costCategory: CostCategory;
    costName: string;
    totalQuantity: number;
    totalAmount: number;
    unitRate: number;
    calculatedCostIds: string[];
  }>> {
    const calculatedCosts = await prisma.calculatedCost.findMany({
      where: {
        warehouseId,
        billingPeriodStart: {
          gte: billingPeriod.start,
        },
        billingPeriodEnd: {
          lte: billingPeriod.end,
        },
      },
      include: {
        costRate: true,
      },
    });

    // Group by category and name
    const grouped = new Map<string, {
      costCategory: CostCategory;
      costName: string;
      totalQuantity: number;
      totalAmount: number;
      unitRate: number;
      calculatedCostIds: string[];
    }>();

    for (const cost of calculatedCosts) {
      const key = `${cost.costRate.costCategory}-${cost.costRate.costName}`;
      const existing = grouped.get(key);

      if (existing) {
        existing.totalQuantity += Number(cost.quantityCharged);
        existing.totalAmount += Number(cost.finalExpectedCost);
        existing.calculatedCostIds.push(cost.id);
      } else {
        grouped.set(key, {
          costCategory: cost.costRate.costCategory,
          costName: cost.costRate.costName,
          totalQuantity: Number(cost.quantityCharged),
          totalAmount: Number(cost.finalExpectedCost),
          unitRate: Number(cost.applicableRate),
          calculatedCostIds: [cost.id],
        });
      }
    }

    return Array.from(grouped.values());
  }
  /**
   * Calculate costs for an inventory transaction
   * This is the main entry point for cost calculations
   */
  static async calculateTransactionCosts(
    transaction: CostCalculationInput,
    userId: string,
    options: TransactionOptions = {}
  ) {
    const validatedInput = costCalculationInputSchema.parse(transaction)
    
    return withTransaction(async (tx) => {
      const calculatedCosts = []
      
      // Get warehouse details
      const warehouse = await tx.warehouse.findUnique({
        where: { id: validatedInput.warehouseId }
      })
      
      if (!warehouse) {
        throw new Error('Warehouse not found')
      }
      
      // Check if it's an Amazon warehouse
      const isAmazonWarehouse = warehouse.code?.includes('AMZN') || 
                               warehouse.name.toLowerCase().includes('amazon')
      
      // Calculate different cost types based on transaction type
      switch (validatedInput.transactionType) {
        case TransactionType.RECEIVE:
          // Calculate inbound costs
          if (validatedInput.cartonsIn > 0) {
            const inboundCost = await this.calculateInboundCost(
              tx,
              validatedInput,
              isAmazonWarehouse
            )
            if (inboundCost) calculatedCosts.push(inboundCost)
          }
          break
          
        case TransactionType.SHIP:
          // Calculate outbound costs
          if (validatedInput.cartonsOut > 0) {
            const outboundCost = await this.calculateOutboundCost(
              tx,
              validatedInput,
              isAmazonWarehouse
            )
            if (outboundCost) calculatedCosts.push(outboundCost)
          }
          break
          
        case TransactionType.ADJUST_IN:
        case TransactionType.ADJUST_OUT:
          // Adjustments typically don't incur costs
          break
          
        case TransactionType.TRANSFER:
          // Calculate transfer costs if applicable
          const transferCost = await this.calculateTransferCost(
            tx,
            validatedInput
          )
          if (transferCost) calculatedCosts.push(transferCost)
          break
      }
      
      // Calculate storage costs for the current inventory snapshot
      // This will be triggered weekly by a separate process
      if (!isAmazonWarehouse) {
        await this.updateStorageLedgerEntry(tx, validatedInput)
      }
      
      // Create calculated cost records
      const createdCosts = []
      for (const cost of calculatedCosts) {
        const calculatedCostId = `CC-${validatedInput.transactionId}-${cost.costCategory}`
        
        // Check for existing cost to ensure idempotency
        const existing = await tx.calculatedCost.findUnique({
          where: { calculatedCostId }
        })
        
        if (!existing) {
          const created = await tx.calculatedCost.create({
            data: {
              calculatedCostId,
              transactionType: validatedInput.transactionType,
              transactionReferenceId: validatedInput.transactionId,
              costRateId: cost.costRateId,
              warehouseId: validatedInput.warehouseId,
              skuId: validatedInput.skuId,
              batchLot: validatedInput.batchLot,
              transactionDate: validatedInput.transactionDate,
              billingWeekEnding: endOfWeek(validatedInput.transactionDate, { weekStartsOn: 1 }),
              billingPeriodStart: this.getBillingPeriodStart(validatedInput.transactionDate),
              billingPeriodEnd: this.getBillingPeriodEnd(validatedInput.transactionDate),
              quantityCharged: cost.quantity,
              applicableRate: cost.rate,
              calculatedCost: cost.amount,
              finalExpectedCost: cost.amount,
              createdById: userId,
            }
          })
          createdCosts.push(created)
        }
      }
      
      // Audit log
      if (createdCosts.length > 0) {
        await auditLog({
          entityType: 'CalculatedCost',
          entityId: validatedInput.transactionId,
          action: 'CREATE',
          userId,
          data: {
            transactionId: validatedInput.transactionId,
            costsCalculated: createdCosts.length,
            totalAmount: createdCosts.reduce((sum, c) => sum + Number(c.calculatedCost), 0),
          }
        })
      }
      
      return createdCosts
    }, {
      ...options,
      isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
    })
  }
  
  /**
   * Calculate inbound costs (receiving)
   */
  private static async calculateInboundCost(
    tx: Prisma.TransactionClient,
    transaction: CostCalculationInput,
    isAmazonWarehouse: boolean
  ) {
    // Find applicable inbound rate
    const costRate = await tx.costRate.findFirst({
      where: {
        warehouseId: transaction.warehouseId,
        costCategory: CostCategory.Carton,
        costName: { contains: 'Inbound' },
        effectiveDate: { lte: transaction.transactionDate },
        OR: [
          { endDate: null },
          { endDate: { gte: transaction.transactionDate } }
        ]
      },
      orderBy: { effectiveDate: 'desc' }
    })
    
    if (!costRate) {
      // console.warn(`No inbound cost rate found for warehouse ${transaction.warehouseId}`)
      return null
    }
    
    return {
      costCategory: CostCategory.Carton,
      costRateId: costRate.id,
      quantity: new Prisma.Decimal(transaction.cartonsIn),
      rate: costRate.costValue,
      amount: new Prisma.Decimal(transaction.cartonsIn).mul(costRate.costValue),
    }
  }
  
  /**
   * Calculate outbound costs (shipping)
   */
  private static async calculateOutboundCost(
    tx: Prisma.TransactionClient,
    transaction: CostCalculationInput,
    isAmazonWarehouse: boolean
  ) {
    // Find applicable outbound rate
    const costRate = await tx.costRate.findFirst({
      where: {
        warehouseId: transaction.warehouseId,
        costCategory: CostCategory.Carton,
        costName: { contains: 'Outbound' },
        effectiveDate: { lte: transaction.transactionDate },
        OR: [
          { endDate: null },
          { endDate: { gte: transaction.transactionDate } }
        ]
      },
      orderBy: { effectiveDate: 'desc' }
    })
    
    if (!costRate) {
      // console.warn(`No outbound cost rate found for warehouse ${transaction.warehouseId}`)
      return null
    }
    
    return {
      costCategory: CostCategory.Carton,
      costRateId: costRate.id,
      quantity: new Prisma.Decimal(transaction.cartonsOut),
      rate: costRate.costValue,
      amount: new Prisma.Decimal(transaction.cartonsOut).mul(costRate.costValue),
    }
  }
  
  /**
   * Calculate transfer costs
   */
  private static async calculateTransferCost(
    tx: Prisma.TransactionClient,
    transaction: CostCalculationInput
  ) {
    // Find applicable transfer rate
    const costRate = await tx.costRate.findFirst({
      where: {
        warehouseId: transaction.warehouseId,
        costCategory: CostCategory.Carton,
        costName: { contains: 'Transfer' },
        effectiveDate: { lte: transaction.transactionDate },
        OR: [
          { endDate: null },
          { endDate: { gte: transaction.transactionDate } }
        ]
      },
      orderBy: { effectiveDate: 'desc' }
    })
    
    if (!costRate) {
      // Transfers might not have costs in all warehouses
      return null
    }
    
    const quantity = Math.max(transaction.cartonsIn, transaction.cartonsOut)
    
    return {
      costCategory: CostCategory.Carton,
      costRateId: costRate.id,
      quantity: new Prisma.Decimal(quantity),
      rate: costRate.costValue,
      amount: new Prisma.Decimal(quantity).mul(costRate.costValue),
    }
  }
  
  /**
   * Update storage ledger entry for the current week
   * This is called after each transaction to keep the storage ledger current
   */
  private static async updateStorageLedgerEntry(
    tx: Prisma.TransactionClient,
    transaction: CostCalculationInput
  ) {
    const monday = startOfWeek(transaction.transactionDate, { weekStartsOn: 1 })
    const weekEndingDate = endOfWeek(monday, { weekStartsOn: 1 })
    
    // Get current inventory balance
    const balance = await tx.inventoryBalance.findUnique({
      where: {
        warehouseId_skuId_batchLot: {
          warehouseId: transaction.warehouseId,
          skuId: transaction.skuId,
          batchLot: transaction.batchLot,
        }
      }
    })
    
    if (!balance || balance.currentCartons === 0) {
      // No inventory to charge storage for
      return
    }
    
    // Get storage configuration
    const storageCartonsPerPallet = transaction.storageCartonsPerPallet || 
                                  balance.storageCartonsPerPallet || 
                                  1
    
    const storagePallets = Math.ceil(balance.currentCartons / storageCartonsPerPallet)
    
    // Find applicable storage rate
    const storageRate = await tx.costRate.findFirst({
      where: {
        warehouseId: transaction.warehouseId,
        costCategory: CostCategory.Storage,
        costName: { contains: 'pallet' },
        effectiveDate: { lte: monday },
        OR: [
          { endDate: null },
          { endDate: { gte: monday } }
        ]
      },
      orderBy: { effectiveDate: 'desc' }
    })
    
    if (!storageRate) {
      // console.warn(`No storage rate found for warehouse ${transaction.warehouseId}`)
      return
    }
    
    const slId = `SL-${format(monday, 'yyyy-MM-dd')}-${transaction.warehouseId}-${transaction.skuId}-${transaction.batchLot}`
    
    // Update or create storage ledger entry
    await tx.storageLedger.upsert({
      where: { slId },
      update: {
        cartonsEndOfMonday: balance.currentCartons,
        storagePalletsCharged: storagePallets,
        applicableWeeklyRate: storageRate.costValue,
        calculatedWeeklyCost: new Prisma.Decimal(storagePallets).mul(storageRate.costValue),
      },
      create: {
        slId,
        weekEndingDate,
        warehouseId: transaction.warehouseId,
        skuId: transaction.skuId,
        batchLot: transaction.batchLot,
        cartonsEndOfMonday: balance.currentCartons,
        storagePalletsCharged: storagePallets,
        applicableWeeklyRate: storageRate.costValue,
        calculatedWeeklyCost: new Prisma.Decimal(storagePallets).mul(storageRate.costValue),
        billingPeriodStart: this.getBillingPeriodStart(transaction.transactionDate),
        billingPeriodEnd: this.getBillingPeriodEnd(transaction.transactionDate),
      }
    })
  }
  
  /**
   * Calculate weekly storage costs for all inventory
   * This should be run weekly (typically on Monday morning)
   */
  static async calculateWeeklyStorageCosts(
    weekEndingDate: Date,
    userId: string,
    warehouseId?: string
  ) {
    const monday = startOfWeek(weekEndingDate, { weekStartsOn: 1 })
    
    // Get all active inventory balances
    const whereClause: Prisma.InventoryBalanceWhereInput = {
      currentCartons: { gt: 0 }
    }
    
    if (warehouseId) {
      whereClause.warehouseId = warehouseId
    }
    
    const balances = await prisma.inventoryBalance.findMany({
      where: whereClause,
      include: {
        warehouse: true,
        sku: true,
      }
    })
    
    let processed = 0
    let errors = 0
    
    for (const balance of balances) {
      try {
        // Skip Amazon warehouses (they have different storage calculation)
        const isAmazonWarehouse = balance.warehouse.code?.includes('AMZN') || 
                                 balance.warehouse.name.toLowerCase().includes('amazon')
        if (isAmazonWarehouse) continue
        
        await this.calculateStorageCostForBalance(
          balance,
          monday,
          weekEndingDate,
          userId
        )
        processed++
      } catch (error) {
        // console.error(`Error calculating storage for ${balance.warehouseId}/${balance.skuId}/${balance.batchLot}:`, error)
        errors++
      }
    }
    
    // console.log(`Storage calculation complete: ${processed} processed, ${errors} errors`)
    
    return { processed, errors }
  }
  
  /**
   * Calculate storage cost for a single inventory balance
   */
  private static async calculateStorageCostForBalance(
    balance: any,
    monday: Date,
    weekEndingDate: Date,
    userId: string
  ) {
    // Get point-in-time balance as of Monday
    const transactions = await prisma.inventoryTransaction.findMany({
      where: {
        warehouseId: balance.warehouseId,
        skuId: balance.skuId,
        batchLot: balance.batchLot,
        transactionDate: { lte: monday }
      },
      orderBy: { transactionDate: 'asc' }
    })
    
    // Calculate balance as of Monday
    let cartonsAsOfMonday = 0
    for (const transaction of transactions) {
      cartonsAsOfMonday += transaction.cartonsIn - transaction.cartonsOut
    }
    
    if (cartonsAsOfMonday <= 0) return
    
    // Get storage configuration
    const storageCartonsPerPallet = balance.storageCartonsPerPallet || 1
    const storagePallets = Math.ceil(cartonsAsOfMonday / storageCartonsPerPallet)
    
    // Find applicable storage rate
    const storageRate = await prisma.costRate.findFirst({
      where: {
        warehouseId: balance.warehouseId,
        costCategory: CostCategory.Storage,
        costName: { contains: 'pallet' },
        effectiveDate: { lte: monday },
        OR: [
          { endDate: null },
          { endDate: { gte: monday } }
        ]
      },
      orderBy: { effectiveDate: 'desc' }
    })
    
    if (!storageRate) {
      // console.warn(`No storage rate found for warehouse ${balance.warehouse.name}`)
      return
    }
    
    const slId = `SL-${format(monday, 'yyyy-MM-dd')}-${balance.warehouse.code}-${balance.sku.skuCode}-${balance.batchLot}`
    
    // Create or update storage ledger entry
    await prisma.storageLedger.upsert({
      where: { slId },
      update: {
        cartonsEndOfMonday: cartonsAsOfMonday,
        storagePalletsCharged: storagePallets,
        applicableWeeklyRate: storageRate.costValue,
        calculatedWeeklyCost: new Prisma.Decimal(storagePallets).mul(storageRate.costValue),
      },
      create: {
        slId,
        weekEndingDate,
        warehouseId: balance.warehouseId,
        skuId: balance.skuId,
        batchLot: balance.batchLot,
        cartonsEndOfMonday: cartonsAsOfMonday,
        storagePalletsCharged: storagePallets,
        applicableWeeklyRate: storageRate.costValue,
        calculatedWeeklyCost: new Prisma.Decimal(storagePallets).mul(storageRate.costValue),
        billingPeriodStart: this.getBillingPeriodStart(monday),
        billingPeriodEnd: this.getBillingPeriodEnd(monday),
      }
    })
    
    // Create calculated cost record
    const calculatedCostId = `CC-STORAGE-${format(monday, 'yyyy-MM-dd')}-${balance.warehouseId}-${balance.skuId}-${balance.batchLot}`
    
    await prisma.calculatedCost.upsert({
      where: { calculatedCostId },
      update: {
        quantityCharged: new Prisma.Decimal(storagePallets),
        applicableRate: storageRate.costValue,
        calculatedCost: new Prisma.Decimal(storagePallets).mul(storageRate.costValue),
        finalExpectedCost: new Prisma.Decimal(storagePallets).mul(storageRate.costValue),
      },
      create: {
        calculatedCostId,
        transactionType: 'STORAGE',
        transactionReferenceId: slId,
        costRateId: storageRate.id,
        warehouseId: balance.warehouseId,
        skuId: balance.skuId,
        batchLot: balance.batchLot,
        transactionDate: monday,
        billingWeekEnding: weekEndingDate,
        billingPeriodStart: this.getBillingPeriodStart(monday),
        billingPeriodEnd: this.getBillingPeriodEnd(monday),
        quantityCharged: new Prisma.Decimal(storagePallets),
        applicableRate: storageRate.costValue,
        calculatedCost: new Prisma.Decimal(storagePallets).mul(storageRate.costValue),
        finalExpectedCost: new Prisma.Decimal(storagePallets).mul(storageRate.costValue),
        createdById: userId,
      }
    })
  }
  
  /**
   * Get billing period start date (16th of current or previous month)
   */
  private static getBillingPeriodStart(date: Date): Date {
    const day = date.getDate()
    if (day >= 16) {
      // Current month's 16th
      return new Date(date.getFullYear(), date.getMonth(), 16)
    } else {
      // Previous month's 16th
      return new Date(date.getFullYear(), date.getMonth() - 1, 16)
    }
  }
  
  /**
   * Get billing period end date (15th of current or next month)
   */
  private static getBillingPeriodEnd(date: Date): Date {
    const day = date.getDate()
    if (day >= 16) {
      // Next month's 15th
      return new Date(date.getFullYear(), date.getMonth() + 1, 15)
    } else {
      // Current month's 15th
      return new Date(date.getFullYear(), date.getMonth(), 15)
    }
  }
  
  /**
   * Recalculate costs for a specific transaction
   * Used for corrections and adjustments
   */
  static async recalculateTransactionCosts(
    transactionId: string,
    userId: string
  ) {
    const transaction = await prisma.inventoryTransaction.findUnique({
      where: { transactionId },
      include: {
        warehouse: true,
        sku: true,
      }
    })
    
    if (!transaction) {
      throw new Error('Transaction not found')
    }
    
    // Delete existing calculated costs
    await prisma.calculatedCost.deleteMany({
      where: { transactionReferenceId: transactionId }
    })
    
    // Recalculate
    const input: CostCalculationInput = {
      transactionId: transaction.transactionId,
      warehouseId: transaction.warehouseId,
      skuId: transaction.skuId,
      batchLot: transaction.batchLot,
      transactionType: transaction.transactionType,
      transactionDate: transaction.transactionDate,
      cartonsIn: transaction.cartonsIn,
      cartonsOut: transaction.cartonsOut,
      storagePalletsIn: transaction.storagePalletsIn,
      shippingPalletsOut: transaction.shippingPalletsOut,
      storageCartonsPerPallet: transaction.storageCartonsPerPallet || undefined,
      shippingCartonsPerPallet: transaction.shippingCartonsPerPallet || undefined,
    }
    
    return this.calculateTransactionCosts(input, userId)
  }
}