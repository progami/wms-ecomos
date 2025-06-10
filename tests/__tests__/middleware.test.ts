import { NextRequest, NextResponse } from 'next/server'
import { middleware } from '@/middleware'

// Mock next-auth/jwt
jest.mock('next-auth/jwt', () => ({
  getToken: jest.fn(),
}))

const { getToken } = jest.requireMock('next-auth/jwt')

describe('Middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  const createMockRequest = (url: string) => {
    return new NextRequest(new Request(`http://localhost:3000${url}`))
  }

  it('should allow access to public routes without authentication', async () => {
    const publicRoutes = ['/auth/login', '/api/health']
    
    for (const route of publicRoutes) {
      const request = createMockRequest(route)
      const response = await middleware(request)
      
      expect(response).toBeUndefined() // No redirect for public routes
    }
  })

  it('should redirect to login for protected routes without authentication', async () => {
    getToken.mockResolvedValue(null)
    
    const protectedRoutes = ['/dashboard', '/admin/users', '/finance/invoices']
    
    for (const route of protectedRoutes) {
      const request = createMockRequest(route)
      const response = await middleware(request)
      
      expect(response?.status).toBe(307) // Redirect status
      expect(response?.headers.get('location')).toContain('/auth/login')
    }
  })

  it('should allow authenticated users to access protected routes', async () => {
    getToken.mockResolvedValue({
      sub: 'user-123',
      role: 'admin',
      email: 'admin@test.com',
    })
    
    const request = createMockRequest('/dashboard')
    const response = await middleware(request)
    
    expect(response).toBeUndefined() // No redirect for authenticated users
  })

  it('should redirect non-admin users from admin routes', async () => {
    getToken.mockResolvedValue({
      sub: 'user-123',
      role: 'staff',
      email: 'staff@test.com',
    })
    
    const adminRoutes = ['/admin/users', '/admin/settings/security']
    
    for (const route of adminRoutes) {
      const request = createMockRequest(route)
      const response = await middleware(request)
      
      expect(response?.status).toBe(307)
      expect(response?.headers.get('location')).toBe('http://localhost:3000/unauthorized')
    }
  })

  it('should allow admin users to access admin routes', async () => {
    getToken.mockResolvedValue({
      sub: 'user-123',
      role: 'admin',
      email: 'admin@test.com',
    })
    
    const request = createMockRequest('/admin/users')
    const response = await middleware(request)
    
    expect(response).toBeUndefined() // No redirect for admin users
  })

  it('should allow access to static and special routes', async () => {
    const specialRoutes = [
      '/api/health',
      '/test/page',
      '/diagnostic',
      '/favicon.ico',
      '/robots.txt'
    ]
    
    for (const route of specialRoutes) {
      const request = createMockRequest(route)
      const response = await middleware(request)
      
      // Should return NextResponse.next() which we can't easily check
      // but it shouldn't redirect
      expect(response?.status).not.toBe(307)
    }
  })

  it('should redirect root to appropriate dashboard', async () => {
    // Test admin redirect
    getToken.mockResolvedValue({
      sub: 'user-123',
      role: 'admin',
      email: 'admin@test.com',
    })
    
    let request = createMockRequest('/')
    let response = await middleware(request)
    
    expect(response?.status).toBe(307)
    expect(response?.headers.get('location')).toBe('http://localhost:3000/admin/dashboard')
    
    // Test staff redirect
    getToken.mockResolvedValue({
      sub: 'user-456',
      role: 'staff',
      email: 'staff@test.com',
    })
    
    request = createMockRequest('/')
    response = await middleware(request)
    
    expect(response?.status).toBe(307)
    expect(response?.headers.get('location')).toBe('http://localhost:3000/dashboard')
  })
})