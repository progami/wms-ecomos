// Mock database setup for integration tests
// Since we're mocking Prisma, we don't need real database connections

export interface MockPrismaClient {
  $connect: jest.Mock
  $disconnect: jest.Mock
  $executeRawUnsafe: jest.Mock
  user: any
  inventoryBalance: any
  inventoryTransaction: any
  warehouse: any
  sku: any
  warehouseSkuConfig: any
}

// Mock database URL for tests
export function getTestDatabaseUrl(): string {
  return 'postgresql://test:test@localhost:5432/test_db'
}

// Mock setup for test database
export async function setupTestDatabase(): Promise<{ prisma: MockPrismaClient; databaseUrl: string }> {
  const databaseUrl = getTestDatabaseUrl()
  
  // Return mocked Prisma client (already set up in jest.setup.integration.js)
  const prisma = require('@/lib/prisma').default as MockPrismaClient
  
  return { prisma, databaseUrl }
}

// Mock teardown for test database
export async function teardownTestDatabase(prisma: MockPrismaClient, databaseUrl: string): Promise<void> {
  // Clear all mocks
  jest.clearAllMocks()
}

// Helper to create test user (returns mock data)
export async function createTestUser(prisma: MockPrismaClient, role: 'admin' | 'staff' = 'staff') {
  const mockUser = {
    id: `user-${Math.random().toString(36).substr(2, 9)}`,
    email: `test-${Math.random().toString(36).substr(2, 9)}@example.com`,
    fullName: 'Test User',
    passwordHash: '$2a$10$VldXqq6urbAo54EIvz79N.qRZqpI6JRtSBFOXwsnkcCyY5ZAjdVUm', // password: "password123"
    role,
    isActive: true,
    isDemo: false,
    warehouseId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastLoginAt: null
  }
  
  // Mock the Prisma response
  ;(prisma.user.create as jest.Mock).mockResolvedValueOnce(mockUser)
  
  return mockUser
}

// Helper to create test session
export function createTestSession(userId: string, role: 'admin' | 'staff' = 'staff') {
  return {
    user: {
      id: userId,
      email: 'test@example.com',
      fullName: 'Test User',
      role
    },
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
  }
}