import { PrismaClient } from '@prisma/client'
import request from 'supertest'

// Set the USE_TEST_AUTH environment variable
process.env.USE_TEST_AUTH = 'true'
process.env.NODE_ENV = 'test'

export interface AuthenticatedRequest extends request.Test {
  withAuth(role?: 'admin' | 'staff', userId?: string, warehouseId?: string): this
}

// Create an extended request type that includes all HTTP methods
interface ExtendedRequest {
  get(url: string): AuthenticatedRequest
  post(url: string): AuthenticatedRequest
  put(url: string): AuthenticatedRequest
  patch(url: string): AuthenticatedRequest
  delete(url: string): AuthenticatedRequest
  del(url: string): AuthenticatedRequest
}

// Helper to create authenticated requests
export function createAuthenticatedRequest(serverUrl: string): ExtendedRequest {
  const addAuthMethod = (req: request.Test): AuthenticatedRequest => {
    const authReq = req as AuthenticatedRequest
    authReq.withAuth = function(role: 'admin' | 'staff' = 'admin', userId?: string, warehouseId?: string) {
      this.set('x-test-user-role', role)
      if (userId) {
        this.set('x-test-user-id', userId)
      }
      if (warehouseId) {
        this.set('x-test-warehouse-id', warehouseId)
      }
      return this
    }
    return authReq
  }
  
  const baseRequest = request(serverUrl)
  
  return {
    get: (url: string) => addAuthMethod(baseRequest.get(url)),
    post: (url: string) => addAuthMethod(baseRequest.post(url)),
    put: (url: string) => addAuthMethod(baseRequest.put(url)),
    patch: (url: string) => addAuthMethod(baseRequest.patch(url)),
    delete: (url: string) => addAuthMethod(baseRequest.delete(url)),
    del: (url: string) => addAuthMethod(baseRequest.del(url))
  }
}

// Setup test authentication for all tests
export function setupTestAuth() {
  // Ensure test auth environment is set
  process.env.USE_TEST_AUTH = 'true'
  process.env.NODE_ENV = 'test'
  process.env.NEXTAUTH_URL = process.env.TEST_SERVER_URL || 'http://localhost:3000'
  process.env.NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET || 'test-secret-key-for-testing-only'
}

// Create a test session for a user
export function createTestSession(userId: string, role: 'admin' | 'staff' = 'staff', warehouseId?: string) {
  return {
    user: {
      id: userId,
      email: 'test@example.com',
      name: 'Test User',
      role,
      warehouseId
    },
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
  }
}