import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import bcryptjs from 'bcryptjs'

// Mock dependencies
jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  },
}))

jest.mock('bcryptjs', () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}))

describe('Authentication Configuration', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    process.env.NEXTAUTH_SECRET = 'test-secret'
  })

  describe('authOptions', () => {
    it('should have correct configuration', () => {
      expect(authOptions.adapter).toBeUndefined() // No adapter in JWT strategy
      expect(authOptions.session?.strategy).toBe('jwt')
      expect(authOptions.providers).toHaveLength(1)
      expect(authOptions.providers[0].id).toBe('credentials')
    })
  })

  describe('Credentials Provider', () => {
    const credentialsProvider = authOptions.providers[0] as any
    
    it('should authenticate valid user with correct password', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        fullName: 'Test User',
        passwordHash: 'hashed-password',
        role: 'admin',
        warehouseId: null,
        isActive: true,
      }

      ;(prisma.user.findFirst as jest.Mock).mockResolvedValue(mockUser)
      ;(bcryptjs.compare as jest.Mock).mockResolvedValue(true)
      ;(prisma.user.update as jest.Mock).mockResolvedValue(mockUser)

      const result = await credentialsProvider.authorize({
        emailOrUsername: 'test@example.com',
        password: 'password123',
      })

      expect(prisma.user.findFirst).toHaveBeenCalledWith({
        where: {
          OR: [
            { email: 'test@example.com' },
            { username: 'test@example.com' }
          ]
        },
        include: {
          warehouse: true,
        },
      })
      expect(bcryptjs.compare).toHaveBeenCalledWith('password123', 'hashed-password')
      expect(result).toEqual({
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        role: 'admin',
        warehouseId: undefined,
      })
    })

    it('should reject authentication with incorrect password', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        passwordHash: 'hashed-password',
        isActive: true,
      }

      ;(prisma.user.findFirst as jest.Mock).mockResolvedValue(mockUser)
      ;(bcryptjs.compare as jest.Mock).mockResolvedValue(false)

      await expect(credentialsProvider.authorize({
        emailOrUsername: 'test@example.com',
        password: 'wrong-password',
      })).rejects.toThrow('Invalid credentials')
    })

    it('should reject authentication for non-existent user', async () => {
      ;(prisma.user.findFirst as jest.Mock).mockResolvedValue(null)

      await expect(credentialsProvider.authorize({
        emailOrUsername: 'nonexistent@example.com',
        password: 'password123',
      })).rejects.toThrow('Invalid credentials')
      
      expect(bcryptjs.compare).not.toHaveBeenCalled()
    })

    it('should reject authentication for inactive user', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        passwordHash: 'hashed-password',
        isActive: false,
      }

      ;(prisma.user.findFirst as jest.Mock).mockResolvedValue(mockUser)

      await expect(credentialsProvider.authorize({
        emailOrUsername: 'test@example.com',
        password: 'password123',
      })).rejects.toThrow('Invalid credentials')
      
      expect(bcryptjs.compare).not.toHaveBeenCalled()
    })

    it('should authenticate with username', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        username: 'testuser',
        fullName: 'Test User',
        passwordHash: 'hashed-password',
        role: 'staff',
        warehouseId: 'warehouse-1',
        isActive: true,
      }

      ;(prisma.user.findFirst as jest.Mock).mockResolvedValue(mockUser)
      ;(bcryptjs.compare as jest.Mock).mockResolvedValue(true)
      ;(prisma.user.update as jest.Mock).mockResolvedValue(mockUser)

      const result = await credentialsProvider.authorize({
        emailOrUsername: 'testuser',
        password: 'password123',
      })

      expect(prisma.user.findFirst).toHaveBeenCalledWith({
        where: {
          OR: [
            { email: 'testuser' },
            { username: 'testuser' }
          ]
        },
        include: {
          warehouse: true,
        },
      })
      expect(result).toEqual({
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        role: 'staff',
        warehouseId: 'warehouse-1',
      })
    })
  })

  describe('Callbacks', () => {
    it('should include user details in JWT token', async () => {
      const token = { sub: 'user-123' }
      const user = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        role: 'staff' as const,
        warehouseId: 'warehouse-1',
      }

      const result = await authOptions.callbacks!.jwt!({ token, user } as any)

      expect(result).toEqual({
        sub: 'user-123',
        role: 'staff',
        warehouseId: 'warehouse-1',
      })
    })

    it('should include user details in session', async () => {
      const session = {
        user: {
          id: '',
          email: '',
          name: '',
          role: 'staff' as const,
        },
        expires: new Date().toISOString(),
      }
      const token = {
        sub: 'user-123',
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        role: 'admin' as const,
        warehouseId: null,
      }

      const result = await authOptions.callbacks!.session!({ session, token } as any)

      expect(result.user).toEqual({
        id: 'user-123',
        email: '',
        name: '',
        role: 'admin',
        warehouseId: null,
      })
    })
  })

  describe('Role-based Access Control', () => {
    const testRoles = [
      'admin',
      'staff',
    ]

    testRoles.forEach((role) => {
      it(`should authenticate user with ${role} role`, async () => {
        const mockUser = {
          id: `${role}-user`,
          email: `${role}@example.com`,
          fullName: `${role} User`,
          passwordHash: 'hashed-password',
          role,
          warehouseId: role === 'staff' ? 'warehouse-1' : null,
          isActive: true,
        }

        const credentialsProvider = authOptions.providers[0] as any
        ;(prisma.user.findFirst as jest.Mock).mockResolvedValue(mockUser)
        ;(bcryptjs.compare as jest.Mock).mockResolvedValue(true)
        ;(prisma.user.update as jest.Mock).mockResolvedValue(mockUser)

        const result = await credentialsProvider.authorize({
          emailOrUsername: `${role}@example.com`,
          password: 'password123',
        })

        expect(result?.role).toBe(role)
      })
    })
  })
})