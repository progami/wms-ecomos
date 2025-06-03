import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { parse } from 'csv-parse/sync'
import * as XLSX from 'xlsx'

interface InvoiceUploadData {
  invoiceNumber: string
  warehouseCode: string
  billingPeriodStart: string
  billingPeriodEnd: string
  invoiceDate: string
  dueDate?: string
  totalAmount: number
  lineItems: Array<{
    costCategory: string
    costName: string
    quantity: number
    unitRate?: number
    amount: number
    notes?: string
  }>
}

// POST /api/invoices/upload - Upload invoice file
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await req.formData()
    const file = formData.get('file') as File
    const fileType = formData.get('fileType') as string || 'auto'

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    let invoiceData: InvoiceUploadData | null = null

    // Determine file type and parse accordingly
    const fileName = file.name.toLowerCase()
    
    if (fileType === 'csv' || fileName.endsWith('.csv')) {
      invoiceData = await parseCSV(buffer)
    } else if (fileType === 'excel' || fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
      invoiceData = await parseExcel(buffer)
    } else if (fileType === 'pdf' || fileName.endsWith('.pdf')) {
      // For PDF, we'll need to implement OCR or manual data entry
      return NextResponse.json(
        { 
          error: 'PDF upload requires manual data entry',
          requiresManualEntry: true,
          fileName: file.name
        },
        { status: 400 }
      )
    } else {
      return NextResponse.json(
        { error: 'Unsupported file type. Please upload CSV, Excel, or PDF files.' },
        { status: 400 }
      )
    }

    if (!invoiceData) {
      return NextResponse.json(
        { error: 'Failed to parse invoice data' },
        { status: 400 }
      )
    }

    // Validate warehouse exists
    const warehouse = await prisma.warehouse.findUnique({
      where: { code: invoiceData.warehouseCode }
    })

    if (!warehouse) {
      return NextResponse.json(
        { error: `Warehouse with code ${invoiceData.warehouseCode} not found` },
        { status: 400 }
      )
    }

    // Check if invoice already exists
    const existingInvoice = await prisma.invoice.findUnique({
      where: { invoiceNumber: invoiceData.invoiceNumber }
    })

    if (existingInvoice) {
      return NextResponse.json(
        { 
          error: 'Invoice already exists',
          existingInvoice: {
            id: existingInvoice.id,
            invoiceNumber: existingInvoice.invoiceNumber,
            status: existingInvoice.status
          }
        },
        { status: 400 }
      )
    }

    // Create invoice with line items
    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber: invoiceData.invoiceNumber,
        warehouseId: warehouse.id,
        billingPeriodStart: new Date(invoiceData.billingPeriodStart),
        billingPeriodEnd: new Date(invoiceData.billingPeriodEnd),
        invoiceDate: new Date(invoiceData.invoiceDate),
        dueDate: invoiceData.dueDate ? new Date(invoiceData.dueDate) : null,
        totalAmount: invoiceData.totalAmount,
        createdById: session.user.id,
        lineItems: {
          create: invoiceData.lineItems.map(item => ({
            costCategory: item.costCategory as any,
            costName: item.costName,
            quantity: item.quantity,
            unitRate: item.unitRate,
            amount: item.amount,
            notes: item.notes
          }))
        }
      },
      include: {
        warehouse: true,
        lineItems: true
      }
    })

    // Automatically start reconciliation process
    await startReconciliation(invoice.id)

    return NextResponse.json({
      message: 'Invoice uploaded successfully',
      invoice,
      reconciliationStarted: true
    })
  } catch (error) {
    console.error('Error uploading invoice:', error)
    return NextResponse.json(
      { error: 'Failed to upload invoice' },
      { status: 500 }
    )
  }
}

async function parseCSV(buffer: Buffer): Promise<InvoiceUploadData | null> {
  try {
    const csvString = buffer.toString('utf-8')
    const records = parse(csvString, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    })

    if (records.length === 0) {
      return null
    }

    // Extract header information (assuming it's in the first few rows)
    const headerInfo = records[0]
    const lineItems = records.slice(1).filter((row: any) => 
      row.costCategory && row.costName && row.amount
    )

    return {
      invoiceNumber: headerInfo.invoiceNumber || headerInfo['Invoice Number'] || '',
      warehouseCode: headerInfo.warehouseCode || headerInfo['Warehouse'] || '',
      billingPeriodStart: headerInfo.billingPeriodStart || headerInfo['Billing Period Start'] || '',
      billingPeriodEnd: headerInfo.billingPeriodEnd || headerInfo['Billing Period End'] || '',
      invoiceDate: headerInfo.invoiceDate || headerInfo['Invoice Date'] || '',
      dueDate: headerInfo.dueDate || headerInfo['Due Date'],
      totalAmount: parseFloat(headerInfo.totalAmount || headerInfo['Total Amount'] || '0'),
      lineItems: lineItems.map((item: any) => ({
        costCategory: item.costCategory || item['Cost Category'],
        costName: item.costName || item['Cost Name'] || item['Description'],
        quantity: parseFloat(item.quantity || item['Quantity'] || '0'),
        unitRate: item.unitRate ? parseFloat(item.unitRate) : undefined,
        amount: parseFloat(item.amount || item['Amount'] || '0'),
        notes: item.notes || item['Notes']
      }))
    }
  } catch (error) {
    console.error('Error parsing CSV:', error)
    return null
  }
}

