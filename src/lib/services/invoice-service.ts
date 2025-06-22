import { Prisma, InvoiceStatus, CostCategory } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { withTransaction, TransactionOptions } from '@/lib/database/transaction-utils'
import { auditLog } from '@/lib/security/audit-logger'
import { Money, MoneyCalculator } from '@/lib/financial/money-utils'
import { getCurrentDateTimeInTimezone } from '@/lib/financial/timezone-utils'
import { validateInvoiceData } from '@/lib/financial/invoice-validator'
import { z } from 'zod'
import Decimal from 'decimal.js'

// Input validation schemas
const invoiceLineItemSchema = z.object({
  costCategory: z.nativeEnum(CostCategory),
  costName: z.string().min(1).max(200),
  quantity: z.number().positive(),
  unitRate: z.number().positive().optional(),
  amount: z.number().positive(),
})

const createInvoiceSchema = z.object({
  warehouseId: z.string().uuid(),
  customerId: z.string().uuid(),
  billingPeriodStart: z.date(),
  billingPeriodEnd: z.date(),
  invoiceDate: z.date(),
  dueDate: z.date().optional(),
  currency: z.string().default('USD'),
  lineItems: z.array(invoiceLineItemSchema).min(1),
  notes: z.string().optional(),
})

const paymentSchema = z.object({
  amount: z.number().positive(),
  paymentMethod: z.string().min(1),
  paymentReference: z.string().min(1),
  paymentDate: z.date(),
})

type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>
type PaymentInput = z.infer<typeof paymentSchema>

export class InvoiceService {
  /**
   * Create an invoice with proper financial calculations
   */
  static async createInvoice(
    input: CreateInvoiceInput,
    userId: string,
    options: TransactionOptions = {}
  ) {
    // Validate input
    const validatedInput = createInvoiceSchema.parse(input)
    
    // Validate business rules
    const validation = await validateInvoiceData({
      ...validatedInput,
      subtotal: 0, // Will be calculated
      taxAmount: 0,
      totalAmount: 0,
    })
    
    if (!validation.valid) {
      throw new Error(`Invoice validation failed: ${validation.errors.join(', ')}`)
    }

    return withTransaction(async (tx) => {
      // Calculate totals using Money class for precision
      const calculator = new MoneyCalculator(validatedInput.currency)
      let subtotal = new Money(0, validatedInput.currency)
      
      // Process line items
      const lineItemsData = validatedInput.lineItems.map(item => {
        const amount = new Money(item.amount, validatedInput.currency)
        subtotal = subtotal.add(amount)
        
        return {
          costCategory: item.costCategory,
          costName: item.costName,
          quantity: item.quantity,
          unitRate: item.unitRate || null,
          amount: item.amount,
        }
      })
      
      // Calculate tax (example: 10% tax rate)
      const TAX_RATE = 0.10
      const taxAmount = subtotal.multiply(TAX_RATE)
      const totalAmount = subtotal.add(taxAmount)
      
      // Generate invoice number
      const invoiceNumber = await generateInvoiceNumber(tx, validatedInput.warehouseId)
      
      // Get billing month/year
      const billingMonth = validatedInput.billingPeriodEnd.getMonth() + 1
      const billingYear = validatedInput.billingPeriodEnd.getFullYear()
      
      // Create invoice
      const invoice = await tx.invoice.create({
        data: {
          invoiceNumber,
          warehouseId: validatedInput.warehouseId,
          customerId: validatedInput.customerId,
          billingPeriodStart: validatedInput.billingPeriodStart,
          billingPeriodEnd: validatedInput.billingPeriodEnd,
          invoiceDate: validatedInput.invoiceDate,
          issueDate: getCurrentDateTimeInTimezone('UTC'),
          dueDate: validatedInput.dueDate || addDays(validatedInput.invoiceDate, 30),
          subtotal: subtotal.toNumber(),
          taxAmount: taxAmount.toNumber(),
          totalAmount: totalAmount.toNumber(),
          currency: validatedInput.currency,
          status: InvoiceStatus.pending,
          notes: validatedInput.notes,
          createdById: userId,
          billingMonth,
          billingYear,
          lineItems: {
            create: lineItemsData,
          },
        },
        include: {
          lineItems: true,
          warehouse: true,
          customer: true,
        },
      })
      
      // Create audit log
      await auditLog({
        entityType: 'Invoice',
        entityId: invoice.id,
        action: 'CREATE',
        userId,
        data: {
          invoiceNumber: invoice.invoiceNumber,
          totalAmount: totalAmount.format(),
          lineItemCount: lineItemsData.length,
        },
      })
      
      // Create invoice audit log
      await tx.invoiceAuditLog.create({
        data: {
          invoiceId: invoice.id,
          action: 'CREATED',
          performedBy: userId,
          details: {
            subtotal: subtotal.format(),
            taxAmount: taxAmount.format(),
            totalAmount: totalAmount.format(),
            lineItems: lineItemsData.length,
          },
        },
      })
      
      return invoice
    }, {
      ...options,
      isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
    })
  }

