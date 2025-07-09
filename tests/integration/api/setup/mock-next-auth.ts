// Mock NextAuth for integration tests
import { jest } from '@jest/globals'

// Mock user for tests
export const mockUser = {
  id: 'test-user-id',
  email: 'test@example.com',
  name: 'Test User',
  role: 'staff' as const,
  warehouseId: undefined as string | undefined,
  isDemo: false
}

// Mock session
export const mockSession = {
  user: mockUser,
  expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
}

// Mock getServerSession
export const mockGetServerSession = jest.fn(() => Promise.resolve(mockSession))

// Setup NextAuth mocks
export function setupNextAuthMocks() {
  // Mock the next-auth module
  jest.mock('next-auth', () => ({
    getServerSession: mockGetServerSession
  }))
  
  // Mock the auth options
  jest.mock('@/lib/auth', () => ({
    authOptions: {},
    getAuthOptions: () => ({})
  }))
}

// Helper to set custom session for specific tests
export function setMockSession(session: any) {
  mockGetServerSession.mockResolvedValueOnce(session)
}

// Helper to set unauthorized (no session)
export function setUnauthorized() {
  mockGetServerSession.mockResolvedValueOnce(null)
}

// Helper to set user role
export function setUserRole(role: 'admin' | 'staff', warehouseId?: string) {
  const customSession = {
    ...mockSession,
    user: {
      ...mockUser,
      role,
      warehouseId
    }
  }
  mockGetServerSession.mockResolvedValueOnce(customSession)
}