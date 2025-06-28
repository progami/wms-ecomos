import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { generateDemoData, clearDemoData, setProgressCallback } from '@/lib/demo/demo-data-generator'

// Store progress for each session
const progressMap = new Map<string, { message: string; progress: number; timestamp: number }>()

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only admins can manage demo data
    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { action } = body

    if (action === 'generate') {
      // Create a unique session ID for progress tracking
      const sessionId = `demo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      
      // Set up progress tracking
      setProgressCallback((message: string, progress: number) => {
        progressMap.set(sessionId, {
          message,
          progress,
          timestamp: Date.now()
        })
      })
      
      // Start generation in background
      generateDemoData()
        .then((stats) => {
          progressMap.set(sessionId, {
            message: 'Demo data generation completed!',
            progress: 100,
            timestamp: Date.now()
          })
        })
        .catch((error) => {
          // console.error('Demo data generation failed:', error)
          progressMap.set(sessionId, {
            message: `Error: ${error.message}`,
            progress: -1,
            timestamp: Date.now()
          })
        })
      
      return NextResponse.json({
        success: true,
        message: 'Demo data generation started',
        sessionId
      })
    } else if (action === 'clear') {
      // Clear all data
      await clearDemoData()
      
      return NextResponse.json({
        success: true,
        message: 'Demo data cleared successfully'
      })
    } else if (action === 'progress') {
      // Get progress for a session
      const { sessionId } = body
      const progress = progressMap.get(sessionId)
      
      if (!progress) {
        return NextResponse.json({
          message: 'No progress found',
          progress: 0
        })
      }
      
      // Clean up old progress entries (older than 1 hour)
      const oneHourAgo = Date.now() - 60 * 60 * 1000
      for (const [key, value] of progressMap.entries()) {
        if (value.timestamp < oneHourAgo) {
          progressMap.delete(key)
        }
      }
      
      return NextResponse.json(progress)
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    // console.error('Error in demo API:', error)
    return NextResponse.json(
      { error: 'Failed to process demo data request' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only admins can check demo status
    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get current demo data statistics
    const { prisma } = await import('@/lib/prisma')
    
    const stats = {
      warehouses: await prisma.warehouse.count(),
      users: await prisma.user.count(),
      skus: await prisma.sku.count(),
      transactions: await prisma.inventoryTransaction.count(),
      invoices: await prisma.invoice.count(),
      hasData: false
    }
    
    stats.hasData = stats.warehouses > 0 && stats.transactions > 0
    
    return NextResponse.json(stats)
  } catch (error) {
    // console.error('Error checking demo status:', error)
    return NextResponse.json(
      { error: 'Failed to check demo status' },
      { status: 500 }
    )
  }
}