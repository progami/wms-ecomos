import { GET } from '@/app/api/health/route'
import { NextResponse } from 'next/server'

// Mock Prisma
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    $queryRaw: jest.fn(),
    $disconnect: jest.fn(),
  })),
}))

describe('Health Check API', () => {
  let mockPrisma: any

  beforeEach(() => {
    jest.clearAllMocks()
    const { PrismaClient } = require('@prisma/client')
    mockPrisma = new PrismaClient()
  })

  it('should return healthy status when all checks pass', async () => {
    mockPrisma.$queryRaw.mockResolvedValueOnce([{ '1': 1 }])

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.status).toBe('healthy')
    expect(data.checks.api).toBe('ok')
    expect(data.checks.database).toBe('ok')
    expect(data.uptime).toBeGreaterThan(0)
    expect(data.memory).toHaveProperty('used')
    expect(data.memory).toHaveProperty('total')
  })

  it('should return unhealthy status when database check fails', async () => {
    mockPrisma.$queryRaw.mockRejectedValueOnce(new Error('Database connection failed'))

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(503)
    expect(data.status).toBe('unhealthy')
    expect(data.checks.database).toBe('error')
  })

  it('should include environment information', async () => {
    mockPrisma.$queryRaw.mockResolvedValueOnce([{ '1': 1 }])

    const response = await GET()
    const data = await response.json()

    expect(data.checks).toHaveProperty('environment')
    expect(data.checks).toHaveProperty('version')
    expect(data.checks).toHaveProperty('timestamp')
  })

  it('should disconnect from database after check', async () => {
    mockPrisma.$queryRaw.mockResolvedValueOnce([{ '1': 1 }])

    await GET()

    expect(mockPrisma.$disconnect).toHaveBeenCalled()
  })
})