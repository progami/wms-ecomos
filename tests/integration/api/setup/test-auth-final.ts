import request from 'supertest'
import { UserRole } from '@prisma/client'

/**
 * Final authentication solution for integration tests
 * 
 * Since NextAuth uses encrypted JWTs, we need to either:
 * 1. Use real login flow (slow)
 * 2. Mock at the module level (doesn't work with real server)
 * 3. Use a test-specific authentication method
 * 
 * This implements option 3 using a test token that the server
 * can recognize when running in test mode.
 */

// Test token header name
const TEST_AUTH_HEADER = 'X-Test-Auth-User'

// Create headers for test authentication
export function createTestAuthHeaders(user: {
  id: string
  email: string
  name: string
  role: UserRole
  warehouseId?: string
  isDemo?: boolean
}): Record<string, string> {
  // When running tests, the server should check for this header
  // and create a session from it if TEST_MODE is enabled
  return {
    [TEST_AUTH_HEADER]: JSON.stringify(user),
    'Content-Type': 'application/json'
  }
}

// Create an authenticated request for tests
export function createAuthenticatedTestRequest(serverUrl: string, user: {
  id: string
  email: string
  name: string
  role: string | UserRole
  warehouseId?: string
  isDemo?: boolean
}) {
  const headers = createTestAuthHeaders({
    ...user,
    role: user.role as UserRole
  })
  
  return {
    get: (url: string) => {
      const req = request(serverUrl).get(url)
      Object.entries(headers).forEach(([key, value]) => {
        req.set(key, value)
      })
      return req
    },
    post: (url: string) => {
      const req = request(serverUrl).post(url)
      Object.entries(headers).forEach(([key, value]) => {
        req.set(key, value)
      })
      return req
    },
    put: (url: string) => {
      const req = request(serverUrl).put(url)
      Object.entries(headers).forEach(([key, value]) => {
        req.set(key, value)
      })
      return req
    },
    patch: (url: string) => {
      const req = request(serverUrl).patch(url)
      Object.entries(headers).forEach(([key, value]) => {
        req.set(key, value)
      })
      return req
    },
    delete: (url: string) => {
      const req = request(serverUrl).delete(url)
      Object.entries(headers).forEach(([key, value]) => {
        req.set(key, value)
      })
      return req
    }
  }
}

/**
 * Instructions for making this work:
 * 
 * The server needs to be modified to check for the X-Test-Auth-User header
 * when NODE_ENV=test. This can be done in the middleware or in a wrapper
 * around getServerSession.
 * 
 * For now, tests will continue to fail with 401 until the server is updated
 * to support test authentication.
 * 
 * Alternative: Use actual NextAuth login flow with test users.
 */