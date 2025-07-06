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

// Note: NextAuth mocking should be done at the module level in test files
// See the integration test files for examples of proper mocking

// Helper to create authenticated request
export function authenticatedRequest(app: Server) {
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