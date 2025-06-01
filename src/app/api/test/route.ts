import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function GET() {
  console.log('Test API route called')
  
  const response: any = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
  }
  
  // Test session
  try {
    const session = await getServerSession(authOptions)
    response.session = session ? {
      user: session.user,
      expires: session.expires
    } : null
  } catch (error) {
    response.sessionError = error instanceof Error ? error.message : 'Unknown session error'
  }
  
  // Test database connection
  try {
    const result = await prisma.$queryRaw<{now: Date}[]>`SELECT NOW() as now`
    response.database = {
      connected: true,
      time: result[0]?.now
    }
  } catch (error) {
    response.database = {
      connected: false,
      error: error instanceof Error ? error.message : 'Unknown database error'
    }
  }
  
  // Test if tables exist
  try {
    const userCount = await prisma.user.count()
    response.tables = {
      users: userCount
    }
  } catch (error) {
    response.tablesError = error instanceof Error ? error.message : 'Tables may not exist'
  }
  
  return NextResponse.json(response)
}