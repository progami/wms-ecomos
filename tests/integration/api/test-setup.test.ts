import { callApiHandler } from './setup/mock-api-handler'
import prisma from '@/lib/prisma'
import { getServerSession } from 'next-auth'

describe('Test Setup Verification', () => {
  it('should have mocked Prisma client', () => {
    expect(prisma.user.findFirst).toBeDefined()
    expect(prisma.user.findFirst).toBeInstanceOf(jest.fn().constructor)
  })

  it('should have mocked getServerSession', () => {
    expect(getServerSession).toBeDefined()
    expect(getServerSession).toBeInstanceOf(jest.fn().constructor)
  })

  it('should return default session from getServerSession', async () => {
    const session = await getServerSession({} as any)
    expect(session).toBeDefined()
    expect(session?.user).toBeDefined()
    expect(session?.user.email).toBe('test@example.com')
    expect(session?.user.role).toBe('staff')
  })

  it('should handle API calls with mock handler', async () => {
    // Create a simple mock handler
    const mockHandler = jest.fn().mockResolvedValue(
      new Response(JSON.stringify({ message: 'success' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    )

    const response = await callApiHandler(mockHandler, '/api/test')
    
    expect(response.status).toBe(200)
    expect(response.body).toEqual({ message: 'success' })
    expect(mockHandler).toHaveBeenCalled()
  })
})