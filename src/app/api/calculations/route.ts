import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { updateInventoryBalances } from '@/lib/calculations/inventory-balance'
import { generateStorageLedgerForPeriod } from '@/lib/calculations/storage-ledger'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Only admins and finance users can trigger calculations
    if (!['system_admin', 'finance_admin'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    const body = await request.json()
    const { type, warehouseId, year, month } = body
    
    switch (type) {
      case 'inventory-balance':
        const balanceCount = await updateInventoryBalances(warehouseId)
        return NextResponse.json({ 
          success: true, 
          message: `Updated ${balanceCount} inventory balance records` 
        })
        
      case 'storage-ledger':
        if (!year || !month) {
          return NextResponse.json({ 
            error: 'Year and month are required for storage ledger calculation' 
          }, { status: 400 })
        }
        
        const storageCount = await generateStorageLedgerForPeriod(year, month, warehouseId)
        return NextResponse.json({ 
          success: true, 
          message: `Generated ${storageCount} storage ledger entries` 
        })
        
      default:
        return NextResponse.json({ error: 'Invalid calculation type' }, { status: 400 })
    }
  } catch (error) {
    console.error('Calculation error:', error)
    return NextResponse.json({ 
      error: 'Failed to perform calculation',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}