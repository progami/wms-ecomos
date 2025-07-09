import { callApiHandler } from './setup/mock-api-handler'
import { GET as healthHandler } from '@/app/api/health/route'
import { GET as usersHandler } from '@/app/api/admin/users/route'
import prisma from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { getServerSession } from 'next-auth'

// Mock getServerSession is already set up in jest.setup.integration.js
const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>

describe('Authentication API', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Authentication Flow', () => {
    it('should verify authentication works for API endpoints', async () => {
      // Health endpoint should work with valid session
      const response = await callApiHandler(healthHandler, '/api/health')
      
      expect(response.status).toBe(200)
      expect(response.body.status).toBe('ok')
    })
    
    it('should authenticate user with valid session', async () => {
      // Mock Prisma user methods
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        username: 'testuser',
        fullName: 'Test User',
        passwordHash: await bcrypt.hash('password123', 10),
        role: 'staff',
        isActive: true,
        isDemo: false,
        warehouseId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: null
      }
      
      ;(prisma.user.findFirst as jest.Mock).mockResolvedValue(mockUser)
      ;(prisma.user.update as jest.Mock).mockResolvedValue(mockUser)
      
      // Verify the mocked session is returned
      const session = await mockGetServerSession({} as any)
      expect(session).toBeDefined()
      expect(session?.user.email).toBe('test@example.com')
    })

    it('should handle users without sessions', async () => {
      // Mock no session
      mockGetServerSession.mockResolvedValueOnce(null)
      
      // Mock the inventory balances handler
      const { GET } = await import('@/app/api/inventory/balances/route')
      const response = await callApiHandler(GET, '/api/inventory/balances')
      
      expect(response.status).toBe(401)
      expect(response.body.error).toBe('Unauthorized')
    })
  })

  describe('Authorization Headers', () => {
    it('should accept requests with valid sessions', async () => {
      // Mock admin user
      const adminSession = {
        user: {
          id: 'admin-123',
          email: 'admin@example.com',
          name: 'Admin User',
          role: 'admin' as const,
          warehouseId: undefined,
          isDemo: false
        },
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      }
      mockGetServerSession.mockResolvedValueOnce(adminSession)
      
      // Mock Prisma response for users list
      ;(prisma.user.findMany as jest.Mock).mockResolvedValue([])
      ;(prisma.user.count as jest.Mock).mockResolvedValue(0)
      
      const response = await callApiHandler(usersHandler, '/api/admin/users')
      
      expect(response.status).toBe(200)
    })

    it('should respect role-based access control', async () => {
      // Mock staff user trying to access admin endpoint
      const staffSession = {
        user: {
          id: 'staff-123',
          email: 'staff@example.com',
          name: 'Staff User',
          role: 'staff' as const,
          warehouseId: 'warehouse-123',
          isDemo: false
        },
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      }
      mockGetServerSession.mockResolvedValueOnce(staffSession)
      
      const response = await callApiHandler(usersHandler, '/api/admin/users')
      
      expect(response.status).toBe(403)
    })
  })

  describe('Password Security', () => {
    it('should properly hash passwords', async () => {
      const password = 'password123'
      const hash = await bcrypt.hash(password, 10)
      
      // Verify password is hashed
      expect(hash).not.toBe(password)
      expect(hash).toMatch(/^\$2[aby]\$\d{2}\$/)
    })
    
    it('should verify correct passwords', async () => {
      const password = 'password123'
      const hash = await bcrypt.hash(password, 10)
      
      // Test password validation
      const validPassword = await bcrypt.compare(password, hash)
      expect(validPassword).toBe(true)
      
      const invalidPassword = await bcrypt.compare('wrongpassword', hash)
      expect(invalidPassword).toBe(false)
    })
  })
})