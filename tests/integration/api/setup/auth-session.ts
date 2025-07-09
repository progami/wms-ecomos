import request from 'supertest'
import { PrismaClient } from '@prisma/client'

/**
 * Create an authenticated session by actually logging in through NextAuth
 * This ensures we get a real, valid session token
 */
export async function createAuthenticatedSession(
  serverUrl: string,
  credentials: { email: string; password: string }
): Promise<string[]> {
  // First get the CSRF token
  const csrfResponse = await request(serverUrl)
    .get('/api/auth/csrf')
    .expect(200)
  
  const csrfToken = csrfResponse.body.csrfToken
  
  // Then perform the login
  const loginResponse = await request(serverUrl)
    .post('/api/auth/callback/credentials')
    .send({
      email: credentials.email,
      password: credentials.password,
      csrfToken: csrfToken,
      json: true
    })
    .expect(200)
  
  // Extract cookies from response
  const cookies = loginResponse.headers['set-cookie'] || []
  
  return cookies
}

/**
 * Create a request with real authentication cookies
 */
export function createAuthenticatedRequestWithCookies(
  serverUrl: string,
  cookies: string[]
) {
  return {
    get: (url: string) => {
      const req = request(serverUrl).get(url)
      if (cookies.length > 0) {
        req.set('Cookie', cookies.join('; '))
      }
      return req
    },
    post: (url: string) => {
      const req = request(serverUrl).post(url)
      if (cookies.length > 0) {
        req.set('Cookie', cookies.join('; '))
      }
      return req
    },
    put: (url: string) => {
      const req = request(serverUrl).put(url)
      if (cookies.length > 0) {
        req.set('Cookie', cookies.join('; '))
      }
      return req
    },
    patch: (url: string) => {
      const req = request(serverUrl).patch(url)
      if (cookies.length > 0) {
        req.set('Cookie', cookies.join('; '))
      }
      return req
    },
    delete: (url: string) => {
      const req = request(serverUrl).delete(url)
      if (cookies.length > 0) {
        req.set('Cookie', cookies.join('; '))
      }
      return req
    }
  }
}

/**
 * Helper to create a test user and get authenticated session
 */
export async function createTestUserAndLogin(
  prisma: PrismaClient,
  serverUrl: string,
  role: 'admin' | 'staff' = 'staff'
): Promise<{ user: any; cookies: string[] }> {
  // Create user with known password
  const email = `test-${Date.now()}@example.com`
  const password = 'password123'
  
  const user = await prisma.user.create({
    data: {
      email,
      fullName: 'Test User',
      passwordHash: '$2a$10$K7L1mrbVHC5SZxyoakG6wuqJPqm3WNmRuW9fhJz1w9TNJLXdJ1aJS', // password: "password123"
      role,
      isActive: true
    }
  })
  
  // Login and get session cookies
  const cookies = await createAuthenticatedSession(serverUrl, { email, password })
  
  return { user, cookies }
}