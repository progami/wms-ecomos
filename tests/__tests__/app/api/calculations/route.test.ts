import { NextRequest } from 'next/server'
import { GET } from '@/app/api/finance/calculated-costs/route'
import { getServerSession } from 'next-auth/next'
import { getCalculatedCostsSummary } from '@/lib/calculations/cost-aggregation'
import { mockSessions } from '../../../test-utils'

// Mock dependencies
jest.mock('next-auth/next')
jest.mock('@/lib/calculations/cost-aggregation')

describe('Calculated Costs API Route', () => {
  const mockGetServerSession = getServerSession as jest.Mock
  const mockGetCalculatedCostsSummary = getCalculatedCostsSummary as jest.Mock

  beforeEach(() => {
    jest.clearAllMocks()
  })

  const createGetRequest = (params?: Record<string, string>) => {
    const url = new URL('http://localhost:3000/api/finance/calculated-costs')
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.set(key, value)
      })
    }
    return new NextRequest(url.toString())
  }

  describe('Authentication', () => {
    it('should return 401 if user is not authenticated', async () => {
      mockGetServerSession.mockResolvedValue(null)

      const request = createGetRequest({ warehouseId: 'warehouse-1' })
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })
  })

  describe('GET - Retrieve Calculated Costs', () => {
    beforeEach(() => {
      mockGetServerSession.mockResolvedValue(mockSessions.admin)
    })

    it('should retrieve calculated costs summary', async () => {
      const mockSummary = {
        totalCosts: 1000,
        byCategory: { Storage: 500, Handling: 500 },
      }
      mockGetCalculatedCostsSummary.mockResolvedValue(mockSummary)

      const request = createGetRequest({
        warehouseId: 'warehouse-1',
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        summary: 'true',
      })
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual(mockSummary)
    })

    it('should require warehouse ID', async () => {
      const request = createGetRequest({
        startDate: '2024-01-01',
        endDate: '2024-01-31',
      })
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Warehouse ID is required')
    })

    it('should handle invalid date parameters', async () => {
      const request = createGetRequest({
        warehouseId: 'warehouse-1',
        startDate: 'invalid-date',
        endDate: '2024-01-31',
      })
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('Invalid')
    })
  })
})