import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const response = NextResponse.next()
  const { pathname } = request.nextUrl

  // Add caching headers for specific API routes
  if (pathname.startsWith('/api/')) {
    // Cache static data endpoints
    if (pathname.includes('/api/warehouses') ||
        pathname.includes('/api/skus') && request.method === 'GET' ||
        pathname.includes('/api/cost-rates') && request.method === 'GET') {
      // Cache for 5 minutes - these don't change often
      response.headers.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600')
    }
    // Cache dashboard data for 1 minute to reduce load
    else if (pathname.includes('/api/finance/dashboard') ||
             pathname.includes('/api/admin/dashboard') ||
             pathname.includes('/api/dashboard')) {
      response.headers.set('Cache-Control', 'private, s-maxage=60, stale-while-revalidate=120')
    }
    // Cache reporting endpoints for 2 minutes
    else if (pathname.includes('/api/reports') && request.method === 'GET') {
      response.headers.set('Cache-Control', 'private, s-maxage=120, stale-while-revalidate=240')
    }
    // Default for other API routes - no cache
    else {
      response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate')
    }
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
}