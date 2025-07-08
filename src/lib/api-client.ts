import { withBasePath } from '@/lib/utils/base-path'

/**
 * API client that automatically handles base path
 */

interface FetchOptions extends RequestInit {
  skipBaseAuth?: boolean
}

/**
 * Wrapper around fetch that automatically adds base path to API routes
 * @param url - The URL to fetch (will add base path if it starts with /api)
 * @param options - Fetch options
 * @returns Promise with the fetch response
 */
export async function apiFetch(url: string, options?: FetchOptions): Promise<Response> {
  // Only add base path for internal API routes
  const finalUrl = url.startsWith('/api') ? withBasePath(url) : url
  
  return fetch(finalUrl, options)
}

/**
 * Convenience method for GET requests
 */
export async function apiGet(url: string, options?: FetchOptions): Promise<Response> {
  return apiFetch(url, { ...options, method: 'GET' })
}

/**
 * Convenience method for POST requests
 */
export async function apiPost(url: string, body?: any, options?: FetchOptions): Promise<Response> {
  return apiFetch(url, {
    ...options,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  })
}

/**
 * Convenience method for PUT requests
 */
export async function apiPut(url: string, body?: any, options?: FetchOptions): Promise<Response> {
  return apiFetch(url, {
    ...options,
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  })
}

/**
 * Convenience method for DELETE requests
 */
export async function apiDelete(url: string, options?: FetchOptions): Promise<Response> {
  return apiFetch(url, { ...options, method: 'DELETE' })
}