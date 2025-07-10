import request from 'supertest'
import { createTestSessionToken, createAuthCookie } from './nextauth-test-utils'
import { UserRole } from '@prisma/client'

// Helper to add auth headers to any request
export function addAuthHeaders(req: request.Test, user: {
  id: string
  email: string
  name: string
  role: string | UserRole
  warehouseId?: string
  isDemo?: boolean
}) {
  const token = createTestSessionToken({
    ...user,
    role: user.role as UserRole
  })
  const cookie = createAuthCookie(token)
  
  return req
    .set('Cookie', cookie)
    .set('Content-Type', 'application/json')
}

// Extend supertest Request type with withAuth method
declare module 'supertest' {
  interface Test {
    withAuth(role: string, userId: string): Test
  }
}

// Add withAuth method to supertest requests
function addWithAuthMethod(req: request.Test, serverUrl: string) {
  ;(req as any).withAuth = function(role: string, userId: string) {
    // Create a user object based on role and ID
    const user = {
      id: userId,
      email: `test-${userId}@example.com`,
      name: 'Test User',
      role: role as UserRole,
      warehouseId: undefined,
      isDemo: false
    }
    
    return addAuthHeaders(this, user)
  }
  
  return req
}

// Create an authenticated request with proper session cookie
export function createAuthenticatedRequest(serverUrl: string) {
  // Return an object with HTTP method functions that support withAuth
  return {
    get: (url: string) => addWithAuthMethod(request(serverUrl).get(url), serverUrl),
    post: (url: string) => addWithAuthMethod(request(serverUrl).post(url), serverUrl),
    put: (url: string) => addWithAuthMethod(request(serverUrl).put(url), serverUrl),
    patch: (url: string) => addWithAuthMethod(request(serverUrl).patch(url), serverUrl),
    delete: (url: string) => addWithAuthMethod(request(serverUrl).delete(url), serverUrl)
  }
}