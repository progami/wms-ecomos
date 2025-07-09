// Jest setup for integration tests
require('./jest.setup.js')

// Mock next-auth globally
jest.mock('next-auth', () => ({
  getServerSession: jest.fn(() => Promise.resolve({
    user: {
      id: 'test-user-id',
      email: 'test@example.com',
      name: 'Test User',
      role: 'staff',
      warehouseId: undefined,
      isDemo: false
    },
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
  }))
}))

// Mock auth options
jest.mock('@/lib/auth', () => ({
  authOptions: {},
  getAuthOptions: () => ({})
}))

// Mock Prisma client to avoid database connections
jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    $connect: jest.fn(),
    $disconnect: jest.fn(),
    user: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn()
    },
    inventoryBalance: {
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn()
    },
    inventoryTransaction: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn()
    },
    warehouse: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn()
    },
    sku: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn()
    },
    warehouseSkuConfig: {
      findFirst: jest.fn(),
      create: jest.fn()
    }
  },
  prisma: {
    $connect: jest.fn(),
    $disconnect: jest.fn()
  }
}))

// Mock email service
jest.mock('@/lib/email', () => ({
  sendEmail: jest.fn(() => Promise.resolve({ success: true }))
}))

// Mock external services
jest.mock('amazon-sp-api', () => ({
  SellingPartnerAPI: jest.fn().mockImplementation(() => ({
    callAPI: jest.fn()
  }))
}))

// Set test environment variables
process.env.NODE_ENV = 'test'
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test'
process.env.NEXTAUTH_URL = 'http://localhost:3000'
process.env.NEXTAUTH_SECRET = 'test-secret'