// Mock API handler for integration tests
import { NextRequest } from 'next/server'
import { createMocks, RequestMethod } from 'node-mocks-http'
import type { NextApiRequest, NextApiResponse } from 'next'

// Helper to create mocked Next.js API request and response
export function createMockRequestResponse(method: RequestMethod, url: string, options?: any) {
  const { req, res } = createMocks({
    method,
    url,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers
    },
    body: options?.body,
    query: options?.query,
    ...options
  })

  return { req: req as NextApiRequest, res: res as NextApiResponse }
}

// Helper to create NextRequest for App Router
export function createMockNextRequest(url: string, options?: RequestInit & { searchParams?: Record<string, string> }) {
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
  const fullUrl = new URL(url, baseUrl)
  
  // Add search params if provided
  if (options?.searchParams) {
    Object.entries(options.searchParams).forEach(([key, value]) => {
      fullUrl.searchParams.set(key, value)
    })
  }
  
  // Create request with proper method and body handling
  const requestInit: RequestInit = {
    method: options?.method || 'GET',
    headers: new Headers({
      'Content-Type': 'application/json',
      ...options?.headers
    })
  }
  
  // Only add body for methods that support it
  if (options?.body && ['POST', 'PUT', 'PATCH'].includes(requestInit.method!)) {
    requestInit.body = JSON.stringify(options.body)
  }
  
  return new NextRequest(fullUrl, requestInit)
}

// Helper to execute App Router API handlers
export async function callApiHandler(
  handler: (req: NextRequest) => Promise<Response>,
  url: string,
  options?: RequestInit & { searchParams?: Record<string, string> }
) {
  const request = createMockNextRequest(url, options)
  const response = await handler(request)
  
  // Parse response body
  const body = await response.json().catch(() => null)
  
  return {
    status: response.status,
    headers: Object.fromEntries(response.headers.entries()),
    body
  }
}