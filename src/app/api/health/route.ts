import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET() {
  const checks = {
    api: 'ok',
    database: 'pending',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '1.0.0'
  }
  
  // Check database connectivity
  try {
    await prisma.$queryRaw`SELECT 1`
    checks.database = 'ok'
  } catch (error) {
    checks.database = 'error'
  } finally {
    await prisma.$disconnect()
  }
  
  const allHealthy = Object.values(checks).every(
    value => typeof value === 'string' && (value === 'ok' || !['pending', 'error'].includes(value))
  )
  
  return NextResponse.json(
    {
      status: allHealthy ? 'healthy' : 'unhealthy',
      checks,
      uptime: process.uptime(),
      memory: {
        used: process.memoryUsage().heapUsed / 1024 / 1024,
        total: process.memoryUsage().heapTotal / 1024 / 1024,
        unit: 'MB'
      }
    },
    { status: allHealthy ? 200 : 503 }
  )
}