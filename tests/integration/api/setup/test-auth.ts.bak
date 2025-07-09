import request from 'supertest'
import { PrismaClient } from '@prisma/client'
import { createTestUser } from './test-db'

export interface TestAuthSession {
  cookies: string[]
  user: {
    id: string
    email: string
    fullName: string
    role: string
  }
}

// Login and get session cookie
export async function loginTestUser(
  serverUrl: string,
  email: string,
  password: string
): Promise<TestAuthSession | null> {
  try {
    const response = await request(serverUrl)
      .post('/api/auth/callback/credentials')
      .send({
        email,
        password,
        csrfToken: 'test-csrf-token'
      })
      .expect(302)
    
    const cookies = response.headers['set-cookie']
    if (!cookies || cookies.length === 0) {
      console.error('No cookies received from login')
      return null
    }
    
    return {
      cookies: Array.isArray(cookies) ? cookies : [cookies],
      user: {
        id: '', // Will be filled from session
        email,
        fullName: '',
        role: ''
      }
    }
  } catch (error) {
    console.error('Login failed:', error)
    return null
  }
}

// Create a test user and login
export async function createAndLoginTestUser(
  prisma: PrismaClient,
  serverUrl: string,
  role: 'admin' | 'staff' = 'staff'
): Promise<TestAuthSession> {
  // Create user with known password
  const password = 'testpassword123'
  const user = await prisma.user.create({
    data: {
      email: `test-${Date.now()}@example.com`,
      fullName: 'Test User',
      passwordHash: '$2a$10$K7L1mrbVHC5SZxyoakG6wuqJPqm3WNmRuW9fhJz1w9TNJLXdJ1aJS', // password: "password123"
      role,
      isActive: true
    }
  })
  
  // Try to login with the test user
  const session = await loginTestUser(serverUrl, user.email, 'password123')
  
  if (!session) {
    throw new Error('Failed to create test session')
  }
  
  // Update session with user info
  session.user = {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    role: user.role
  }
  
  return session
}

// Helper to create authenticated request
export function authenticatedRequest(serverUrl: string, session: TestAuthSession) {
  const req = request(serverUrl)
  
  // Add all cookies from the session
  if (session.cookies && session.cookies.length > 0) {
    req.set('Cookie', session.cookies.join('; '))
  }
  
  return req
}

// Alternative approach: Mock NextAuth for test environment
export function setupTestAuth() {
  // Set test environment variables
  process.env.NEXTAUTH_URL = process.env.TEST_SERVER_URL || 'http://localhost:3000'
  process.env.NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET || 'test-secret-key-for-development-only'
  
  // Mock getServerSession for the test environment
  const mockSession = {
    user: {
      id: 'test-user-id',
      email: 'test@example.com',
      name: 'Test User',
      role: 'staff'
    },
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
  }
  
  // This will be used when we can control the server
  return mockSession
}