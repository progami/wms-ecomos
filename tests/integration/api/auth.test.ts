import { PrismaClient } from '@prisma/client'
import request from 'supertest'
import { setupTestDatabase, teardownTestDatabase, createTestUser } from './setup/test-db'
import { createTestApp } from './setup/test-app'
import { POST as authHandler } from '@/app/api/auth/[...nextauth]/route'
import { NextRequest } from 'next/server'

describe('Authentication API', () => {
  let prisma: PrismaClient
  let databaseUrl: string
  let app: any

  beforeAll(async () => {
    const setup = await setupTestDatabase()
    prisma = setup.prisma
    databaseUrl = setup.databaseUrl
  })

  afterAll(async () => {
    await teardownTestDatabase(prisma, databaseUrl)
  })

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('POST /api/auth/signin', () => {
    it('should successfully login with valid credentials', async () => {
      const user = await createTestUser(prisma)
      
      const response = await request(app)
        .post('/api/auth/callback/credentials')
        .send({
          username: user.email,
          password: 'password123',
          csrfToken: 'test-csrf-token'
        })

      expect(response.status).toBe(200)
    })

    it('should fail login with invalid credentials', async () => {
      const user = await createTestUser(prisma)
      
      const response = await request(app)
        .post('/api/auth/callback/credentials')
        .send({
          username: user.email,
          password: 'wrongpassword',
          csrfToken: 'test-csrf-token'
        })

      expect(response.status).toBe(401)
    })

    it('should handle rate limiting after multiple failed attempts', async () => {
      const user = await createTestUser(prisma)
      
      // Make multiple failed login attempts
      for (let i = 0; i < 6; i++) {
        await request(app)
          .post('/api/auth/callback/credentials')
          .send({
            username: user.email,
            password: 'wrongpassword',
            csrfToken: 'test-csrf-token'
          })
      }

      // Next attempt should be rate limited
      const response = await request(app)
        .post('/api/auth/callback/credentials')
        .send({
          username: user.email,
          password: 'password123',
          csrfToken: 'test-csrf-token'
        })

      expect(response.status).toBe(429)
      expect(response.body).toHaveProperty('error', expect.stringContaining('Too many'))
    })

    it('should handle missing credentials', async () => {
      const response = await request(app)
        .post('/api/auth/callback/credentials')
        .send({
          csrfToken: 'test-csrf-token'
        })

      expect(response.status).toBe(400)
    })

    it('should handle inactive users', async () => {
      const user = await createTestUser(prisma)
      await prisma.user.update({
        where: { id: user.id },
        data: { isActive: false }
      })
      
      const response = await request(app)
        .post('/api/auth/callback/credentials')
        .send({
          username: user.email,
          password: 'password123',
          csrfToken: 'test-csrf-token'
        })

      expect(response.status).toBe(401)
    })
  })

  describe('GET /api/auth/session', () => {
    it('should return session for authenticated user', async () => {
      const user = await createTestUser(prisma)
      const session = {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role
        },
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      }

      jest.mock('next-auth', () => ({
        getServerSession: jest.fn().mockResolvedValue(session)
      }))

      const response = await request(app)
        .get('/api/auth/session')

      expect(response.status).toBe(200)
      expect(response.body).toMatchObject({
        user: {
          email: user.email,
          name: user.name,
          role: user.role
        }
      })
    })

    it('should return null for unauthenticated user', async () => {
      jest.mock('next-auth', () => ({
        getServerSession: jest.fn().mockResolvedValue(null)
      }))

      const response = await request(app)
        .get('/api/auth/session')

      expect(response.status).toBe(200)
      expect(response.body).toBeNull()
    })
  })

  describe('POST /api/auth/signout', () => {
    it('should successfully logout authenticated user', async () => {
      const user = await createTestUser(prisma)
      const session = {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role
        },
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      }

      jest.mock('next-auth', () => ({
        getServerSession: jest.fn().mockResolvedValue(session)
      }))

      const response = await request(app)
        .post('/api/auth/signout')
        .send({
          csrfToken: 'test-csrf-token'
        })

      expect(response.status).toBe(200)
    })
  })

  describe('GET /api/auth/rate-limit-status', () => {
    it('should return rate limit status', async () => {
      const response = await request(app)
        .get('/api/auth/rate-limit-status')

      expect(response.status).toBe(200)
      expect(response.body).toHaveProperty('attemptsRemaining')
      expect(response.body).toHaveProperty('isBlocked')
    })
  })
})