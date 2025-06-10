import { GET } from '@/app/admin/settings/skus/route'
import { NextResponse } from 'next/server'

describe('Admin SKUs Route', () => {
  it('should return 200 OK', async () => {
    const response = await GET()
    expect(response).toBeInstanceOf(NextResponse)
    expect(response.status).toBe(200)
  })
})