import { Prisma } from '@prisma/client';
import { dbLogger, perfLogger } from './index';

// Prisma log levels to our logger mapping
const logLevelMap: Record<Prisma.LogLevel, 'info' | 'warn' | 'error' | 'debug'> = {
  info: 'info',
  query: 'debug',
  warn: 'warn',
  error: 'error',
};

// Create Prisma logging configuration
export const prismaLogging: Prisma.PrismaClientOptions['log'] = [
  {
    emit: 'event',
    level: 'query',
  },
  {
    emit: 'event',
    level: 'info',
  },
  {
    emit: 'event',
    level: 'warn',
  },
  {
    emit: 'event',
    level: 'error',
  },
];

// Prisma event handlers
export function setupPrismaLogging(prisma: any) {
  // Query logging
  prisma.$on('query', (e: Prisma.QueryEvent) => {
    const duration = e.duration;
    
    // Log the query
    dbLogger.debug('Database query executed', {
      query: e.query,
      params: e.params,
      duration,
      target: e.target,
    });
    
    // Log slow queries
    perfLogger.slow('Database Query', duration, 100, {
      query: e.query,
      target: e.target,
    });
  });

  // Info logging
  prisma.$on('info', (e: Prisma.LogEvent) => {
    dbLogger.info(e.message, {
      target: e.target,
      timestamp: e.timestamp,
    });
  });

  // Warning logging
  prisma.$on('warn', (e: Prisma.LogEvent) => {
    dbLogger.warn(e.message, {
      target: e.target,
      timestamp: e.timestamp,
    });
  });

  // Error logging
  prisma.$on('error', (e: Prisma.LogEvent) => {
    dbLogger.error(e.message, {
      target: e.target,
      timestamp: e.timestamp,
    });
  });
}

// Middleware for logging database operations
export function createPrismaLoggingMiddleware(): Prisma.Middleware {
  return async (params, next) => {
    const startTime = Date.now();
    const { model, action } = params;
    
    try {
      // Execute the query
      const result = await next(params);
      
      const duration = Date.now() - startTime;
      
      // Log successful operations
      dbLogger.info('Database operation completed', {
        model,
        action,
        duration,
        args: sanitizeArgs(params.args),
      });
      
      // Log slow operations
      perfLogger.slow(`DB ${model}.${action}`, duration, 100, {
        model,
        action,
      });
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      // Log failed operations
      dbLogger.error('Database operation failed', {
        model,
        action,
        duration,
        args: sanitizeArgs(params.args),
        error: error instanceof Error ? {
          name: error.name,
          message: error.message,
          stack: error.stack,
        } : String(error),
      });
      
      throw error;
    }
  };
}

// Sanitize arguments to remove sensitive data
function sanitizeArgs(args: any): any {
  if (!args) return args;
  
  const sensitiveFields = ['password', 'hashedPassword', 'token', 'apiKey'];
  
  if (typeof args === 'object' && !Array.isArray(args)) {
    const sanitized = { ...args };
    
    // Handle where clauses
    if (sanitized.where) {
      sanitized.where = sanitizeArgs(sanitized.where);
    }
    
    // Handle data
    if (sanitized.data) {
      sanitized.data = sanitizeArgs(sanitized.data);
    }
    
    // Handle create/update
    if (sanitized.create) {
      sanitized.create = sanitizeArgs(sanitized.create);
    }
    if (sanitized.update) {
      sanitized.update = sanitizeArgs(sanitized.update);
    }
    
    // Sanitize top-level fields
    Object.keys(sanitized).forEach((key) => {
      if (sensitiveFields.includes(key)) {
        sanitized[key] = '[REDACTED]';
      }
    });
    
    return sanitized;
  }
  
  if (Array.isArray(args)) {
    return args.map(sanitizeArgs);
  }
  
  return args;
}

// Helper to log transaction operations
export function logTransaction(id: string, operation: string, metadata?: any) {
  dbLogger.info(`Transaction ${operation}`, {
    transactionId: id,
    operation,
    ...metadata,
  });
}

// Helper to log migration events
export function logMigration(name: string, status: 'started' | 'completed' | 'failed', metadata?: any) {
  const level = status === 'failed' ? 'error' : 'info';
  dbLogger[level](`Migration ${status}: ${name}`, {
    migration: name,
    status,
    ...metadata,
  });
}