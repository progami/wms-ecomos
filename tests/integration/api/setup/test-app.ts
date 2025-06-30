import { createServer, Server } from 'http'
import { NextApiHandler } from 'next'
import { apiResolver } from 'next/dist/server/api-utils/node/api-resolver'
import request from 'supertest'

export function createTestApp(handler: NextApiHandler): Server {
  return createServer((req, res) => {
    return apiResolver(
      req,
      res,
      undefined,
      handler,
      {
        previewModeId: '',
        previewModeEncryptionKey: '',
        previewModeSigningKey: ''
      },
      false
    )
  })
}

export function createNextRequest(app: Server) {
  return request(app)
}

// Mock NextAuth session
export function mockSession(session: any) {
  jest.mock('next-auth', () => ({
    getServerSession: jest.fn().mockResolvedValue(session)
  }))
}

// Helper to create authenticated request
export function authenticatedRequest(app: Server, session: any) {
  mockSession(session)
  return request(app)
}

// Helper to parse multipart form data
export function createFormData(fields: Record<string, any>, files?: Record<string, any>) {
  const req = request(null as any)
  
  Object.entries(fields).forEach(([key, value]) => {
    req.field(key, value)
  })
  
  if (files) {
    Object.entries(files).forEach(([key, file]) => {
      req.attach(key, file.buffer, file.filename)
    })
  }
  
  return req
}