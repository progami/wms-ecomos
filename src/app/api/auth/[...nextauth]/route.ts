import NextAuth from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getAuthOptions } from '@/lib/auth-test'

// Use test auth options when USE_TEST_AUTH is true
const handler = NextAuth(
  process.env.NODE_ENV === 'test' && process.env.USE_TEST_AUTH === 'true' 
    ? getAuthOptions() 
    : authOptions
);

export { handler as GET, handler as POST }