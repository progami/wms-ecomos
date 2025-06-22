import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { checkRateLimit, rateLimitConfigs } from '@/lib/security/rate-limiter'
import { csrfProtection, generateCSRFToken, setCSRFCookie } from '@/lib/security/csrf-protection'
import { validateSession } from '@/lib/security/session-manager'
import { apiLogger, authLogger, securityLogger, perfLogger } from '@/lib/logger'

export async function middleware(request: NextRequest) {
  const startTime = Date.now()
  const token = await getToken({ req: request })
  const { pathname } = request.nextUrl
  const requestId = crypto.randomUUID()
  
  // Log incoming request
  apiLogger.http('Middleware processing request', {
    requestId,
    method: request.method,
    path: pathname,
    ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
    userAgent: request.headers.get('user-agent'),
    userId: token?.id,
  })

  // Apply enhanced rate limiting to auth endpoints
  if (pathname.startsWith('/api/auth/')) {
    // Import auth rate limiter
    const { checkAuthRateLimit } = await import('@/lib/security/auth-rate-limiter')
    
    // Extract username from request body for signin attempts
    let username: string | undefined
    if (pathname.includes('signin') || pathname.includes('callback')) {
      try {
        const body = await request.clone().text()
        const params = new URLSearchParams(body)
        username = params.get('username') || params.get('email') || undefined
      } catch {
        // Ignore body parsing errors
      }
    }
    
    const rateLimitResponse = await checkAuthRateLimit(request, username)
    if (rateLimitResponse) {
      securityLogger.warn('Auth rate limit exceeded', {
        requestId,
        path: pathname,
        ip: request.headers.get('x-forwarded-for') || 'unknown',
        username,
      })
      return rateLimitResponse
    }
  }

  // Apply general API rate limiting
  if (pathname.startsWith('/api/')) {
    const rateLimitResponse = await checkRateLimit(request, rateLimitConfigs.api)
    if (rateLimitResponse) return rateLimitResponse
  }

  // CSRF protection for API routes
  if (pathname.startsWith('/api/') && !pathname.startsWith('/api/auth/')) {
    const csrfResponse = csrfProtection(request)
    if (csrfResponse) {
      securityLogger.warn('CSRF protection blocked request', {
        requestId,
        path: pathname,
        method: request.method,
        ip: request.headers.get('x-forwarded-for') || 'unknown',
      })
      return csrfResponse
    }
  }

  // Public routes that don't require authentication
  const publicRoutes = [
    '/auth',
    '/_next',
    '/api/auth',  // Allow all auth API routes
    '/api/health',
    '/api/demo',  // Allow demo API routes
    '/api/test',  // Allow test API routes
    '/api/logs',  // Allow client logging
    '/test',
    '/diagnostic',
    '/favicon.ico',
    '/robots.txt'
  ]

  if (publicRoutes.some(route => pathname.startsWith(route))) {
    // Generate CSRF token for non-authenticated requests
    if (!request.cookies.get('csrf-token')) {
      const response = NextResponse.next()
      const csrfToken = generateCSRFToken()
      const duration = Date.now() - startTime
      perfLogger.log('Middleware completed (public route)', { requestId, path: pathname, duration })
      return setCSRFCookie(response, csrfToken)
    }
    const duration = Date.now() - startTime
    perfLogger.log('Middleware completed (public route)', { requestId, path: pathname, duration })
    return NextResponse.next()
  }

  // Skip session validation for now - rely on JWT token validation
  // The in-memory session manager loses sessions on server restart
  // TODO: Implement persistent session storage if needed

  // Handle unauthenticated requests
  if (!token) {
    authLogger.warn('Unauthenticated access attempt', {
      requestId,
      path: pathname,
      ip: request.headers.get('x-forwarded-for') || 'unknown',
    })
    
    // For API routes, return JSON error instead of redirecting
    if (pathname.startsWith('/api/')) {
      const duration = Date.now() - startTime
      perfLogger.log('Middleware completed (unauthorized API)', { requestId, path: pathname, duration })
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Authentication required' },
        { status: 401 }
      )
    }
    // For regular routes, redirect to login
    const url = request.nextUrl.clone()
    url.pathname = '/auth/login'
    const duration = Date.now() - startTime
    perfLogger.log('Middleware completed (redirect to login)', { requestId, path: pathname, duration })
    return NextResponse.redirect(url)
  }

  // Role-based access control
  const userRole = token.role as string
  const userWarehouseId = token.warehouseId as string | null
  const isAdmin = userRole === 'admin'
  const isStaff = userRole === 'staff'

  // Staff with null warehouseId should not access any protected routes
  if (isStaff && !userWarehouseId) {
    const url = request.nextUrl.clone()
    url.pathname = '/unauthorized'
    return NextResponse.redirect(url)
  }

  // Admin-only routes
  const adminOnlyRoutes = [
    '/admin/users',
    '/admin/settings/security',
    '/admin/settings/database',
    '/admin/settings/general',
    '/admin/settings/notifications'
  ]
  
  if (adminOnlyRoutes.some(route => pathname === route || pathname.startsWith(route + '/')) && !isAdmin) {
    securityLogger.warn('Unauthorized admin route access attempt', {
      requestId,
      path: pathname,
      userId: token.id,
      userRole,
    })
    const url = request.nextUrl.clone()
    url.pathname = '/unauthorized'
    const duration = Date.now() - startTime
    perfLogger.log('Middleware completed (unauthorized admin)', { requestId, path: pathname, duration })
    return NextResponse.redirect(url)
  }

  // Generate CSRF token if not present
  let response = NextResponse.next()
  if (!request.cookies.get('csrf-token')) {
    const csrfToken = generateCSRFToken()
    response = setCSRFCookie(response, csrfToken) as NextResponse
  }

  // Redirect authenticated users from login page
  if (pathname === '/auth/login' && token) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  // Redirect root to dashboard for all authenticated users
  if (pathname === '/') {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  // Redirect old admin dashboard to unified dashboard
  if (pathname === '/admin/dashboard' && token) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  const duration = Date.now() - startTime
  perfLogger.log('Middleware completed', { requestId, path: pathname, duration })
  perfLogger.slow('Middleware processing', duration, 100, { requestId, path: pathname })
  
  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}