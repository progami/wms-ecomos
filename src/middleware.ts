import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  console.log('[Middleware] Processing request for:', pathname)
  
  // Public routes that don't require authentication
  const publicRoutes = [
    '/auth/login',
    '/auth/error',
    '/api/auth',
    '/api/health',
  ]
  
  // Check if the route is public
  const isPublicRoute = publicRoutes.some(route => pathname.includes(route))
  
  // Skip auth check for public routes, static files, and API routes
  if (isPublicRoute || pathname.includes('/_next') || pathname.includes('/favicon.ico')) {
    console.log('[Middleware] Public route, skipping auth check')
    return NextResponse.next()
  }
  
  // Check for session
  const token = await getToken({ 
    req: request, 
    secret: process.env.NEXTAUTH_SECRET,
  })
  
  console.log('[Middleware] Token:', token ? 'exists' : 'missing')
  
  // If no token and trying to access protected route, redirect to login
  if (!token && !pathname.includes('/auth/')) {
    console.log('[Middleware] No token, redirecting to login')
    const url = request.nextUrl.clone()
    url.pathname = '/WMS/auth/login'
    url.searchParams.set('callbackUrl', request.nextUrl.pathname)
    return NextResponse.redirect(url)
  }
  
  console.log('[Middleware] Allowing request')
  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}