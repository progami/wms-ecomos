// Legacy invoice service - maintains backward compatibility while using new secure service
import { PrismaClient, InvoiceStatus, CostCategory } from '@prisma/client';
import { InvoiceService } from './services/invoice-service';
import { generateInvoiceNumber, withTransaction, withLock } from './database/transaction-utils';
import { Money, validatePositiveAmount, createAuditEntry } from './financial/money-utils';
import { validateEmail } from './security/input-sanitization';
import { auditLog } from './security/audit-logger';

const prisma = new PrismaClient();

export interface CreateInvoiceInput {
  warehouseId: string;
  customerId: string;
  issueDate: Date;
  dueDate: Date;
  lineItems: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    amount: number;
  }>;
  taxRate?: number;
  currency?: string;
  notes?: string;
}

// Updated to use new secure service
export async function createInvoice(input: CreateInvoiceInput, userId: string) {
  // Validate inputs
  for (const item of input.lineItems) {
    if (!validatePositiveAmount(item.unitPrice)) {
      throw new Error('Invalid unit price');
    }
    if (!validatePositiveAmount(item.amount)) {
      throw new Error('Invalid line item amount');
    }
  }

  // Map to new service format
  const mappedData = {
    warehouseId: input.warehouseId,
    customerId: input.customerId,
    billingPeriodStart: input.issueDate,
    billingPeriodEnd: input.issueDate,
    invoiceDate: input.issueDate,
    dueDate: input.dueDate,
    currency: input.currency || 'USD',
    lineItems: input.lineItems.map(item => ({
      costCategory: CostCategory.Unit, // Default category for legacy items
      costName: item.description,
      quantity: item.quantity,
      unitRate: item.unitPrice,
      amount: item.amount,
    })),
    notes: input.notes,
  };

  // Use new secure service
  const result = await InvoiceService.createInvoice(mappedData, userId);
  
  // Return in legacy format
  return {
    id: result.id,
    invoiceNumber: result.invoiceNumber,
    warehouseId: result.warehouseId,
    customerId: result.customerId,
    status: 'draft', // Legacy always starts as draft
    issueDate: result.issueDate,
    dueDate: result.dueDate,
    subtotal: result.subtotal.toNumber(),
    taxAmount: result.taxAmount.toNumber(),
    totalAmount: result.totalAmount.toNumber(),
    paidAmount: result.paidAmount.toNumber(),
    currency: result.currency,
    notes: result.notes,
  };
}

export async function processPayment(
  invoiceId: string,
  paymentAmount: number,
  paymentMethod: string,
  userId: string
) {
  if (!validatePositiveAmount(paymentAmount)) {
    throw new Error('Invalid payment amount');
  }

  // Map to new service format
  const paymentData = {
    amount: paymentAmount,
    paymentMethod,
    paymentReference: `LEGACY-${Date.now()}`,
    paymentDate: new Date(),
  };

  // Use new secure service
  const result = await InvoiceService.processPayment(invoiceId, paymentData, userId);
  
  return result.invoice;
}

export async function closeMonthlyInvoices(month: number, year: number, userId: string) {
  const lockKey = `monthly-closing:${year}-${month}`;

  return withLock('invoice', lockKey, async () => {
    return withTransaction(async (tx) => {
      // Get all draft invoices for the month
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59);

      const draftInvoices = await tx.invoice.findMany({
        where: {
          status: InvoiceStatus.pending,
          invoiceDate: {
            gte: startDate,
            lte: endDate
          }
        }
      });

      const results = [];

      for (const invoice of draftInvoices) {
        // Update to reconciled
        const updated = await tx.invoice.update({
          where: { id: invoice.id },
          data: {
            status: InvoiceStatus.reconciled,
            updatedAt: new Date()
          }
        });

        // Create related ledger entry
        const slId = `SL-${invoice.warehouseId}-${year}${String(month).padStart(2, '0')}`;
        await tx.storageLedger.create({
          data: {
            slId,
            weekEndingDate: endDate,
            warehouseId: invoice.warehouseId,
            skuId: 'aggregate', // Would need proper SKU mapping
            batchLot: 'MONTHLY',
            cartonsEndOfMonday: 0,
            storagePalletsCharged: 0,
            applicableWeeklyRate: 0,
            calculatedWeeklyCost: invoice.totalAmount,
            billingPeriodStart: startDate,
            billingPeriodEnd: endDate,
          }
        });

        results.push(updated);
      }

      // Create audit entry for batch operation
      await auditLog({
        entityType: 'monthly_closing',
        entityId: `${year}-${month}`,
        action: 'close',
        userId,
        data: {
          month,
          year,
          invoicesProcessed: results.length,
          invoiceIds: results.map(inv => inv.id)
        }
      });

      return results;
    });
  });
}

export async function getInvoiceWithValidation(invoiceId: string, userId: string, userWarehouseId?: string) {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      warehouse: true,
      customer: true
    }
  });

  if (!invoice) {
    throw new Error('Invoice not found');
  }

  // Check warehouse access for staff users
  if (userWarehouseId && invoice.warehouseId !== userWarehouseId) {
    throw new Error('Access denied: Invoice belongs to different warehouse');
  }

  return invoice;
}