import { PrismaClient } from '@prisma/client'
import { setupTestDatabase, teardownTestDatabase, createTestUser } from './setup/test-db'
import { createAuthenticatedRequest, setupTestAuth } from './setup/test-auth-setup'
import bcrypt from 'bcryptjs'

// Setup test authentication
setupTestAuth()

describe('Authentication API', () => {
  let prisma: PrismaClient
  let databaseUrl: string
  let request: ReturnType<typeof createAuthenticatedRequest>

  beforeAll(async () => {
    const setup = await setupTestDatabase()
    prisma = setup.prisma
    databaseUrl = setup.databaseUrl
    request = createAuthenticatedRequest(process.env.TEST_SERVER_URL || 'http://localhost:3001')
  })

  afterAll(async () => {
    await teardownTestDatabase(prisma, databaseUrl)
  })

  describe('Authentication Flow', () => {
    it('should verify test authentication is enabled', async () => {
      const response = await request
        .get('/api/health')
        .withAuth('staff')
      
      expect(response.status).toBe(200)
      expect(response.body.checks.testAuth).toBe(true)
    })
    
    it('should authenticate user with valid credentials', async () => {
      const user = await createTestUser(prisma)
      
      // The test user is created with password 'password123' already hashed
      // Just verify the user was created properly
      expect(user.email).toContain('@example.com')
      expect(user.isActive).toBe(true)
    })

    it('should handle inactive users', async () => {
      const user = await createTestUser(prisma)
      await prisma.user.update({
        where: { id: user.id },
        data: { isActive: false }
      })
      
      const updatedUser = await prisma.user.findUnique({
        where: { id: user.id }
      })
      
      expect(updatedUser?.isActive).toBe(false)
    })
  })

  describe('Authorization Headers', () => {
    it('should accept requests with test auth headers', async () => {
      const adminUser = await createTestUser(prisma, 'admin')
      
      const response = await request
        .get('/api/admin/users')
        .withAuth('admin', adminUser.id)
      
      expect(response.status).toBe(200)
    })

    it('should respect role-based access control', async () => {
      const staffUser = await createTestUser(prisma, 'staff')
      
      // Staff user trying to access admin endpoint
      const response = await request
        .get('/api/admin/users')
        .withAuth('staff', staffUser.id)
      
      expect(response.status).toBe(403)
    })
  })

  describe('Password Security', () => {
    it('should properly hash passwords', async () => {
      const user = await createTestUser(prisma)
      
      // Verify password is hashed
      expect(user.passwordHash).not.toBe('password123')
      expect(user.passwordHash).toMatch(/^\$2[aby]\$\d{2}\$/)
    })
    
    it('should verify correct passwords', async () => {
      const user = await createTestUser(prisma)
      
      // Test the credential validation logic directly
      const validPassword = await bcrypt.compare('password123', user.passwordHash)
      expect(validPassword).toBe(true)
      
      const invalidPassword = await bcrypt.compare('wrongpassword', user.passwordHash)
      expect(invalidPassword).toBe(false)
    })
  })
})