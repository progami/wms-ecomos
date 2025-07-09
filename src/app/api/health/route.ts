import { NextResponse } from 'next/server'
import { getDatabaseStatus } from '@/lib/db-health'

export async function GET() {
  const checks = {
    api: 'ok',
    database: 'pending',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '1.0.0',
    testAuth: process.env.USE_TEST_AUTH === 'true'
  }
  
  // Check database connectivity
  const dbHealth = await getDatabaseStatus()
  checks.database = dbHealth.isHealthy ? 'ok' : 'error'
  
  // Add database error details if unhealthy
  const responseData: any = {
    status: '',
    checks,
    uptime: process.uptime(),
    memory: {
      used: process.memoryUsage().heapUsed / 1024 / 1024,
      total: process.memoryUsage().heapTotal / 1024 / 1024,
      unit: 'MB'
    }
  }
  
  if (!dbHealth.isHealthy) {
    responseData.databaseError = dbHealth.error
  }
  
  const allHealthy = Object.values(checks).every(
    value => typeof value === 'string' && (value === 'ok' || !['pending', 'error'].includes(value))
  )
  
  responseData.status = allHealthy ? 'healthy' : 'unhealthy'
  
  return NextResponse.json(
    responseData,
    { status: allHealthy ? 200 : 503 }
  )
}