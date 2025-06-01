import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

export async function middleware(request: NextRequest) {
  const token = await getToken({ req: request })
  const { pathname } = request.nextUrl

  // Allow access to public routes
  if (
    pathname.startsWith('/auth') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/auth') ||
    pathname === '/favicon.ico' ||
    pathname === '/robots.txt'
  ) {
    return NextResponse.next()
  }

  // Redirect to login if not authenticated
  if (!token) {
    const url = request.nextUrl.clone()
    url.pathname = '/auth/login'
    return NextResponse.redirect(url)
  }

  // Role-based access control
  const userRole = token.role as string

  // Admin routes
  if (pathname.startsWith('/admin') && userRole !== 'system_admin') {
    const url = request.nextUrl.clone()
    url.pathname = '/unauthorized'
    return NextResponse.redirect(url)
  }

  // Finance routes
  if (
    pathname.startsWith('/finance') &&
    !['system_admin', 'finance_admin'].includes(userRole)
  ) {
    const url = request.nextUrl.clone()
    url.pathname = '/unauthorized'
    return NextResponse.redirect(url)
  }

  // Warehouse routes
  if (
    pathname.startsWith('/warehouse') &&
    !['system_admin', 'warehouse_staff'].includes(userRole)
  ) {
    const url = request.nextUrl.clone()
    url.pathname = '/unauthorized'
    return NextResponse.redirect(url)
  }

  // Redirect authenticated users from login page
  if (pathname === '/auth/login' && token) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  // Redirect root to appropriate dashboard based on role
  if (pathname === '/') {
    const url = request.nextUrl.clone()
    switch (userRole) {
      case 'system_admin':
        url.pathname = '/admin/dashboard'
        break
      case 'finance_admin':
        url.pathname = '/finance/dashboard'
        break
      case 'warehouse_staff':
        url.pathname = '/warehouse/dashboard'
        break
      default:
        url.pathname = '/dashboard'
    }
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}