// Setup test environment
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgresql://test:test@localhost:5432/wms_test';
process.env.JWT_SECRET = 'test-secret-key';

// Mock environment variables
process.env.NEXT_PUBLIC_API_URL = 'http://localhost:3000/api';
process.env.REDIS_URL = 'redis://localhost:6379';

// Global test utilities
global.testUtils = {
  generateId: () => Math.random().toString(36).substring(7),
  wait: (ms) => new Promise(resolve => setTimeout(resolve, ms)),
  createMockFile: (name, content, type = 'text/plain') => {
    return new File([content], name, { type });
  }
};

// Setup global error handlers
process.on('unhandledRejection', (error) => {
  console.error('Unhandled Promise Rejection:', error);
});

// Mock axios for network tests
jest.mock('axios');

// Increase timeout for edge case tests
jest.setTimeout(30000);

// Clean up after all tests
afterAll(async () => {
  // Close database connections
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();
  await prisma.$disconnect();
});