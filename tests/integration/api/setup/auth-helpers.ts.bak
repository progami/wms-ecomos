import jwt from 'jsonwebtoken'
import { randomBytes } from 'crypto'
import { UserRole } from '@prisma/client'

// Create a mock session token for testing
export function createMockSessionToken(user: {
  id: string
  email: string
  fullName: string
  role: UserRole
  warehouseId?: string | null
  isDemo?: boolean
}): string {
  const secret = process.env.NEXTAUTH_SECRET || 'test-secret-key-for-development-only'
  
  const token = jwt.sign(
    {
      sub: user.id,
      email: user.email,
      name: user.fullName,
      role: user.role,
      warehouseId: user.warehouseId || undefined,
      isDemo: user.isDemo || false,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 24 * 60 * 60, // 24 hours
      jti: randomBytes(16).toString('hex'),
    },
    secret,
    { algorithm: 'HS256' }
  )
  
  return token
}

// Create session cookie string
export function createSessionCookie(token: string): string {
  // NextAuth uses secure, httpOnly cookies with the name pattern
  // In development/test it's: next-auth.session-token
  // In production it's: __Secure-next-auth.session-token
  const cookieName = process.env.NODE_ENV === 'production' 
    ? '__Secure-next-auth.session-token' 
    : 'next-auth.session-token'
  
  return `${cookieName}=${token}`
}

// Helper to create authenticated request headers
export function createAuthHeaders(user: {
  id: string
  email: string
  fullName: string
  role: UserRole
  warehouseId?: string | null
  isDemo?: boolean
}): { Cookie: string } {
  const token = createMockSessionToken(user)
  const cookie = createSessionCookie(token)
  
  return {
    Cookie: cookie
  }
}

// Mock the getServerSession function for tests
export function mockGetServerSession(session: any) {
  const mockImplementation = jest.fn().mockResolvedValue(session)
  
  // Mock both the direct import and the next-auth import
  jest.mock('next-auth', () => ({
    getServerSession: mockImplementation
  }))
  
  jest.mock('next-auth/next', () => ({
    getServerSession: mockImplementation
  }))
  
  return mockImplementation
}