import { PrismaClient } from '@prisma/client'
import request from 'supertest'
import { setupTestDatabase, teardownTestDatabase, createTestUser, createTestSession } from './setup/test-db'
import * as bcrypt from 'bcryptjs'

describe('User Management API Endpoints', () => {
  let prisma: PrismaClient
  let databaseUrl: string
  let adminUser: any
  let regularUser: any
  let adminSession: any
  let userSession: any

  beforeAll(async () => {
    const setup = await setupTestDatabase()
    prisma = setup.prisma
    databaseUrl = setup.databaseUrl

    // Create test users
    adminUser = await createTestUser(prisma, 'ADMIN')
    regularUser = await createTestUser(prisma, 'USER')
    
    // Create sessions
    adminSession = await createTestSession(adminUser.id)
    userSession = await createTestSession(regularUser.id)
  })

  afterAll(async () => {
    await teardownTestDatabase(prisma, databaseUrl)
  })

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET /api/admin/users', () => {
    it('should return list of users for admin', async () => {
      // Create additional test users
      await createTestUser(prisma, 'USER')
      await createTestUser(prisma, 'VIEWER')
      
      jest.mock('next-auth', () => ({
        getServerSession: jest.fn().mockResolvedValue(adminSession)
      }))

      const response = await request(process.env.TEST_SERVER_URL || 'http://localhost:3000')
        .get('/api/admin/users')
        .set('Cookie', 'next-auth.session-token=test-token')

      expect(response.status).toBe(200)
      expect(response.body).toHaveProperty('users')
      expect(response.body.users.length).toBeGreaterThanOrEqual(4) // Including admin and regular user
      expect(response.body).toHaveProperty('total')
    })

    it('should filter users by role', async () => {
      jest.mock('next-auth', () => ({
        getServerSession: jest.fn().mockResolvedValue(adminSession)
      }))

      const response = await request(process.env.TEST_SERVER_URL || 'http://localhost:3000')
        .get('/api/admin/users?role=ADMIN')
        .set('Cookie', 'next-auth.session-token=test-token')

      expect(response.status).toBe(200)
      expect(response.body.users.every((u: any) => u.role === 'ADMIN')).toBe(true)
    })

    it('should filter users by active status', async () => {
      // Create inactive user
      const inactiveUser = await createTestUser(prisma)
      await prisma.user.update({
        where: { id: inactiveUser.id },
        data: { isActive: false }
      })

      jest.mock('next-auth', () => ({
        getServerSession: jest.fn().mockResolvedValue(adminSession)
      }))

      const response = await request(process.env.TEST_SERVER_URL || 'http://localhost:3000')
        .get('/api/admin/users?isActive=false')
        .set('Cookie', 'next-auth.session-token=test-token')

      expect(response.status).toBe(200)
      expect(response.body.users.some((u: any) => u.id === inactiveUser.id)).toBe(true)
      expect(response.body.users.every((u: any) => !u.isActive)).toBe(true)
    })

    it('should search users by name or email', async () => {
      await createTestUser(prisma, 'USER')
      const searchUser = await prisma.user.create({
        data: {
          email: 'searchtest@example.com',
          name: 'Searchable User',
          password: await bcrypt.hash('password123', 10),
          role: 'USER',
          emailVerified: new Date(),
          isActive: true
        }
      })

      jest.mock('next-auth', () => ({
        getServerSession: jest.fn().mockResolvedValue(adminSession)
      }))

      const response = await request(process.env.TEST_SERVER_URL || 'http://localhost:3000')
        .get('/api/admin/users?search=searchable')
        .set('Cookie', 'next-auth.session-token=test-token')

      expect(response.status).toBe(200)
      expect(response.body.users.some((u: any) => u.id === searchUser.id)).toBe(true)
    })

    it('should return 403 for non-admin users', async () => {
      jest.mock('next-auth', () => ({
        getServerSession: jest.fn().mockResolvedValue(userSession)
      }))

      const response = await request(process.env.TEST_SERVER_URL || 'http://localhost:3000')
        .get('/api/admin/users')
        .set('Cookie', 'next-auth.session-token=test-token')

      expect(response.status).toBe(403)
      expect(response.body).toHaveProperty('error', 'Forbidden')
    })
  })

  describe('POST /api/admin/users', () => {
    it('should create new user with valid data', async () => {
      jest.mock('next-auth', () => ({
        getServerSession: jest.fn().mockResolvedValue(adminSession)
      }))

      const newUser = {
        email: 'newuser@example.com',
        name: 'New User',
        password: 'SecurePassword123!',
        role: 'USER'
      }

      const response = await request(process.env.TEST_SERVER_URL || 'http://localhost:3000')
        .post('/api/admin/users')
        .set('Cookie', 'next-auth.session-token=test-token')
        .send(newUser)

      expect(response.status).toBe(201)
      expect(response.body).toHaveProperty('id')
      expect(response.body).toMatchObject({
        email: newUser.email,
        name: newUser.name,
        role: newUser.role
      })
      expect(response.body).not.toHaveProperty('password')
    })

    it('should validate email format', async () => {
      jest.mock('next-auth', () => ({
        getServerSession: jest.fn().mockResolvedValue(adminSession)
      }))

      const response = await request(process.env.TEST_SERVER_URL || 'http://localhost:3000')
        .post('/api/admin/users')
        .set('Cookie', 'next-auth.session-token=test-token')
        .send({
          email: 'invalid-email',
          name: 'Test User',
          password: 'password123',
          role: 'USER'
        })

      expect(response.status).toBe(400)
      expect(response.body).toHaveProperty('error', expect.stringContaining('email'))
    })

    it('should prevent duplicate emails', async () => {
      const existingUser = await createTestUser(prisma)

      jest.mock('next-auth', () => ({
        getServerSession: jest.fn().mockResolvedValue(adminSession)
      }))

      const response = await request(process.env.TEST_SERVER_URL || 'http://localhost:3000')
        .post('/api/admin/users')
        .set('Cookie', 'next-auth.session-token=test-token')
        .send({
          email: existingUser.email,
          name: 'Duplicate User',
          password: 'password123',
          role: 'USER'
        })

      expect(response.status).toBe(400)
      expect(response.body).toHaveProperty('error', expect.stringContaining('already exists'))
    })

    it('should validate password strength', async () => {
      jest.mock('next-auth', () => ({
        getServerSession: jest.fn().mockResolvedValue(adminSession)
      }))

      const response = await request(process.env.TEST_SERVER_URL || 'http://localhost:3000')
        .post('/api/admin/users')
        .set('Cookie', 'next-auth.session-token=test-token')
        .send({
          email: 'weakpassword@example.com',
          name: 'Test User',
          password: '123', // Too weak
          role: 'USER'
        })

      expect(response.status).toBe(400)
      expect(response.body).toHaveProperty('error', expect.stringContaining('password'))
    })

    it('should validate role', async () => {
      jest.mock('next-auth', () => ({
        getServerSession: jest.fn().mockResolvedValue(adminSession)
      }))

      const response = await request(process.env.TEST_SERVER_URL || 'http://localhost:3000')
        .post('/api/admin/users')
        .set('Cookie', 'next-auth.session-token=test-token')
        .send({
          email: 'invalidrole@example.com',
          name: 'Test User',
          password: 'password123',
          role: 'SUPERADMIN' // Invalid role
        })

      expect(response.status).toBe(400)
      expect(response.body).toHaveProperty('error', expect.stringContaining('role'))
    })
  })

  describe('PUT /api/admin/users/:id', () => {
    it('should update user details', async () => {
      const userToUpdate = await createTestUser(prisma)

      jest.mock('next-auth', () => ({
        getServerSession: jest.fn().mockResolvedValue(adminSession)
      }))

      const updates = {
        name: 'Updated Name',
        role: 'VIEWER'
      }

      const response = await request(process.env.TEST_SERVER_URL || 'http://localhost:3000')
        .put(`/api/admin/users/${userToUpdate.id}`)
        .set('Cookie', 'next-auth.session-token=test-token')
        .send(updates)

      expect(response.status).toBe(200)
      expect(response.body).toMatchObject(updates)
    })

    it('should update user password', async () => {
      const userToUpdate = await createTestUser(prisma)

      jest.mock('next-auth', () => ({
        getServerSession: jest.fn().mockResolvedValue(adminSession)
      }))

      const response = await request(process.env.TEST_SERVER_URL || 'http://localhost:3000')
        .put(`/api/admin/users/${userToUpdate.id}`)
        .set('Cookie', 'next-auth.session-token=test-token')
        .send({
          password: 'NewSecurePassword123!'
        })

      expect(response.status).toBe(200)

      // Verify password was updated
      const updatedUser = await prisma.user.findUnique({
        where: { id: userToUpdate.id }
      })
      const passwordValid = await bcrypt.compare('NewSecurePassword123!', updatedUser!.password)
      expect(passwordValid).toBe(true)
    })

    it('should deactivate user', async () => {
      const userToDeactivate = await createTestUser(prisma)

      jest.mock('next-auth', () => ({
        getServerSession: jest.fn().mockResolvedValue(adminSession)
      }))

      const response = await request(process.env.TEST_SERVER_URL || 'http://localhost:3000')
        .put(`/api/admin/users/${userToDeactivate.id}`)
        .set('Cookie', 'next-auth.session-token=test-token')
        .send({
          isActive: false
        })

      expect(response.status).toBe(200)
      expect(response.body.isActive).toBe(false)
    })

    it('should not allow updating own admin role', async () => {
      jest.mock('next-auth', () => ({
        getServerSession: jest.fn().mockResolvedValue(adminSession)
      }))

      const response = await request(process.env.TEST_SERVER_URL || 'http://localhost:3000')
        .put(`/api/admin/users/${adminUser.id}`)
        .set('Cookie', 'next-auth.session-token=test-token')
        .send({
          role: 'USER'
        })

      expect(response.status).toBe(400)
      expect(response.body).toHaveProperty('error', expect.stringContaining('Cannot modify your own admin role'))
    })

    it('should return 404 for non-existent user', async () => {
      jest.mock('next-auth', () => ({
        getServerSession: jest.fn().mockResolvedValue(adminSession)
      }))

      const response = await request(process.env.TEST_SERVER_URL || 'http://localhost:3000')
        .put('/api/admin/users/non-existent-id')
        .set('Cookie', 'next-auth.session-token=test-token')
        .send({
          name: 'Updated Name'
        })

      expect(response.status).toBe(404)
      expect(response.body).toHaveProperty('error', 'User not found')
    })
  })

  describe('DELETE /api/admin/users/:id', () => {
    it('should soft delete user (deactivate)', async () => {
      const userToDelete = await createTestUser(prisma)

      jest.mock('next-auth', () => ({
        getServerSession: jest.fn().mockResolvedValue(adminSession)
      }))

      const response = await request(process.env.TEST_SERVER_URL || 'http://localhost:3000')
        .delete(`/api/admin/users/${userToDelete.id}`)
        .set('Cookie', 'next-auth.session-token=test-token')

      expect(response.status).toBe(200)
      
      // Verify user is deactivated
      const deletedUser = await prisma.user.findUnique({
        where: { id: userToDelete.id }
      })
      expect(deletedUser?.isActive).toBe(false)
    })

    it('should not allow deleting own account', async () => {
      jest.mock('next-auth', () => ({
        getServerSession: jest.fn().mockResolvedValue(adminSession)
      }))

      const response = await request(process.env.TEST_SERVER_URL || 'http://localhost:3000')
        .delete(`/api/admin/users/${adminUser.id}`)
        .set('Cookie', 'next-auth.session-token=test-token')

      expect(response.status).toBe(400)
      expect(response.body).toHaveProperty('error', expect.stringContaining('Cannot delete your own account'))
    })

    it('should not delete last admin', async () => {
      // Ensure adminUser is the only admin
      await prisma.user.updateMany({
        where: { 
          id: { not: adminUser.id },
          role: 'ADMIN'
        },
        data: { role: 'USER' }
      })

      jest.mock('next-auth', () => ({
        getServerSession: jest.fn().mockResolvedValue(adminSession)
      }))

      const response = await request(process.env.TEST_SERVER_URL || 'http://localhost:3000')
        .delete(`/api/admin/users/${adminUser.id}`)
        .set('Cookie', 'next-auth.session-token=test-token')

      expect(response.status).toBe(400)
      expect(response.body).toHaveProperty('error', expect.stringContaining('last admin'))
    })
  })

  describe('GET /api/audit-logs', () => {
    it('should return audit logs for admin users', async () => {
      // Create audit logs
      await prisma.auditLog.create({
        data: {
          userId: adminUser.id,
          action: 'CREATE',
          entityType: 'USER',
          entityId: 'test-user-id',
          details: { email: 'test@example.com' },
          timestamp: new Date()
        }
      })
      await prisma.auditLog.create({
        data: {
          userId: regularUser.id,
          action: 'UPDATE',
          entityType: 'SKU',
          entityId: 'test-sku-id',
          details: { field: 'description', oldValue: 'old', newValue: 'new' },
          timestamp: new Date()
        }
      })

      jest.mock('next-auth', () => ({
        getServerSession: jest.fn().mockResolvedValue(adminSession)
      }))

      const response = await request(process.env.TEST_SERVER_URL || 'http://localhost:3000')
        .get('/api/audit-logs')
        .set('Cookie', 'next-auth.session-token=test-token')

      expect(response.status).toBe(200)
      expect(response.body).toHaveProperty('logs')
      expect(response.body.logs.length).toBeGreaterThanOrEqual(2)
      expect(response.body).toHaveProperty('total')
    })

    it('should filter audit logs by user', async () => {
      jest.mock('next-auth', () => ({
        getServerSession: jest.fn().mockResolvedValue(adminSession)
      }))

      const response = await request(process.env.TEST_SERVER_URL || 'http://localhost:3000')
        .get(`/api/audit-logs?userId=${adminUser.id}`)
        .set('Cookie', 'next-auth.session-token=test-token')

      expect(response.status).toBe(200)
      expect(response.body.logs.every((log: any) => log.userId === adminUser.id)).toBe(true)
    })

    it('should filter audit logs by entity type', async () => {
      jest.mock('next-auth', () => ({
        getServerSession: jest.fn().mockResolvedValue(adminSession)
      }))

      const response = await request(process.env.TEST_SERVER_URL || 'http://localhost:3000')
        .get('/api/audit-logs?entityType=USER')
        .set('Cookie', 'next-auth.session-token=test-token')

      expect(response.status).toBe(200)
      expect(response.body.logs.every((log: any) => log.entityType === 'USER')).toBe(true)
    })

    it('should filter audit logs by date range', async () => {
      await prisma.auditLog.create({
        data: {
          userId: adminUser.id,
          action: 'CREATE',
          entityType: 'TEST',
          entityId: 'old-log',
          timestamp: new Date('2024-01-01')
        }
      })

      jest.mock('next-auth', () => ({
        getServerSession: jest.fn().mockResolvedValue(adminSession)
      }))

      const response = await request(process.env.TEST_SERVER_URL || 'http://localhost:3000')
        .get('/api/audit-logs?startDate=2024-02-01')
        .set('Cookie', 'next-auth.session-token=test-token')

      expect(response.status).toBe(200)
      expect(response.body.logs.every((log: any) => 
        new Date(log.timestamp) >= new Date('2024-02-01')
      )).toBe(true)
    })

    it('should return 403 for non-admin users', async () => {
      jest.mock('next-auth', () => ({
        getServerSession: jest.fn().mockResolvedValue(userSession)
      }))

      const response = await request(process.env.TEST_SERVER_URL || 'http://localhost:3000')
        .get('/api/audit-logs')
        .set('Cookie', 'next-auth.session-token=test-token')

      expect(response.status).toBe(403)
      expect(response.body).toHaveProperty('error', 'Forbidden')
    })
  })
})