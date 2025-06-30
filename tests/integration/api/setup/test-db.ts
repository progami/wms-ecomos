import { PrismaClient } from '@prisma/client'
import { execSync } from 'child_process'
import { randomBytes } from 'crypto'

// Generate a unique test database URL
export function getTestDatabaseUrl(): string {
  const dbName = `test_${randomBytes(4).toString('hex')}`
  const baseUrl = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/wms_test'
  
  // Replace the database name in the URL
  const url = new URL(baseUrl)
  const pathParts = url.pathname.split('/')
  pathParts[pathParts.length - 1] = dbName
  url.pathname = pathParts.join('/')
  
  return url.toString()
}

// Setup test database
export async function setupTestDatabase(): Promise<{ prisma: PrismaClient; databaseUrl: string }> {
  const databaseUrl = getTestDatabaseUrl()
  
  // Set the DATABASE_URL for Prisma
  process.env.DATABASE_URL = databaseUrl
  
  // Create the database
  execSync(`npx prisma db push --skip-generate`, {
    env: { ...process.env, DATABASE_URL: databaseUrl }
  })
  
  // Create Prisma client
  const prisma = new PrismaClient({
    datasources: { db: { url: databaseUrl } }
  })
  
  await prisma.$connect()
  
  return { prisma, databaseUrl }
}

// Teardown test database
export async function teardownTestDatabase(prisma: PrismaClient, databaseUrl: string): Promise<void> {
  await prisma.$disconnect()
  
  // Extract database name from URL
  const url = new URL(databaseUrl)
  const dbName = url.pathname.split('/').pop()
  
  // Drop the test database
  const adminUrl = databaseUrl.replace(`/${dbName}`, '/postgres')
  const adminPrisma = new PrismaClient({
    datasources: { db: { url: adminUrl } }
  })
  
  await adminPrisma.$connect()
  await adminPrisma.$executeRawUnsafe(`DROP DATABASE IF EXISTS "${dbName}"`)
  await adminPrisma.$disconnect()
}

// Create test user
export async function createTestUser(prisma: PrismaClient, role: 'ADMIN' | 'USER' | 'VIEWER' = 'USER') {
  const user = await prisma.user.create({
    data: {
      email: `test-${randomBytes(4).toString('hex')}@example.com`,
      name: 'Test User',
      password: '$2a$10$K7L1mrbVHC5SZxyoakG6wuqJPqm3WNmRuW9fhJz1w9TNJLXdJ1aJS', // password: "password123"
      role,
      emailVerified: new Date(),
      isActive: true
    }
  })
  
  return user
}

// Create test session
export async function createTestSession(userId: string) {
  return {
    user: {
      id: userId,
      email: 'test@example.com',
      name: 'Test User',
      role: 'USER'
    },
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
  }
}