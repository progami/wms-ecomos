import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const transactionId = formData.get('transactionId') as string
    const category = formData.get('category') as string
    const file = formData.get('file') as File

    if (!transactionId || !category || !file) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Find the transaction
    const transaction = await prisma.inventoryTransaction.findUnique({
      where: { transactionId }
    })

    if (!transaction) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })
    }

    // In a real implementation, you would upload the file to S3 or similar
    // For now, we'll store file metadata in the database
    const fileMetadata = {
      category,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      uploadedAt: new Date().toISOString(),
      uploadedBy: session.user.id,
      // In production, this would be the S3 URL
      fileUrl: `/api/inventory/documents/${transactionId}/${file.name}`
    }

    // Get existing attachments
    const existingAttachments = transaction.attachments as any[] || []
    
    // Add new attachment
    const updatedAttachments = [...existingAttachments, fileMetadata]

    // Update transaction with new attachments
    await prisma.inventoryTransaction.update({
      where: { id: transaction.id },
      data: { attachments: updatedAttachments }
    })

    return NextResponse.json({ 
      success: true, 
      attachment: fileMetadata 
    })

  } catch (error) {
    console.error('Document upload error:', error)
    return NextResponse.json({ error: 'Failed to upload document' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const transactionId = searchParams.get('transactionId')

    if (!transactionId) {
      return NextResponse.json({ error: 'Transaction ID required' }, { status: 400 })
    }

    const transaction = await prisma.inventoryTransaction.findUnique({
      where: { transactionId },
      select: { attachments: true }
    })

    if (!transaction) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })
    }

    return NextResponse.json({ 
      attachments: transaction.attachments || [] 
    })

  } catch (error) {
    console.error('Document fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch documents' }, { status: 500 })
  }
}