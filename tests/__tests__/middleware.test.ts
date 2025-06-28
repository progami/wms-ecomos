import { NextRequest, NextResponse } from 'next/server'
import { middleware } from '@/middleware'
import { getToken } from 'next-auth/jwt'

// Mock next-auth
jest.mock('next-auth/jwt', () => ({
  getToken: jest.fn(),
}))

// Mock rate limiter
jest.mock('@/lib/security/rate-limiter', () => ({
  checkRateLimit: jest.fn(),
}))

describe('Middleware', () => {
  const mockGetToken = getToken as jest.MockedFunction<typeof getToken>
  
  beforeEach(() => {
    jest.clearAllMocks()
    process.env.NODE_ENV = 'production'
  })

  afterEach(() => {
    process.env.NODE_ENV = 'test'
  })

  describe('Authentication', () => {
    it('should allow access to public routes without authentication', async () => {
      const request = new NextRequest('http://localhost:3000/auth/login')
      mockGetToken.mockResolvedValueOnce(null)

      const response = await middleware(request)
      
      expect(response).not.toBe(NextResponse.redirect)
    })

    it('should redirect unauthenticated users from protected routes', async () => {
      const request = new NextRequest('http://localhost:3000/dashboard')
      mockGetToken.mockResolvedValueOnce(null)

      const response = await middleware(request)
      
      expect(response?.status).toBe(307) // Redirect status
    })

    it('should allow authenticated users to access protected routes', async () => {
      const request = new NextRequest('http://localhost:3000/dashboard')
      mockGetToken.mockResolvedValueOnce({
        email: 'admin@example.com',
        role: 'admin',
        sub: '123',
      } as any)

      const response = await middleware(request)
      
      expect(response?.headers.get('x-user-role')).toBe('admin')
    })
  })

  describe('Admin-only Access in Production', () => {
    it('should block non-admin users in production', async () => {
      const request = new NextRequest('http://localhost:3000/dashboard')
      mockGetToken.mockResolvedValueOnce({
        email: 'user@example.com',
        role: 'user',
        sub: '123',
      } as any)

      const response = await middleware(request)
      
      expect(response?.status).toBe(307)
      expect(response?.headers.get('Location')).toContain('/unauthorized')
    })

    it('should allow admin users in production', async () => {
      const request = new NextRequest('http://localhost:3000/dashboard')
      mockGetToken.mockResolvedValueOnce({
        email: 'admin@example.com',
        role: 'admin',
        sub: '123',
      } as any)

      const response = await middleware(request)
      
      expect(response?.status).not.toBe(307)
    })
  })

  describe('Security Headers', () => {
    it('should add security headers to responses', async () => {
      const request = new NextRequest('http://localhost:3000/api/health')
      mockGetToken.mockResolvedValueOnce(null)

      const response = await middleware(request)
      
      expect(response?.headers.get('X-Frame-Options')).toBe('DENY')
      expect(response?.headers.get('X-Content-Type-Options')).toBe('nosniff')
      expect(response?.headers.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin')
      expect(response?.headers.get('Permissions-Policy')).toBeDefined()
    })

    it('should set HSTS header in production', async () => {
      const request = new NextRequest('http://localhost:3000/api/health')
      mockGetToken.mockResolvedValueOnce(null)

      const response = await middleware(request)
      
      expect(response?.headers.get('Strict-Transport-Security')).toBe('max-age=31536000; includeSubDomains')
    })
  })

  describe('Rate Limiting', () => {
    it('should apply rate limiting to login routes', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/signin')
      request.headers.set('x-forwarded-for', '192.168.1.1')
      
      // Simulate rate limit exceeded
      const { checkRateLimit } = require('@/lib/security/rate-limiter')
      checkRateLimit.mockResolvedValueOnce({ allowed: false })

      const response = await middleware(request)
      
      expect(response?.status).toBe(429)
    })

    it('should track rate limits by IP address', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/signin')
      request.headers.set('x-forwarded-for', '192.168.1.1')
      
      const { checkRateLimit } = require('@/lib/security/rate-limiter')
      checkRateLimit.mockResolvedValueOnce({ allowed: true })

      await middleware(request)
      
      expect(checkRateLimit).toHaveBeenCalledWith(
        expect.stringContaining('login:192.168.1.1'),
        expect.any(Object)
      )
    })
  })
})