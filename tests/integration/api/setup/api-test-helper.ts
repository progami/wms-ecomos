import { NextApiRequest, NextApiResponse } from 'next'
import { createMocks, RequestMethod } from 'node-mocks-http'
import { getServerSession } from 'next-auth'

// Mock next-auth
jest.mock('next-auth', () => ({
  getServerSession: jest.fn()
}))

const mockedGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>

// Type for mocked response
interface MockedResponse extends NextApiResponse {
  _getStatusCode(): number
  _getData(): string
  _getJSONData(): any
}

export interface MockRequestOptions {
  method?: RequestMethod
  headers?: Record<string, string>
  query?: Record<string, string | string[]>
  body?: any
  session?: any
}

export function createMockRequest(options: MockRequestOptions = {}) {
  const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
    method: options.method || 'GET',
    headers: {
      'content-type': 'application/json',
      ...options.headers
    },
    query: options.query || {},
    body: options.body
  })

  // Mock session if provided
  if (options.session !== undefined) {
    mockedGetServerSession.mockResolvedValue(options.session)
  }

  return { req, res }
}

export function expectApiResponse(res: NextApiResponse, expectedStatus: number, expectedBody?: any) {
  const mockRes = res as MockedResponse
  expect(mockRes._getStatusCode()).toBe(expectedStatus)
  
  if (expectedBody !== undefined) {
    const data = JSON.parse(mockRes._getData())
    if (typeof expectedBody === 'object') {
      expect(data).toMatchObject(expectedBody)
    } else {
      expect(data).toBe(expectedBody)
    }
  }
}

export function expectApiError(res: NextApiResponse, expectedStatus: number, errorPattern?: string | RegExp) {
  const mockRes = res as MockedResponse
  expect(mockRes._getStatusCode()).toBe(expectedStatus)
  
  if (errorPattern) {
    const data = JSON.parse(mockRes._getData())
    expect(data).toHaveProperty('error')
    
    if (typeof errorPattern === 'string') {
      expect(data.error).toContain(errorPattern)
    } else {
      expect(data.error).toMatch(errorPattern)
    }
  }
}

// Helper to test protected endpoints
export async function testProtectedEndpoint(
  handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void>,
  options: MockRequestOptions = {}
) {
  // Test without session
  mockedGetServerSession.mockResolvedValue(null)
  const { req, res } = createMockRequest(options)
  await handler(req, res)
  expectApiError(res, 401, 'Unauthorized')
}

// Helper to test admin-only endpoints
export async function testAdminOnlyEndpoint(
  handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void>,
  options: MockRequestOptions = {}
) {
  // Test with non-admin session
  const staffSession = {
    user: {
      id: 'staff-id',
      email: 'staff@example.com',
      role: 'staff'
    }
  }
  
  mockedGetServerSession.mockResolvedValue(staffSession)
  const { req, res } = createMockRequest({ ...options, session: staffSession })
  await handler(req, res)
  expectApiError(res, 403, 'Forbidden')
}