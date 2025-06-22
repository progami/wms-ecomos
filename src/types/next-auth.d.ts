import { UserRole } from '@prisma/client'
import 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      email: string
      name: string
      role: UserRole
      warehouseId?: string
      sessionId?: string
      isDemo?: boolean
    }
  }
  
  interface User {
    id: string
    email: string
    name: string
    role: UserRole
    warehouseId?: string
    sessionId?: string
    isDemo?: boolean
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role: UserRole
    warehouseId?: string
    sessionId?: string
    isDemo?: boolean
  }
}