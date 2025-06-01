import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

// GET /api/invoices/[id] - Get invoice details
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const invoice = await prisma.invoice.findUnique({
      where: { id: params.id },
      include: {
        warehouse: {
          select: {
            id: true,
            code: true,
            name: true,
            address: true,
            contactEmail: true,
            contactPhone: true
          }
        },
        lineItems: {
          orderBy: { createdAt: 'asc' }
        },
        reconciliations: {
          include: {
            resolvedBy: {
              select: {
                id: true,
                fullName: true,
                email: true
              }
            }
          },
          orderBy: { createdAt: 'asc' }
        },
        createdBy: {
          select: {
            id: true,
            fullName: true,
            email: true
          }
        }
      }
    })

    if (!invoice) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      )
    }

    // Calculate summary statistics
    const summary = {
      totalLineItems: invoice.lineItems.length,
      totalReconciliations: invoice.reconciliations.length,
      matchedItems: invoice.reconciliations.filter(r => r.status === 'match').length,
      overbilledItems: invoice.reconciliations.filter(r => r.status === 'overbilled').length,
      underbilledItems: invoice.reconciliations.filter(r => r.status === 'underbilled').length,
      totalExpected: invoice.reconciliations.reduce((sum, r) => sum + Number(r.expectedAmount), 0),
      totalInvoiced: invoice.reconciliations.reduce((sum, r) => sum + Number(r.invoicedAmount), 0),
      totalDifference: invoice.reconciliations.reduce((sum, r) => sum + Number(r.difference), 0)
    }

    return NextResponse.json({
      invoice,
      summary
    })
  } catch (error) {
    console.error('Error fetching invoice:', error)
    return NextResponse.json(
      { error: 'Failed to fetch invoice' },
      { status: 500 }
    )
  }
}

// PUT /api/invoices/[id] - Update invoice
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    
    // Validate that invoice exists
    const existingInvoice = await prisma.invoice.findUnique({
      where: { id: params.id }
    })

    if (!existingInvoice) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      )
    }

    // Don't allow editing paid invoices
    if (existingInvoice.status === 'paid') {
      return NextResponse.json(
        { error: 'Cannot edit paid invoices' },
        { status: 400 }
      )
    }

    // Update invoice
    const updatedInvoice = await prisma.invoice.update({
      where: { id: params.id },
      data: {
        status: body.status,
        notes: body.notes,
        dueDate: body.dueDate ? new Date(body.dueDate) : undefined,
        updatedAt: new Date()
      },
      include: {
        warehouse: true,
        lineItems: true,
        reconciliations: true,
        createdBy: {
          select: {
            id: true,
            fullName: true,
            email: true
          }
        }
      }
    })

    // Log the update
    await prisma.auditLog.create({
      data: {
        tableName: 'invoices',
        recordId: params.id,
        action: 'UPDATE',
        changes: {
          before: {
            status: existingInvoice.status,
            notes: existingInvoice.notes,
            dueDate: existingInvoice.dueDate
          },
          after: {
            status: updatedInvoice.status,
            notes: updatedInvoice.notes,
            dueDate: updatedInvoice.dueDate
          }
        },
        userId: session.user.id,
        ipAddress: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip'),
        userAgent: req.headers.get('user-agent')
      }
    })

    return NextResponse.json(updatedInvoice)
  } catch (error) {
    console.error('Error updating invoice:', error)
    return NextResponse.json(
      { error: 'Failed to update invoice' },
      { status: 500 }
    )
  }
}

// DELETE /api/invoices/[id] - Delete invoice
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !['system_admin', 'finance_admin'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if invoice exists and can be deleted
    const invoice = await prisma.invoice.findUnique({
      where: { id: params.id }
    })

    if (!invoice) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      )
    }

    if (invoice.status === 'paid') {
      return NextResponse.json(
        { error: 'Cannot delete paid invoices' },
        { status: 400 }
      )
    }

    // Delete invoice (cascade will handle line items and reconciliations)
    await prisma.invoice.delete({
      where: { id: params.id }
    })

    // Log the deletion
    await prisma.auditLog.create({
      data: {
        tableName: 'invoices',
        recordId: params.id,
        action: 'DELETE',
        changes: {
          deletedInvoice: {
            invoiceNumber: invoice.invoiceNumber,
            warehouseId: invoice.warehouseId,
            totalAmount: invoice.totalAmount,
            status: invoice.status
          }
        },
        userId: session.user.id,
        ipAddress: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip'),
        userAgent: req.headers.get('user-agent')
      }
    })

    return NextResponse.json({ 
      message: 'Invoice deleted successfully',
      deletedInvoiceNumber: invoice.invoiceNumber 
    })
  } catch (error) {
    console.error('Error deleting invoice:', error)
    return NextResponse.json(
      { error: 'Failed to delete invoice' },
      { status: 500 }
    )
  }
}