import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { checkRateLimit, rateLimitConfigs } from '@/lib/security/rate-limiter'
import { validateCSRFToken } from '@/lib/security/csrf-protection'
import { triggerWeeklyStorageCalculation } from '@/lib/triggers/inventory-transaction-triggers'
import { auditLog } from '@/lib/security/audit-logger'
import { endOfWeek } from 'date-fns'
import { z } from 'zod'

const weeklyCalculationSchema = z.object({
  weekEndingDate: z.string().datetime().optional(),
  warehouseId: z.string().uuid().optional(),
})

export async function POST(request: NextRequest) {
  let session: any = null
  
  try {
    // Rate limiting
    const rateLimitResponse = await checkRateLimit(request, rateLimitConfigs.api)
    if (rateLimitResponse) return rateLimitResponse

    // CSRF protection
    const csrfValid = await validateCSRFToken(request)
    if (!csrfValid) {
      return NextResponse.json({ error: 'Invalid CSRF token' }, { status: 403 })
    }

    session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only admin users can trigger weekly calculations
    if (session.user.role !== 'admin') {
      await auditLog({
        entityType: 'StorageCalculation',
        entityId: 'WEEKLY',
        action: 'UNAUTHORIZED_ACCESS',
        userId: session.user.id,
        data: { role: session.user.role }
      })
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const body = await request.json()
    
    // Validate input
    const validationResult = weeklyCalculationSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validationResult.error.errors },
        { status: 400 }
      )
    }

    const data = validationResult.data

    // Determine week ending date (default to current week)
    const weekEndingDate = data.weekEndingDate 
      ? endOfWeek(new Date(data.weekEndingDate), { weekStartsOn: 1 })
      : endOfWeek(new Date(), { weekStartsOn: 1 })

    // Check warehouse access for staff users
    let warehouseId = data.warehouseId
    if (session.user.role === 'staff' && session.user.warehouseId) {
      if (warehouseId && warehouseId !== session.user.warehouseId) {
        return NextResponse.json({ error: 'Access denied to this warehouse' }, { status: 403 })
      }
      warehouseId = session.user.warehouseId
    }

    // Trigger the weekly storage calculation
    const result = await triggerWeeklyStorageCalculation(
      weekEndingDate,
      session.user.id,
      warehouseId
    )

    return NextResponse.json({
      success: true,
      weekEndingDate: weekEndingDate.toISOString(),
      processed: result.processed,
      errors: result.errors,
      message: `Storage calculation completed for week ending ${weekEndingDate.toLocaleDateString()}`
    })
  } catch (error: any) {
    // console.error('Weekly storage calculation error:', error)
    
    await auditLog({
      entityType: 'StorageCalculation',
      entityId: 'WEEKLY',
      action: 'ERROR',
      userId: session?.user?.id || 'SYSTEM',
      data: { error: error.message }
    })
    
    return NextResponse.json(
      { error: 'Failed to calculate weekly storage costs' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    // Rate limiting
    const rateLimitResponse = await checkRateLimit(request, rateLimitConfigs.api)
    if (rateLimitResponse) return rateLimitResponse

    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only admin users can view calculation status
    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // This would typically check the status of scheduled calculations
    // For now, return basic info
    const currentWeekEnding = endOfWeek(new Date(), { weekStartsOn: 1 })
    
    return NextResponse.json({
      currentWeekEnding: currentWeekEnding.toISOString(),
      message: 'Use POST to trigger weekly storage calculation',
      nextScheduledRun: 'Every Monday at 2:00 AM UTC',
    })
  } catch (error) {
    // console.error('Error fetching calculation status:', error)
    return NextResponse.json(
      { error: 'Failed to fetch calculation status' },
      { status: 500 }
    )
  }
}