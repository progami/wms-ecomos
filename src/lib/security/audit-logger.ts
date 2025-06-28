import { prisma } from '@/lib/prisma'
import { sanitizeForAudit } from './input-sanitization'

export interface AuditLogEntry {
  entityType: string
  entityId: string
  action: string
  userId: string
  data?: any
  ipAddress?: string
  userAgent?: string
}

/**
 * Create an audit log entry
 */
export async function auditLog(entry: AuditLogEntry) {
  try {
    // Sanitize data before storing
    const sanitizedData = entry.data ? sanitizeAuditData(entry.data) : null

    await prisma.auditLog.create({
      data: {
        tableName: entry.entityType,
        recordId: entry.entityId,
        action: entry.action,
        userId: entry.userId,
        changes: sanitizedData,
        ipAddress: entry.ipAddress,
        userAgent: entry.userAgent,
      }
    })
  } catch (error) {
    // Log to external system if database write fails
    // console.error('Failed to write audit log:', error, entry)
    // Could send to external logging service here
  }
}

/**
 * Sanitize data for audit logging
 */
function sanitizeAuditData(data: any): any {
  if (typeof data === 'string') {
    return sanitizeForAudit(data)
  }
  
  if (Array.isArray(data)) {
    return data.map(item => sanitizeAuditData(item))
  }
  
  if (data && typeof data === 'object') {
    const sanitized: any = {}
    for (const [key, value] of Object.entries(data)) {
      // Remove sensitive fields
      if (isSensitiveField(key)) {
        sanitized[key] = '[REDACTED]'
      } else {
        sanitized[key] = sanitizeAuditData(value)
      }
    }
    return sanitized
  }
  
  return data
}

/**
 * Check if a field name indicates sensitive data
 */
function isSensitiveField(fieldName: string): boolean {
  const sensitivePatterns = [
    /password/i,
    /secret/i,
    /token/i,
    /key/i,
    /auth/i,
    /credit/i,
    /ssn/i,
    /bank/i,
  ]
  
  return sensitivePatterns.some(pattern => pattern.test(fieldName))
}

/**
 * Get audit logs for an entity
 */
export async function getAuditLogs(
  entityType: string,
  entityId: string,
  options: {
    limit?: number
    offset?: number
    startDate?: Date
    endDate?: Date
    userId?: string
  } = {}
) {
  const where: any = {
    tableName: entityType,
    recordId: entityId,
  }
  
  if (options.userId) {
    where.userId = options.userId
  }
  
  if (options.startDate || options.endDate) {
    where.createdAt = {}
    if (options.startDate) where.createdAt.gte = options.startDate
    if (options.endDate) where.createdAt.lte = options.endDate
  }
  
  return prisma.auditLog.findMany({
    where,
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
          email: true,
        }
      }
    },
    orderBy: {
      createdAt: 'desc'
    },
    take: options.limit || 50,
    skip: options.offset || 0,
  })
}

/**
 * Create a compliance report for audit logs
 */
export async function generateComplianceReport(
  startDate: Date,
  endDate: Date,
  options: {
    entityTypes?: string[]
    actions?: string[]
    userIds?: string[]
  } = {}
) {
  const where: any = {
    createdAt: {
      gte: startDate,
      lte: endDate,
    }
  }
  
  if (options.entityTypes?.length) {
    where.tableName = { in: options.entityTypes }
  }
  
  if (options.actions?.length) {
    where.action = { in: options.actions }
  }
  
  if (options.userIds?.length) {
    where.userId = { in: options.userIds }
  }
  
  // Get aggregated data
  const [totalLogs, logsByType, logsByUser, logsByAction] = await Promise.all([
    // Total count
    prisma.auditLog.count({ where }),
    
    // Group by entity type
    prisma.auditLog.groupBy({
      by: ['tableName'],
      where,
      _count: true,
    }),
    
    // Group by user
    prisma.auditLog.groupBy({
      by: ['userId'],
      where,
      _count: true,
    }),
    
    // Group by action
    prisma.auditLog.groupBy({
      by: ['action'],
      where,
      _count: true,
    }),
  ])
  
  return {
    period: {
      start: startDate,
      end: endDate,
    },
    summary: {
      totalLogs,
      byEntityType: logsByType,
      byUser: logsByUser,
      byAction: logsByAction,
    },
  }
}