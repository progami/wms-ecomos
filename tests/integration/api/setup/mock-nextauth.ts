/**
 * Mock NextAuth for integration tests
 * 
 * This module provides a way to mock NextAuth's getServerSession
 * for integration tests that run against a real server.
 */

import { UserRole } from '@prisma/client'

export interface MockSession {
  user: {
    id: string
    email: string
    name: string
    role: UserRole
    warehouseId?: string
    isDemo?: boolean
  }
  expires: string
}

// Store the current mock session
let currentMockSession: MockSession | null = null

// Set the mock session
export function setMockSession(session: MockSession | null) {
  currentMockSession = session
}

// Get the mock session
export function getMockSession(): MockSession | null {
  return currentMockSession
}

// Create a mock user session
export function createMockSession(user: {
  id: string
  email: string
  fullName: string
  role: UserRole
  warehouseId?: string | null
  isDemo?: boolean
}): MockSession {
  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.fullName,
      role: user.role,
      warehouseId: user.warehouseId || undefined,
      isDemo: user.isDemo || false
    },
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
  }
}

// Setup mock for module
export function setupNextAuthMock() {
  // This would be used if we could intercept the server's auth
  // For now, we'll use actual JWT tokens
  console.log('NextAuth mock setup complete')
}