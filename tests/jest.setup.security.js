// Mock Prisma client
jest.mock('@/lib/prisma', () => ({
  default: {
    user: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      upsert: jest.fn(),
    },
    warehouse: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    sku: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    inventoryBalance: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    inventoryTransaction: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      createMany: jest.fn(),
    },
    costRate: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    calculatedCost: {
      findMany: jest.fn(),
      create: jest.fn(),
      createMany: jest.fn(),
    },
    invoice: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    auditLog: {
      findMany: jest.fn(),
      create: jest.fn(),
      createMany: jest.fn(),
    },
    storageLedger: {
      findMany: jest.fn(),
      create: jest.fn(),
      createMany: jest.fn(),
    },
    reconciliation: {
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn((fn) => fn(jest.fn())),
    $queryRaw: jest.fn(),
    $executeRaw: jest.fn(),
  }
}));

// Mock next-auth
jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}));

// Mock authentication
jest.mock('next-auth/next', () => ({
  getServerSession: jest.fn(),
}));

// Global test utilities
global.mockPrismaClient = require('@/lib/prisma').default;