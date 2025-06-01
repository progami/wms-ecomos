import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function GET() {
  try {
    // Test database connection
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        isActive: true,
      },
    })

    // Test bcrypt
    const testPassword = 'admin123'
    const testHash = await bcrypt.hash(testPassword, 10)
    const isValid = await bcrypt.compare(testPassword, testHash)

    // Get the admin user and test password
    const adminUser = await prisma.user.findUnique({
      where: { email: 'admin@warehouse.com' },
    })

    let adminPasswordTest = null
    if (adminUser) {
      adminPasswordTest = await bcrypt.compare('admin123', adminUser.passwordHash)
    }

    return NextResponse.json({
      success: true,
      dbConnected: true,
      userCount: users.length,
      users: users,
      bcryptTest: {
        password: testPassword,
        hash: testHash,
        isValid: isValid,
      },
      adminUser: adminUser ? {
        found: true,
        email: adminUser.email,
        isActive: adminUser.isActive,
        passwordValid: adminPasswordTest,
      } : { found: false },
    })
  } catch (error) {
    console.error('Database test error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 })
  }
}