import { CostCalculationService } from '@/lib/services/cost-calculation-service'
import { auditLog } from '@/lib/security/audit-logger'
import { TransactionType } from '@prisma/client'
import { z } from 'zod'

// Retry configuration
const MAX_RETRIES = 3
const RETRY_DELAY_MS = 1000

// Queue for processing cost calculations
interface CostCalculationJob {
  transactionId: string
  transactionData: {
    warehouseId: string
    skuId: string
    batchLot: string
    transactionType: TransactionType
    transactionDate: Date
    cartonsIn: number
    cartonsOut: number
    storagePalletsIn: number
    shippingPalletsOut: number
    storageCartonsPerPallet?: number
    shippingCartonsPerPallet?: number
  }
  userId: string
  retryCount: number
}

// In-memory queue for demonstration - in production, use a proper queue service
const costCalculationQueue: CostCalculationJob[] = []
let isProcessing = false

/**
 * Trigger cost calculations after an inventory transaction is created
 * This is called from the inventory transaction API
 */
export async function triggerCostCalculation(
  transaction: {
    transactionId: string
    warehouseId: string
    skuId: string
    batchLot: string
    transactionType: TransactionType
    transactionDate: Date
    cartonsIn: number
    cartonsOut: number
    storagePalletsIn: number
    shippingPalletsOut: number
    storageCartonsPerPallet?: number
    shippingCartonsPerPallet?: number
  },
  userId: string
) {
  try {
    // Add to queue
    costCalculationQueue.push({
      transactionId: transaction.transactionId,
      transactionData: transaction,
      userId,
      retryCount: 0,
    })
    
    // Process queue if not already processing
    if (!isProcessing) {
      processQueue()
    }
    
    // Log the trigger
    await auditLog({
      entityType: 'CostCalculation',
      entityId: transaction.transactionId,
      action: 'TRIGGER',
      userId,
      data: {
        transactionType: transaction.transactionType,
        warehouseId: transaction.warehouseId,
        skuId: transaction.skuId,
        batchLot: transaction.batchLot,
      }
    })
  } catch (error) {
    // console.error('Error triggering cost calculation:', error)
    // Don't throw - we don't want to fail the transaction creation
  }
}

/**
 * Process the cost calculation queue
 */
async function processQueue() {
  if (isProcessing || costCalculationQueue.length === 0) {
    return
  }
  
  isProcessing = true
  
  try {
    while (costCalculationQueue.length > 0) {
      const job = costCalculationQueue.shift()
      if (!job) continue
      
      try {
        // Calculate costs
        const costs = await CostCalculationService.calculateTransactionCosts(
          {
            transactionId: job.transactionId,
            ...job.transactionData,
          },
          job.userId
        )
        
        // Log successful calculation
        await auditLog({
          entityType: 'CostCalculation',
          entityId: job.transactionId,
          action: 'COMPLETE',
          userId: job.userId,
          data: {
            costsCalculated: costs.length,
            totalAmount: costs.reduce((sum, c) => sum + Number(c.calculatedCost), 0),
          }
        })
      } catch (error) {
        // console.error(`Error calculating costs for transaction ${job.transactionId}:`, error)
        
        // Retry logic
        if (job.retryCount < MAX_RETRIES) {
          job.retryCount++
          
          // Add back to queue with delay
          setTimeout(() => {
            costCalculationQueue.push(job)
            if (!isProcessing) {
              processQueue()
            }
          }, RETRY_DELAY_MS * job.retryCount)
          
          // Log retry
          await auditLog({
            entityType: 'CostCalculation',
            entityId: job.transactionId,
            action: 'RETRY',
            userId: job.userId,
            data: {
              retryCount: job.retryCount,
              error: error instanceof Error ? error.message : 'Unknown error',
            }
          })
        } else {
          // Max retries exceeded - log failure
          await auditLog({
            entityType: 'CostCalculation',
            entityId: job.transactionId,
            action: 'FAILED',
            userId: job.userId,
            data: {
              error: error instanceof Error ? error.message : 'Unknown error',
              maxRetriesExceeded: true,
            }
          })
        }
      }
    }
  } finally {
    isProcessing = false
  }
}