  /**
   * Process payment for an invoice
   */
  static async processPayment(
    invoiceId: string,
    payment: PaymentInput,
    userId: string,
    options: TransactionOptions = {}
  ) {
    const validatedPayment = paymentSchema.parse(payment)
    
    return withTransaction(async (tx) => {
      // Lock the invoice for update
      const invoice = await tx.invoice.findUnique({
        where: { id: invoiceId },
        // @ts-ignore
        lock: 'UPDATE',
      })
      
      if (!invoice) {
        throw new Error('Invoice not found')
      }
      
      if (invoice.status === InvoiceStatus.paid) {
        throw new Error('Invoice is already paid')
      }
      
      // Calculate new paid amount
      const paymentAmount = new Money(validatedPayment.amount, invoice.currency)
      const currentPaidAmount = new Money(invoice.paidAmount.toNumber(), invoice.currency)
      const newPaidAmount = currentPaidAmount.add(paymentAmount)
      const totalAmount = new Money(invoice.totalAmount.toNumber(), invoice.currency)
      
      // Check if overpayment
      if (newPaidAmount.getAmount() > totalAmount.getAmount()) {
        throw new Error(`Payment would exceed invoice total by ${newPaidAmount.subtract(totalAmount).format()}`)
      }
      
      // Create payment record
      const paymentRecord = await tx.payment.create({
        data: {
          invoiceId,
          amount: validatedPayment.amount,
          method: validatedPayment.paymentMethod,
          status: 'completed',
          processedAt: validatedPayment.paymentDate,
        },
      })
      
      // Update invoice
      const isPaid = newPaidAmount.equals(totalAmount)
      const updatedInvoice = await tx.invoice.update({
        where: { id: invoiceId },
        data: {
          paidAmount: newPaidAmount.toNumber(),
          status: isPaid ? InvoiceStatus.paid : invoice.status,
          paymentMethod: validatedPayment.paymentMethod,
          paymentReference: validatedPayment.paymentReference,
          paymentDate: validatedPayment.paymentDate,
          paidDate: isPaid ? validatedPayment.paymentDate : null,
          paidAt: isPaid ? getCurrentDateTimeInTimezone('UTC') : null,
          paidBy: isPaid ? userId : null,
        },
      })
      
      // Audit logs
      await auditLog({
        entityType: 'Invoice',
        entityId: invoiceId,
        action: 'PAYMENT',
        userId,
        data: {
          paymentAmount: paymentAmount.format(),
          newPaidAmount: newPaidAmount.format(),
          isPaid,
          paymentMethod: validatedPayment.paymentMethod,
        },
      })
      
      await tx.invoiceAuditLog.create({
        data: {
          invoiceId,
          action: isPaid ? 'PAID' : 'UPDATED',
          performedBy: userId,
          details: {
            paymentAmount: paymentAmount.format(),
            totalPaid: newPaidAmount.format(),
            paymentMethod: validatedPayment.paymentMethod,
            paymentReference: validatedPayment.paymentReference,
          },
        },
      })
      
      return { invoice: updatedInvoice, payment: paymentRecord }
    }, {
      ...options,
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    })
  }

  /**
   * Calculate invoice totals from line items
   */
  static calculateTotals(
    lineItems: Array<{ amount: number }>,
    currency: string,
    taxRate: number = 0.10
  ) {
    const calculator = new MoneyCalculator(currency)
    
    const subtotal = lineItems.reduce((sum, item) => {
      return sum.add(new Money(item.amount, currency))
    }, new Money(0, currency))
    
    const taxAmount = subtotal.multiply(taxRate)
    const totalAmount = subtotal.add(taxAmount)
    
    return {
      subtotal: subtotal.getAmount(),
      taxAmount: taxAmount.getAmount(),
      totalAmount: totalAmount.getAmount(),
    }
  }

  /**
   * Get invoices with pagination and filtering
   */
  static async getInvoices(
    filters: {
      warehouseId?: string
      customerId?: string
      status?: InvoiceStatus
      startDate?: Date
      endDate?: Date
    },
    pagination: {
      page: number
      limit: number
      sortBy?: string
      sortOrder?: 'asc' | 'desc'
    }
  ) {
    const where: Prisma.InvoiceWhereInput = {}
    
    if (filters.warehouseId) where.warehouseId = filters.warehouseId
    if (filters.customerId) where.customerId = filters.customerId
    if (filters.status) where.status = filters.status
    
    if (filters.startDate || filters.endDate) {
      where.invoiceDate = {}
      if (filters.startDate) where.invoiceDate.gte = filters.startDate
      if (filters.endDate) where.invoiceDate.lte = filters.endDate
    }
    
    const total = await prisma.invoice.count({ where })
    
    const invoices = await prisma.invoice.findMany({
      where,
      include: {
        warehouse: true,
        customer: true,
        lineItems: true,
        _count: {
          select: {
            disputes: true,
            payments: true,
          },
        },
      },
      orderBy: {
        [pagination.sortBy || 'createdAt']: pagination.sortOrder || 'desc',
      },
      skip: (pagination.page - 1) * pagination.limit,
      take: pagination.limit,
    })
    
    return {
      data: invoices,
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total,
        totalPages: Math.ceil(total / pagination.limit),
      },
    }
  }
}

// Helper function to generate unique invoice number
async function generateInvoiceNumber(
  tx: Prisma.TransactionClient,
  warehouseId: string
): Promise<string> {
  const warehouse = await tx.warehouse.findUnique({
    where: { id: warehouseId },
  })
  
  const prefix = warehouse?.code || 'INV'
  const year = new Date().getFullYear()
  const month = String(new Date().getMonth() + 1).padStart(2, '0')
  
  // Get the latest invoice for this warehouse in the current month
  const latestInvoice = await tx.invoice.findFirst({
    where: {
      warehouseId,
      invoiceNumber: {
        startsWith: `${prefix}-${year}${month}`,
      },
    },
    orderBy: {
      invoiceNumber: 'desc',
    },
  })
  
  let sequence = 1
  if (latestInvoice) {
    const match = latestInvoice.invoiceNumber.match(/-(\d+)$/)
    if (match) {
      sequence = parseInt(match[1]) + 1
    }
  }
  
  return `${prefix}-${year}${month}-${String(sequence).padStart(4, '0')}`
}

// Helper function to add days to a date
function addDays(date: Date, days: number): Date {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}