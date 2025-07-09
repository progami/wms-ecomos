import { PrismaClient } from '@prisma/client'

import { setupTestDatabase, teardownTestDatabase, createTestUser } from './setup/test-db'
import { createAuthenticatedRequest } from './setup/authenticated-request'
import * as bcrypt from 'bcryptjs'




// No need to setup test auth - it's handled by authenticated request
describe('User Management API Endpoints', () => {
  let prisma: PrismaClient
  let databaseUrl: string
  let adminUser: any
  let regularUser: any
  let request: ReturnType<typeof createAuthenticatedRequest>

  beforeAll(async () => {
    const setup = await setupTestDatabase()
    prisma = setup.prisma
    databaseUrl = setup.databaseUrl

    // Create test users
    adminUser = await createTestUser(prisma, 'admin')
    regularUser = await createTestUser(prisma, 'staff')
    
    // Create authenticated request helper
    request = createAuthenticatedRequest(process.env.TEST_SERVER_URL || 'http://localhost:3000')
  })

  afterAll(async () => {
    await teardownTestDatabase(prisma, databaseUrl)
  })

  

  describe('GET /api/admin/users', () => {
    it('should return list of users for admin', async () => {
      // Create additional test users
      await createTestUser(prisma, 'staff')
      await createTestUser(prisma, 'staff')
      
      const response = await request
        .get('/api/admin/users')
        .withAuth('admin', adminUser.id)

      expect(response.status).toBe(200)
      expect(response.body).toHaveProperty('users')
      expect(response.body.users.length).toBeGreaterThanOrEqual(4) // Including admin and regular user
      expect(response.body).toHaveProperty('total')
    })

    it('should filter users by role', async () => {
      const response = await request
        .get('/api/admin/users?role=admin')
        .withAuth('admin', adminUser.id)

      expect(response.status).toBe(200)
      expect(response.body.users.every((u: any) => u.role === 'admin')).toBe(true)
    })

    it('should filter users by active status', async () => {
      // Create inactive user
      const inactiveUser = await createTestUser(prisma)
      await prisma.user.update({
        where: { id: inactiveUser.id },
        data: { isActive: false }
      })

      const response = await request
        .get('/api/admin/users?isActive=false')
        .withAuth('admin', adminUser.id)

      expect(response.status).toBe(200)
      expect(response.body.users.some((u: any) => u.id === inactiveUser.id)).toBe(true)
      expect(response.body.users.every((u: any) => !u.isActive)).toBe(true)
    })

    it('should search users by name or email', async () => {
      await createTestUser(prisma, 'staff')
      const searchUser = await prisma.user.create({
        data: {
          email: 'searchtest@example.com',
          fullName: 'Searchable User',
          passwordHash: await bcrypt.hash('password123', 10),
          role: 'staff',
          isActive: true
        }
      })

      const response = await request
        .get('/api/admin/users?search=searchable')
        .withAuth('admin', adminUser.id)

      expect(response.status).toBe(200)
      expect(response.body.users.some((u: any) => u.id === searchUser.id)).toBe(true)
    })

    it('should return 403 for non-admin users', async () => {
      const response = await request
        .get('/api/admin/users')
        .withAuth('staff', regularUser.id)

      expect(response.status).toBe(403)
      expect(response.body).toHaveProperty('error', 'Forbidden')
    })
  })

  describe('POST /api/admin/users', () => {
    it('should create new user with valid data', async () => {
      // No need for mockGetServerSession with test auth setup

      const newUser = {
        email: 'newuser@example.com',
        fullName: 'New User',
        password: 'SecurePassword123!',
        role: 'staff'
      }

      const supertest = require('supertest');
      const response = await supertest(process.env.TEST_SERVER_URL || 'http://localhost:3000')
        .post('/api/admin/users')
        .set('Cookie', 'next-auth.session-token=test-token')
        .send(newUser)

      expect(response.status).toBe(201)
      expect(response.body).toHaveProperty('id')
      expect(response.body).toMatchObject({
        email: newUser.email,
        fullName: newUser.fullName,
        role: newUser.role
      })
      expect(response.body).not.toHaveProperty('password')
    })

    it('should validate email format', async () => {
      const response = await request
        .post('/api/admin/users')
        .withAuth('admin', adminUser.id)
        .send({
          email: 'invalid-email',
          fullName: 'Test User',
          password: 'password123',
          role: 'staff'
        })

      expect(response.status).toBe(400)
      expect(response.body).toHaveProperty('error', expect.stringContaining('email'))
    })

    it('should prevent duplicate emails', async () => {
      const existingUser = await createTestUser(prisma)

      const response = await request
        .post('/api/admin/users')
        .withAuth('admin', adminUser.id)
        .send({
          email: existingUser.email,
          fullName: 'Duplicate User',
          password: 'password123',
          role: 'staff'
        })

      expect(response.status).toBe(400)
      expect(response.body).toHaveProperty('error', expect.stringContaining('already exists'))
    })

    it('should validate password strength', async () => {
      const response = await request
        .post('/api/admin/users')
        .withAuth('admin', adminUser.id)
        .send({
          email: 'weakpassword@example.com',
          fullName: 'Test User',
          password: '123', // Too weak
          role: 'staff'
        })

      expect(response.status).toBe(400)
      expect(response.body).toHaveProperty('error', expect.stringContaining('password'))
    })

    it('should validate role', async () => {
      const response = await request
        .post('/api/admin/users')
        .withAuth('admin', adminUser.id)
        .send({
          email: 'invalidrole@example.com',
          fullName: 'Test User',
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

      // No need for mockGetServerSession with test auth setup

      const updates = {
        fullName: 'Updated Name',
        role: 'staff'
      }

      const supertest = require('supertest');
      const response = await supertest(process.env.TEST_SERVER_URL || 'http://localhost:3000')
        .put(`/api/admin/users/${userToUpdate.id}`)
        .set('Cookie', 'next-auth.session-token=test-token')
        .send(updates)

      expect(response.status).toBe(200)
      expect(response.body).toMatchObject(updates)
    })

    it('should update user password', async () => {
      const userToUpdate = await createTestUser(prisma)

      const response = await request
        .put(`/api/admin/users/${userToUpdate.id}`)
        .withAuth('admin', adminUser.id)
        .send({
          password: 'NewSecurePassword123!'
        })

      expect(response.status).toBe(200)

      // Verify password was updated
      const updatedUser = await prisma.user.findUnique({
        where: { id: userToUpdate.id }
      })
      const passwordValid = await bcrypt.compare('NewSecurePassword123!', updatedUser!.passwordHash)
      expect(passwordValid).toBe(true)
    })

    it('should deactivate user', async () => {
      const userToDeactivate = await createTestUser(prisma)

      const response = await request
        .put(`/api/admin/users/${userToDeactivate.id}`)
        .withAuth('admin', adminUser.id)
        .send({
          isActive: false
        })

      expect(response.status).toBe(200)
      expect(response.body.isActive).toBe(false)
    })

    it('should not allow updating own admin role', async () => {
      const response = await request
        .put(`/api/admin/users/${adminUser.id}`)
        .withAuth('admin', adminUser.id)
        .send({
          role: 'staff'
        })

      expect(response.status).toBe(400)
      expect(response.body).toHaveProperty('error', expect.stringContaining('Cannot modify your own admin role'))
    })

    it('should return 404 for non-existent user', async () => {
      const response = await request
        .put('/api/admin/users/non-existent-id')
        .withAuth('admin', adminUser.id)
        .send({
          fullName: 'Updated Name'
        })

      expect(response.status).toBe(404)
      expect(response.body).toHaveProperty('error', 'User not found')
    })
  })

  describe('DELETE /api/admin/users/:id', () => {
    it('should soft delete user (deactivate)', async () => {
      const userToDelete = await createTestUser(prisma)

      const response = await request
        .delete(`/api/admin/users/${userToDelete.id}`)
        .withAuth('admin', adminUser.id)

      expect(response.status).toBe(200)
      
      // Verify user is deactivated
      const deletedUser = await prisma.user.findUnique({
        where: { id: userToDelete.id }
      })
      expect(deletedUser?.isActive).toBe(false)
    })

    it('should not allow deleting own account', async () => {
      const response = await request
        .delete(`/api/admin/users/${adminUser.id}`)
        .withAuth('admin', adminUser.id)

      expect(response.status).toBe(400)
      expect(response.body).toHaveProperty('error', expect.stringContaining('Cannot delete your own account'))
    })

    it('should not delete last admin', async () => {
      // Ensure adminUser is the only admin
      await prisma.user.updateMany({
        where: { 
          id: { not: adminUser.id },
          role: 'admin'
        },
        data: { role: 'staff' }
      })

      const response = await request
        .delete(`/api/admin/users/${adminUser.id}`)
        .withAuth('admin', adminUser.id)

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
          tableName: 'User',
          recordId: 'test-user-id',
          changes: { email: 'test@example.com' },
          createdAt: new Date()
        }
      })
      await prisma.auditLog.create({
        data: {
          userId: regularUser.id,
          action: 'UPDATE',
          tableName: 'Sku',
          recordId: 'test-sku-id',
          changes: { field: 'description', oldValue: 'old', newValue: 'new' },
          createdAt: new Date()
        }
      })

      const response = await request
        .get('/api/audit-logs')
        .withAuth('admin', adminUser.id)

      expect(response.status).toBe(200)
      expect(response.body).toHaveProperty('logs')
      expect(response.body.logs.length).toBeGreaterThanOrEqual(2)
      expect(response.body).toHaveProperty('total')
    })

    it('should filter audit logs by user', async () => {
      const response = await request
        .get(`/api/audit-logs?userId=${adminUser.id}`)
        .withAuth('admin', adminUser.id)

      expect(response.status).toBe(200)
      expect(response.body.logs.every((log: any) => log.userId === adminUser.id)).toBe(true)
    })

    it('should filter audit logs by entity type', async () => {
      const response = await request
        .get('/api/audit-logs?entityType=USER')
        .withAuth('admin', adminUser.id)

      expect(response.status).toBe(200)
      expect(response.body.logs.every((log: any) => log.entityType === 'USER')).toBe(true)
    })

    it('should filter audit logs by date range', async () => {
      await prisma.auditLog.create({
        data: {
          userId: adminUser.id,
          action: 'CREATE',
          tableName: 'Test',
          recordId: 'old-log',
          createdAt: new Date('2024-01-01')
        }
      })

      const response = await request
        .get('/api/audit-logs?startDate=2024-02-01')
        .withAuth('admin', adminUser.id)

      expect(response.status).toBe(200)
      expect(response.body.logs.every((log: any) => 
        new Date(log.timestamp) >= new Date('2024-02-01')
      )).toBe(true)
    })

    it('should return 403 for non-admin users', async () => {
      const response = await request
        .get('/api/audit-logs')
        .withAuth('staff', regularUser.id)

      expect(response.status).toBe(403)
      expect(response.body).toHaveProperty('error', 'Forbidden')
    })
  })
})