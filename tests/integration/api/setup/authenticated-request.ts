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

// Create an authenticated request with proper session cookie
export function createAuthenticatedRequest(serverUrl: string, user: {
  id: string
  email: string
  name: string
  role: string | UserRole
  warehouseId?: string
  isDemo?: boolean
}) {
  // Return an object with HTTP method functions that create authenticated requests
  return {
    get: (url: string) => addAuthHeaders(request(serverUrl).get(url), user),
    post: (url: string) => addAuthHeaders(request(serverUrl).post(url), user),
    put: (url: string) => addAuthHeaders(request(serverUrl).put(url), user),
    patch: (url: string) => addAuthHeaders(request(serverUrl).patch(url), user),
    delete: (url: string) => addAuthHeaders(request(serverUrl).delete(url), user)
  }
}