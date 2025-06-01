import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

// GET /api/settings/notifications - Get notification settings
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'system_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // In a real app, this would fetch from a settings table
    // For now, return default values
    const settings = {
      emailEnabled: true,
      smsEnabled: false,
      pushEnabled: true,
      lowStockAlerts: true,
      newTransactionAlerts: false,
      dailyReports: false,
      weeklyReports: true,
      monthlyReports: true,
      alertRecipients: ['admin@example.com'],
      reportRecipients: ['reports@example.com'],
    }

    return NextResponse.json(settings)
  } catch (error) {
    console.error('Error fetching notification settings:', error)
    return NextResponse.json(
      { error: 'Failed to fetch notification settings' },
      { status: 500 }
    )
  }
}

// POST /api/settings/notifications - Save notification settings
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'system_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const settings = await req.json()

    // Validate settings
    if (typeof settings.emailEnabled !== 'boolean' ||
        typeof settings.smsEnabled !== 'boolean' ||
        typeof settings.pushEnabled !== 'boolean') {
      return NextResponse.json(
        { error: 'Invalid settings format' },
        { status: 400 }
      )
    }

    // Validate email addresses
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    const allEmails = [...settings.alertRecipients, ...settings.reportRecipients]
    for (const email of allEmails) {
      if (!emailRegex.test(email)) {
        return NextResponse.json(
          { error: `Invalid email address: ${email}` },
          { status: 400 }
        )
      }
    }

    // In a real app, this would save to a database table
    // For now, we'll just simulate success
    
    // Log the settings for debugging
    console.log('Saving notification settings:', settings)

    // Simulate async save
    await new Promise(resolve => setTimeout(resolve, 500))

    return NextResponse.json({
      success: true,
      message: 'Notification settings saved successfully',
      settings
    })
  } catch (error) {
    console.error('Error saving notification settings:', error)
    return NextResponse.json(
      { error: 'Failed to save notification settings' },
      { status: 500 }
    )
  }
}