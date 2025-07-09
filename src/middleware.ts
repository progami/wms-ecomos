import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

const basePath = process.env.BASE_PATH || ''

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // Remove base path from pathname for route checking
  const pathWithoutBase = basePath ? pathname.replace(basePath, '') : pathname
  
  // Public routes that don't require authentication
  const publicRoutes = [
    '/',
    '/auth/login',
    '/auth/error',
    '/api/auth',
    '/api/health',
    '/api/demo',
    '/api/logs',
  ]
  
  // Check if the route is public (using path without base)
  const isPublicRoute = publicRoutes.some(route => pathWithoutBase.includes(route))
  
  // Skip auth check for public routes, static files, and API routes
  if (isPublicRoute || pathname.includes('/_next') || pathname.includes('/favicon.ico')) {
    return NextResponse.next()
  }
  
  
  // Check for session
  const token = await getToken({ 
    req: request, 
    secret: process.env.NEXTAUTH_SECRET,
  })
  
  // If no token and trying to access protected route, redirect to login
  if (!token && !pathWithoutBase.includes('/auth/')) {
    const url = request.nextUrl.clone()
    url.pathname = `${basePath}/auth/login`
    url.searchParams.set('callbackUrl', request.nextUrl.pathname)
    return NextResponse.redirect(url)
  }
  
  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}