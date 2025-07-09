import { NextAuthOptions } from 'next-auth'
import { UserRole } from '@prisma/client'
import { authOptions as productionAuthOptions } from './auth'

// Test user that will be used for all authenticated requests in test mode
const TEST_USER = {
  id: 'test-user-id',
  email: 'test@example.com',
  name: 'Test User',
  role: 'admin' as UserRole,
  warehouseId: undefined,
  isDemo: false
}

// Test auth options that bypass real authentication in test mode
export const testAuthOptions: NextAuthOptions = {
  ...productionAuthOptions,
  providers: [
    {
      id: 'test',
      name: 'Test Provider',
      type: 'credentials',
      credentials: {},
      async authorize() {
        // Always return the test user in test mode
        return TEST_USER
      }
    }
  ],
  callbacks: {
    async jwt({ token }) {
      // Always use test user data
      token.sub = TEST_USER.id
      token.email = TEST_USER.email
      token.name = TEST_USER.name
      token.role = TEST_USER.role
      token.warehouseId = TEST_USER.warehouseId
      token.isDemo = TEST_USER.isDemo
      return token
    },
    async session({ session, token }) {
      session.user = {
        id: token.sub!,
        email: token.email!,
        name: token.name!,
        role: token.role as UserRole,
        warehouseId: token.warehouseId as string | undefined,
        isDemo: token.isDemo as boolean | undefined
      }
      return session
    }
  }
}

// Helper to get auth options based on environment
export function getAuthOptions(): NextAuthOptions {
  if (process.env.NODE_ENV === 'test' && process.env.USE_TEST_AUTH === 'true') {
    return testAuthOptions
  }
  return productionAuthOptions
}