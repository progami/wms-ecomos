import { NextResponse } from 'next/server'

// Simple health check for CI that doesn't wait for database
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    ci: process.env.CI === 'true'
  })
}