// Set up environment variables for tests
process.env.PRISMA_SCHEMA_PATH = process.env.PRISMA_SCHEMA_PATH || '../prisma/schema.prisma';

// Mock Prisma for tests
jest.mock('@prisma/client', () => {
  const mockPrismaClient = {
    $connect: jest.fn(),
    $disconnect: jest.fn(),
    $transaction: jest.fn(),
    // Add other Prisma methods as needed
  };
  
  return {
    PrismaClient: jest.fn(() => mockPrismaClient)
  };
});