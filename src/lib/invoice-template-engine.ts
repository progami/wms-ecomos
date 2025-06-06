import prisma from '@/lib/prisma'
import { 
  InvoiceTemplate, 
  InvoiceTemplateRule, 
  TransactionType,
  CalculationType 
} from '@/types/invoice-templates'

interface TransactionData {
  id: string
  transactionType: TransactionType
  warehouseId: string
  skuId: string
  cartonsIn: number
  cartonsOut: number
  storagePalletsIn: number
  shippingPalletsOut: number
  transactionDate: Date
  referenceId?: string
  shipName?: string
  containerNumber?: string
}

interface CalculatedCharge {
  transactionId: string
  ruleId: string
  costCategory: string
  costName: string
  quantity: number
  unitRate: number
  totalAmount: number
  unitOfMeasure: string
  notes?: string
}

export class InvoiceTemplateEngine {
  private template: InvoiceTemplate | null = null
  private costRates: Map<string, any> = new Map()

  async loadTemplate(warehouseId: string, templateId?: string): Promise<void> {
    // Note: In a real implementation, this would load from the database
    // For now, we'll create a mock template based on the warehouse defaults
    const mockTemplate: InvoiceTemplate = {
      id: templateId || 'default',
      name: 'Default Template',
      warehouseId,
      warehouse: {
        id: warehouseId,
        name: 'Warehouse',
        code: 'WH'
      },
      isActive: true,
      isDefault: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdById: 'system',
      createdBy: {
        id: 'system',
        fullName: 'System'
      },
      rules: []
    }
    
    this.template = mockTemplate

    if (!this.template) {
      throw new Error(`No active template found for warehouse ${warehouseId}`)
    }

    // Load cost rates for RATE_TABLE calculations
    await this.loadCostRates(warehouseId)
  }

  private async loadCostRates(warehouseId: string): Promise<void> {
    // Note: In a real implementation, this would load from the database
    // For now, we'll use empty rates
    this.costRates = new Map()
  }

  calculateCharges(transactions: TransactionData[]): CalculatedCharge[] {
    if (!this.template) {
      throw new Error('No template loaded')
    }

    const charges: CalculatedCharge[] = []

    for (const transaction of transactions) {
      // Find applicable rules for this transaction type
      const applicableRules = this.template.rules
        .filter(rule => rule.transactionType === transaction.transactionType)
        .filter(rule => rule.includeInInvoice)
        .sort((a, b) => (a.priority || 0) - (b.priority || 0))

      for (const rule of applicableRules) {
        // Check if rule applies to this SKU
        if (!rule.applyToAllSkus && rule.specificSkuIds.length > 0) {
          if (!rule.specificSkuIds.includes(transaction.skuId)) {
            continue
          }
        }

        // Calculate quantity based on unit of measure
        const quantity = this.calculateQuantity(transaction, rule.unitOfMeasure)
        if (quantity === 0) continue

        // Calculate rate based on calculation type
        const rate = this.calculateRate(rule, quantity, transaction)
        if (rate === 0) continue

        // Apply min/max charges
        let totalAmount = quantity * rate
        if (rule.minCharge && totalAmount < rule.minCharge) {
          totalAmount = rule.minCharge
        }
        if (rule.maxCharge && totalAmount > rule.maxCharge) {
          totalAmount = rule.maxCharge
        }

        charges.push({
          transactionId: transaction.id,
          ruleId: rule.id,
          costCategory: rule.costCategory,
          costName: rule.costName,
          quantity,
          unitRate: rate,
          totalAmount,
          unitOfMeasure: rule.unitOfMeasure,
          notes: rule.notes
        })
      }
    }

    return charges
  }

  private calculateQuantity(transaction: TransactionData, unitOfMeasure: string): number {
    switch (unitOfMeasure.toLowerCase()) {
      case 'carton':
        return transaction.cartonsIn + transaction.cartonsOut
      case 'pallet':
        return transaction.storagePalletsIn + transaction.shippingPalletsOut
      case 'container':
        // Count unique containers
        return transaction.containerNumber ? 1 : 0
      case 'shipment':
        // Count as 1 per transaction
        return 1
      case 'unit':
        // Would need SKU data to calculate units
        // For now, return cartons as placeholder
        return transaction.cartonsIn + transaction.cartonsOut
      default:
        return 0
    }
  }

  private calculateRate(
    rule: InvoiceTemplateRule, 
    quantity: number, 
    transaction: TransactionData
  ): number {
    switch (rule.calculationType) {
      case 'FIXED_RATE':
        return rule.rateValue || 0

      case 'PERCENTAGE':
        // Would need base cost to calculate percentage
        // This is a placeholder
        return 0

      case 'TIERED':
        // Implement tiered pricing based on conditions
        if (rule.conditions) {
          // Parse conditions and apply tiered rates
          // This is a simplified example
          for (const condition of rule.conditions) {
            if (condition.field === 'quantity') {
              if (condition.operator === 'less_than' && quantity < condition.value) {
                // Return the rate specified in the next condition
                const rateCondition = rule.conditions.find(c => c.field === 'rate')
                return rateCondition?.value || 0
              }
            }
          }
        }
        return rule.rateValue || 0

      case 'RATE_TABLE':
        // Look up rate from cost_rates table
        const key = `${rule.costCategory}-${rule.costName}`
        const costRate = this.costRates.get(key)
        return costRate ? parseFloat(costRate.costValue) : 0

      case 'CUSTOM_FORMULA':
        // Would implement custom formula evaluation
        // This is a placeholder
        return 0

      default:
        return 0
    }
  }

  // Aggregate charges by category for invoice line items
  aggregateCharges(charges: CalculatedCharge[]): any[] {
    const aggregated = new Map<string, any>()

    for (const charge of charges) {
      const key = `${charge.costCategory}-${charge.costName}`
      
      if (aggregated.has(key)) {
        const existing = aggregated.get(key)
        existing.quantity += charge.quantity
        existing.totalAmount += charge.totalAmount
        existing.transactionCount += 1
      } else {
        aggregated.set(key, {
          costCategory: charge.costCategory,
          costName: charge.costName,
          quantity: charge.quantity,
          unitRate: charge.unitRate,
          totalAmount: charge.totalAmount,
          unitOfMeasure: charge.unitOfMeasure,
          transactionCount: 1
        })
      }
    }

    return Array.from(aggregated.values())
  }
}