async function parseExcel(buffer: Buffer): Promise<InvoiceUploadData | null> {
  try {
    const workbook = XLSX.read(buffer, { type: 'buffer' })
    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]
    const data = XLSX.utils.sheet_to_json(worksheet)

    if (data.length === 0) {
      return null
    }

    // Look for invoice header information
    let invoiceInfo: any = {}
    let lineItems: any[] = []
    let headerFound = false

    // First, try to find invoice header info
    for (const row of data) {
      if ((row as any)['Invoice Number'] || (row as any)['invoiceNumber']) {
        invoiceInfo = row
        headerFound = true
      } else if (headerFound && ((row as any)['Cost Category'] || (row as any)['costCategory'])) {
        lineItems.push(row)
      }
    }

    // If no clear header, assume first row is header and rest are line items
    if (!headerFound && data.length > 0) {
      invoiceInfo = data[0]
      lineItems = data.slice(1)
    }

    return {
      invoiceNumber: invoiceInfo['Invoice Number'] || invoiceInfo.invoiceNumber || '',
      warehouseCode: invoiceInfo['Warehouse'] || invoiceInfo.warehouseCode || '',
      billingPeriodStart: invoiceInfo['Billing Period Start'] || invoiceInfo.billingPeriodStart || '',
      billingPeriodEnd: invoiceInfo['Billing Period End'] || invoiceInfo.billingPeriodEnd || '',
      invoiceDate: invoiceInfo['Invoice Date'] || invoiceInfo.invoiceDate || '',
      dueDate: invoiceInfo['Due Date'] || invoiceInfo.dueDate,
      totalAmount: parseFloat(invoiceInfo['Total Amount'] || invoiceInfo.totalAmount || '0'),
      lineItems: lineItems.map((item: any) => ({
        costCategory: item['Cost Category'] || item.costCategory,
        costName: item['Cost Name'] || item.costName || item['Description'],
        quantity: parseFloat(item['Quantity'] || item.quantity || '0'),
        unitRate: item['Unit Rate'] || item.unitRate ? parseFloat(item['Unit Rate'] || item.unitRate) : undefined,
        amount: parseFloat(item['Amount'] || item.amount || '0'),
        notes: item['Notes'] || item.notes
      }))
    }
  } catch (error) {
    console.error('Error parsing Excel:', error)
    return null
  }
}

async function startReconciliation(invoiceId: string) {
  try {
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { lineItems: true }
    })

    if (!invoice) return

    // Get calculated costs for the billing period
    const calculatedCosts = await prisma.calculatedCost.groupBy({
      by: ['costRateId'],
      where: {
        warehouseId: invoice.warehouseId,
        billingPeriodStart: {
          gte: invoice.billingPeriodStart,
          lte: invoice.billingPeriodEnd
        }
      },
      _sum: {
        finalExpectedCost: true
      }
    })

    // Get cost rate details
    const costRateIds = calculatedCosts.map(c => c.costRateId)
    const costRates = await prisma.costRate.findMany({
      where: { id: { in: costRateIds } }
    })

    // Create reconciliation records
    const reconciliations = []

    for (const lineItem of invoice.lineItems) {
      // Find matching calculated cost
      const matchingRate = costRates.find(r => 
        r.costCategory === lineItem.costCategory && 
        r.costName === lineItem.costName
      )

      if (matchingRate) {
        const calculatedSum = calculatedCosts.find(c => c.costRateId === matchingRate.id)
        const expectedAmount = calculatedSum?._sum.finalExpectedCost || 0

        const difference = Number(lineItem.amount) - Number(expectedAmount)
        let status: 'match' | 'overbilled' | 'underbilled' = 'match'
        
        if (Math.abs(difference) > 0.01) {
          status = difference > 0 ? 'overbilled' : 'underbilled'
        }

        reconciliations.push({
          invoiceId: invoice.id,
          costCategory: lineItem.costCategory,
          costName: lineItem.costName,
          expectedAmount,
          invoicedAmount: lineItem.amount,
          difference,
          status
        })
      } else {
        // No matching calculated cost found
        reconciliations.push({
          invoiceId: invoice.id,
          costCategory: lineItem.costCategory,
          costName: lineItem.costName,
          expectedAmount: 0,
          invoicedAmount: lineItem.amount,
          difference: lineItem.amount,
          status: 'overbilled' as const
        })
      }
    }

    // Insert reconciliation records
    if (reconciliations.length > 0) {
      await prisma.invoiceReconciliation.createMany({
        data: reconciliations
      })
    }
  } catch (error) {
    console.error('Error starting reconciliation:', error)
  }
}