import { PrismaClient } from '@prisma/client'
import { prismaLogging, setupPrismaLogging, createPrismaLoggingMiddleware } from '@/lib/logger/prisma-logger'
import { dbLogger } from '@/lib/logger'

const globalForPrisma = global as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: prismaLogging,
  })

// Set up logging event handlers only once
if (!globalForPrisma.prisma) {
  setupPrismaLogging(prisma)
  
  // Add logging middleware
  prisma.$use(createPrismaLoggingMiddleware())
  
  // Log database connection
  dbLogger.info('Prisma client initialized', {
    environment: process.env.NODE_ENV,
  })
  
  // Log on disconnect
  process.on('beforeExit', () => {
    dbLogger.info('Disconnecting from database')
  })
}

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export default prisma