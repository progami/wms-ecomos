import { GET } from '@/app/admin/settings/skus/route'
import { redirect } from 'next/navigation'

// Mock next/navigation
jest.mock('next/navigation', () => ({
  redirect: jest.fn(),
}))

describe('Admin SKUs Route', () => {
  const mockRedirect = redirect as unknown as jest.Mock

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should redirect to /config/products', async () => {
    await GET()
    expect(mockRedirect).toHaveBeenCalledWith('/config/products')
  })
})