/**
 * Trigger storage ledger update after inventory changes
 * This updates the current week's storage ledger entry
 */
export async function triggerStorageLedgerUpdate(
  transaction: {
    warehouseId: string
    skuId: string
    batchLot: string
    transactionDate: Date
  },
  userId: string
) {
  try {
    // Storage ledger updates are handled within the cost calculation service
    // This is just a placeholder for any additional storage-specific logic
    
    await auditLog({
      entityType: 'StorageLedger',
      entityId: `${transaction.warehouseId}-${transaction.skuId}-${transaction.batchLot}`,
      action: 'UPDATE_TRIGGERED',
      userId,
      data: {
        transactionDate: transaction.transactionDate,
      }
    })
  } catch (error) {
    // console.error('Error triggering storage ledger update:', error)
    // Don't throw - we don't want to fail the transaction creation
  }
}

/**
 * Weekly trigger for storage cost calculations
 * This should be called by a cron job every Monday morning
 */
export async function triggerWeeklyStorageCalculation(
  weekEndingDate: Date,
  systemUserId: string,
  warehouseId?: string
) {
  try {
    // console.log(`Starting weekly storage calculation for week ending ${weekEndingDate}`)
    
    const result = await CostCalculationService.calculateWeeklyStorageCosts(
      weekEndingDate,
      systemUserId,
      warehouseId
    )
    
    await auditLog({
      entityType: 'StorageCalculation',
      entityId: `WEEKLY-${weekEndingDate.toISOString()}`,
      action: 'COMPLETE',
      userId: systemUserId,
      data: {
        weekEndingDate,
        processed: result.processed,
        errors: result.errors,
        warehouseId,
      }
    })
    
    return result
  } catch (error) {
    // console.error('Error in weekly storage calculation:', error)
    
    await auditLog({
      entityType: 'StorageCalculation',
      entityId: `WEEKLY-${weekEndingDate.toISOString()}`,
      action: 'FAILED',
      userId: systemUserId,
      data: {
        error: error instanceof Error ? error.message : 'Unknown error',
        weekEndingDate,
        warehouseId,
      }
    })
    
    throw error
  }
}

/**
 * Handle cost calculation errors with proper logging and notification
 */
export async function handleCostCalculationError(
  transactionId: string,
  error: Error,
  userId: string
) {
  // console.error(`Cost calculation error for transaction ${transactionId}:`, error)
  
  await auditLog({
    entityType: 'CostCalculation',
    entityId: transactionId,
    action: 'ERROR',
    userId,
    data: {
      error: error.message,
      stack: error.stack,
    }
  })
  
  // In production, send notification to finance team
  // await notifyFinanceTeam({
  //   type: 'COST_CALCULATION_ERROR',
  //   transactionId,
  //   error: error.message,
  // })
}

/**
 * Validate transaction data before triggering cost calculation
 */
export function validateTransactionForCostCalculation(transaction: any): boolean {
  try {
    // Define validation schema
    const schema = z.object({
      transactionId: z.string().min(1),
      warehouseId: z.string().uuid(),
      skuId: z.string().uuid(),
      batchLot: z.string().min(1),
      transactionType: z.nativeEnum(TransactionType),
      transactionDate: z.date(),
      cartonsIn: z.number().int().min(0),
      cartonsOut: z.number().int().min(0),
    })
    
    schema.parse(transaction)
    return true
  } catch (error) {
    // console.error('Transaction validation failed:', error)
    return false
  }
}

/**
 * Check if cost calculation is needed for a transaction type
 */
export function shouldCalculateCosts(transactionType: TransactionType): boolean {
  // Costs are calculated for all transaction types
  return [
    TransactionType.RECEIVE,
    TransactionType.SHIP,
    TransactionType.TRANSFER,
    TransactionType.ADJUST_IN,
    TransactionType.ADJUST_OUT,
  ].includes(transactionType)
}

/**
 * Get pending cost calculations (for monitoring)
 */
export function getPendingCostCalculations(): number {
  return costCalculationQueue.length
}

/**
 * Clear the cost calculation queue (for testing)
 */
export function clearCostCalculationQueue(): void {
  costCalculationQueue.length = 0
}