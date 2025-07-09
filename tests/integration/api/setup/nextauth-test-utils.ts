import jwt from 'jsonwebtoken'
import { randomBytes } from 'crypto'
import { UserRole } from '@prisma/client'

/**
 * NextAuth JWT utilities for testing
 * 
 * These utilities create JWT tokens that are compatible with NextAuth's
 * session token format for use in integration tests.
 */

// NextAuth JWT payload interface
interface NextAuthJWT {
  name?: string | null
  email?: string | null
  picture?: string | null
  sub?: string
  iat?: number
  exp?: number
  jti?: string
  // Custom fields from our auth setup
  role?: UserRole
  warehouseId?: string
  isDemo?: boolean
}

/**
 * Encode a JWT token compatible with NextAuth
 * Based on NextAuth v4 JWT encoding
 */
export function encodeNextAuthJWT(
  token: NextAuthJWT,
  secret: string = process.env.NEXTAUTH_SECRET || 'test-secret-key-for-testing-only'
): string {
  const now = Math.floor(Date.now() / 1000)
  
  const payload: NextAuthJWT = {
    ...token,
    iat: token.iat || now,
    exp: token.exp || now + 24 * 60 * 60, // 24 hours default
    jti: token.jti || randomBytes(16).toString('hex')
  }
  
  // NextAuth uses HS256 algorithm
  return jwt.sign(payload, secret, { 
    algorithm: 'HS256',
    noTimestamp: true // We set timestamps manually
  })
}

/**
 * Create a session token for a test user
 */
export function createTestSessionToken(user: {
  id: string
  email: string
  name: string
  role: UserRole
  warehouseId?: string
  isDemo?: boolean
}): string {
  const token: NextAuthJWT = {
    name: user.name,
    email: user.email,
    sub: user.id,
    role: user.role,
    warehouseId: user.warehouseId,
    isDemo: user.isDemo || false
  }
  
  return encodeNextAuthJWT(token)
}

/**
 * Create cookie header for authenticated requests
 */
export function createAuthCookie(token: string): string {
  const cookieName = process.env.NODE_ENV === 'production' 
    ? '__Secure-next-auth.session-token' 
    : 'next-auth.session-token'
  
  return `${cookieName}=${token}`
}

/**
 * Create a fully authenticated request helper
 */
export function createAuthHeaders(user: {
  id: string
  email: string
  name: string
  role: UserRole
  warehouseId?: string
  isDemo?: boolean
}): Record<string, string> {
  const token = createTestSessionToken(user)
  const cookie = createAuthCookie(token)
  
  return {
    'Cookie': cookie,
    'Content-Type': 'application/json'
  }
}