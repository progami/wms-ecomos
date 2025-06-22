# Logging and Monitoring Documentation

This document provides comprehensive documentation for the WMS logging strategy, error handling, monitoring, and debugging practices.

## Logging Architecture

### Overview

The WMS implements a multi-layered logging system that captures events across all application layers:

```
┌─────────────────────────────────────────────────────┐
│                  Client Layer                        │
│         Browser Console │ Performance API            │
├─────────────────────────────────────────────────────┤
│                   Edge Layer                         │
│          Middleware │ Request/Response               │
├─────────────────────────────────────────────────────┤
│                  Server Layer                        │
│     API Routes │ Services │ Database Queries         │
├─────────────────────────────────────────────────────┤
│                 Storage Layer                        │
│      File System │ Log Rotation │ Archives           │
└─────────────────────────────────────────────────────┘
```

### Logging Infrastructure

#### Winston Logger Configuration
```typescript
// lib/logger/server.ts
import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    // Console output for development
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),
    // File rotation for production
    new DailyRotateFile({
      filename: 'logs/app-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '14d',
      compress: true
    })
  ]
});
```

#### Log Levels

| Level | Usage | Example |
|-------|-------|---------|
| `error` | Application errors, exceptions | Database connection failure |
| `warn` | Warnings, deprecated features | Low inventory warning |
| `info` | General information | User login, transaction created |
| `http` | HTTP requests/responses | API endpoint called |
| `debug` | Detailed debugging info | Variable values, execution flow |

## Client-Side Logging

### Browser Console Wrapper
```typescript
// lib/logger/client.ts
export const clientLogger = {
  error: (message: string, data?: any) => {
    console.error(`[ERROR] ${message}`, data);
    sendToServer('error', message, data);
  },
  
  warn: (message: string, data?: any) => {
    console.warn(`[WARN] ${message}`, data);
    sendToServer('warn', message, data);
  },
  
  info: (message: string, data?: any) => {
    console.info(`[INFO] ${message}`, data);
    if (isDevelopment) {
      sendToServer('info', message, data);
    }
  }
};
```

### Performance Monitoring
```typescript
// hooks/usePerformanceMonitor.ts
export function usePerformanceMonitor(componentName: string) {
  useEffect(() => {
    const startTime = performance.now();
    
    return () => {
      const duration = performance.now() - startTime;
      if (duration > 1000) { // Log slow components
        clientLogger.warn(`Slow component render`, {
          component: componentName,
          duration: `${duration.toFixed(2)}ms`
        });
      }
    };
  }, [componentName]);
}
```

### Error Boundaries
```typescript
// components/error-boundary.tsx
class ErrorBoundary extends Component {
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    clientLogger.error('React error boundary caught error', {
      error: error.toString(),
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString()
    });
  }
  
  render() {
    if (this.state.hasError) {
      return <ErrorFallback />;
    }
    return this.props.children;
  }
}
```

## Server-Side Logging

### API Route Logging
```typescript
// lib/logger/api-wrapper.ts
export function withLogging(
  handler: (req: NextRequest) => Promise<NextResponse>
) {
  return async (req: NextRequest) => {
    const startTime = Date.now();
    const requestId = crypto.randomUUID();
    
    // Log request
    logger.http('API Request', {
      requestId,
      method: req.method,
      url: req.url,
      headers: sanitizeHeaders(req.headers),
      timestamp: new Date().toISOString()
    });
    
    try {
      const response = await handler(req);
      
      // Log response
      logger.http('API Response', {
        requestId,
        status: response.status,
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString()
      });
      
      return response;
    } catch (error) {
      // Log error
      logger.error('API Error', {
        requestId,
        error: error.message,
        stack: error.stack,
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString()
      });
      
      throw error;
    }
  };
}
```

### Database Query Logging
```typescript
// lib/logger/prisma-logger.ts
const prisma = new PrismaClient({
  log: [
    {
      emit: 'event',
      level: 'query',
    },
    {
      emit: 'event',
      level: 'error',
    },
    {
      emit: 'event',
      level: 'warn',
    },
  ],
});

prisma.$on('query', (e) => {
  if (e.duration > 1000) { // Log slow queries
    logger.warn('Slow database query', {
      query: e.query,
      params: e.params,
      duration: e.duration,
      timestamp: e.timestamp
    });
  }
});
```

### Business Logic Logging
```typescript
// Example: Inventory service logging
export class InventoryService {
  static async createTransaction(data: TransactionInput) {
    logger.info('Creating inventory transaction', {
      warehouseId: data.warehouseId,
      skuId: data.skuId,
      type: data.transactionType,
      userId: data.createdById
    });
    
    try {
      const transaction = await prisma.inventoryTransaction.create({
        data
      });
      
      logger.info('Transaction created successfully', {
        transactionId: transaction.id,
        warehouseId: transaction.warehouseId
      });
      
      return transaction;
    } catch (error) {
      logger.error('Failed to create transaction', {
        error: error.message,
        data,
        timestamp: new Date().toISOString()
      });
      throw error;
    }
  }
}
```

## Audit Trail Implementation

### Audit Log Schema
```prisma
model AuditLog {
  id          String   @id @default(uuid())
  userId      String
  action      String
  entityType  String
  entityId    String
  changes     Json?
  metadata    Json?
  ipAddress   String?
  userAgent   String?
  timestamp   DateTime @default(now())
  
  user User @relation(fields: [userId], references: [id])
  
  @@index([userId, timestamp])
  @@index([entityType, entityId])
}
```

### Audit Logger Service
```typescript
// lib/security/audit-logger.ts
export class AuditLogger {
  static async log(params: {
    userId: string;
    action: AuditAction;
    entityType: string;
    entityId: string;
    changes?: any;
    request?: NextRequest;
  }) {
    const { userId, action, entityType, entityId, changes, request } = params;
    
    await prisma.auditLog.create({
      data: {
        userId,
        action,
        entityType,
        entityId,
        changes,
        metadata: {
          timestamp: new Date().toISOString(),
          source: 'web_app'
        },
        ipAddress: request?.headers.get('x-forwarded-for'),
        userAgent: request?.headers.get('user-agent')
      }
    });
    
    logger.info('Audit log created', {
      userId,
      action,
      entityType,
      entityId
    });
  }
}
```

### Critical Actions to Audit
- User authentication (login/logout)
- Data modifications (create/update/delete)
- Financial transactions
- Configuration changes
- Export operations
- Permission changes

## Error Handling Patterns

### Structured Error Logging
```typescript
export class ApplicationError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number,
    public details?: any
  ) {
    super(message);
    this.name = 'ApplicationError';
    
    // Log the error
    logger.error('Application error', {
      message,
      code,
      statusCode,
      details,
      stack: this.stack,
      timestamp: new Date().toISOString()
    });
  }
}
```

### Error Categories

#### Business Logic Errors
```typescript
throw new ApplicationError(
  'Insufficient inventory',
  'INSUFFICIENT_INVENTORY',
  400,
  { 
    required: 100,
    available: 50,
    skuId: 'SKU-001'
  }
);
```

#### Validation Errors
```typescript
try {
  const validated = schema.parse(input);
} catch (error) {
  if (error instanceof ZodError) {
    logger.warn('Validation error', {
      errors: error.errors,
      input: sanitizeInput(input)
    });
    throw new ApplicationError(
      'Validation failed',
      'VALIDATION_ERROR',
      400,
      error.errors
    );
  }
}
```

#### System Errors
```typescript
try {
  await prisma.inventoryTransaction.create({ data });
} catch (error) {
  logger.error('Database error', {
    operation: 'create_transaction',
    error: error.message,
    code: error.code
  });
  throw new ApplicationError(
    'Database operation failed',
    'DATABASE_ERROR',
    500
  );
}
```

## Performance Monitoring

### Request Performance
```typescript
// middleware.ts
export async function middleware(request: NextRequest) {
  const start = Date.now();
  
  const response = NextResponse.next();
  
  // Log request performance
  const duration = Date.now() - start;
  if (duration > 2000) {
    logger.warn('Slow request', {
      path: request.nextUrl.pathname,
      method: request.method,
      duration,
      timestamp: new Date().toISOString()
    });
  }
  
  // Add performance headers
  response.headers.set('X-Response-Time', `${duration}ms`);
  
  return response;
}
```

### Database Performance
```typescript
// Monitor query performance
async function monitoredQuery<T>(
  queryFn: () => Promise<T>,
  queryName: string
): Promise<T> {
  const start = Date.now();
  
  try {
    const result = await queryFn();
    const duration = Date.now() - start;
    
    if (duration > 1000) {
      logger.warn('Slow query detected', {
        query: queryName,
        duration,
        timestamp: new Date().toISOString()
      });
    }
    
    return result;
  } catch (error) {
    logger.error('Query failed', {
      query: queryName,
      error: error.message,
      duration: Date.now() - start
    });
    throw error;
  }
}
```

## Log Management

### Log Rotation
```javascript
// Configuration for winston-daily-rotate-file
{
  filename: 'logs/app-%DATE%.log',
  datePattern: 'YYYY-MM-DD',
  maxSize: '20m',        // Rotate when file reaches 20MB
  maxFiles: '14d',       // Keep logs for 14 days
  compress: true,        // Compress rotated files
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  )
}
```

### Log File Structure
```
logs/
├── app-2024-01-15.log      # Current day's logs
├── app-2024-01-14.log.gz   # Compressed previous day
├── app-2024-01-13.log.gz   # Compressed logs
├── error-2024-01-15.log    # Error-only logs
└── archived/               # Long-term storage
    └── 2024-01/            # Monthly archives
```

### Log Aggregation
```typescript
// Scripts for log analysis
export async function analyzeLogs(date: string) {
  const logFile = `logs/app-${date}.log`;
  const logs = await readLogFile(logFile);
  
  const analysis = {
    totalRequests: 0,
    errorCount: 0,
    warningCount: 0,
    slowRequests: [],
    errorsByType: {},
    requestsByEndpoint: {},
    averageResponseTime: 0
  };
  
  // Process logs
  logs.forEach(log => {
    if (log.level === 'error') analysis.errorCount++;
    if (log.level === 'warn') analysis.warningCount++;
    // ... more analysis
  });
  
  return analysis;
}
```

## Debugging Guide

### Development Tools

#### Debug Mode
```typescript
// Enable detailed logging in development
if (process.env.NODE_ENV === 'development') {
  logger.level = 'debug';
  
  // Log all database queries
  prisma.$on('query', (e) => {
    logger.debug('Database query', {
      query: e.query,
      params: e.params,
      duration: e.duration
    });
  });
}
```

#### Request Tracing
```typescript
// Add request ID for tracing
export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Use in logs
logger.info('Processing request', {
  requestId,
  userId: session.user.id,
  action: 'create_transaction'
});
```

### Common Issues and Solutions

#### 1. Slow Performance
```typescript
// Enable performance profiling
const PERFORMANCE_THRESHOLD = {
  api: 2000,      // 2 seconds
  database: 1000, // 1 second
  render: 500     // 500ms
};

// Log performance issues
if (duration > PERFORMANCE_THRESHOLD.api) {
  logger.warn('Performance threshold exceeded', {
    type: 'api',
    duration,
    threshold: PERFORMANCE_THRESHOLD.api,
    endpoint: request.url
  });
}
```

#### 2. Memory Leaks
```typescript
// Monitor memory usage
setInterval(() => {
  const usage = process.memoryUsage();
  logger.info('Memory usage', {
    rss: `${(usage.rss / 1024 / 1024).toFixed(2)} MB`,
    heapTotal: `${(usage.heapTotal / 1024 / 1024).toFixed(2)} MB`,
    heapUsed: `${(usage.heapUsed / 1024 / 1024).toFixed(2)} MB`,
    external: `${(usage.external / 1024 / 1024).toFixed(2)} MB`
  });
}, 60000); // Every minute
```

#### 3. Database Connection Issues
```typescript
// Connection pool monitoring
prisma.$on('error', (e) => {
  logger.error('Database connection error', {
    message: e.message,
    target: e.target,
    timestamp: new Date().toISOString()
  });
  
  // Attempt reconnection
  reconnectDatabase();
});
```

### Log Analysis Commands

```bash
# View recent errors
grep '"level":"error"' logs/app-$(date +%Y-%m-%d).log | jq '.'

# Count requests by endpoint
grep '"method":"GET"' logs/app-*.log | jq -r '.url' | sort | uniq -c

# Find slow queries
grep '"Slow database query"' logs/app-*.log | jq '.duration' | sort -n

# Monitor real-time logs
tail -f logs/app-$(date +%Y-%m-%d).log | jq '.'
```

## Monitoring Dashboard

### Key Metrics to Monitor

1. **Application Health**
   - Uptime percentage
   - Response time (p50, p95, p99)
   - Error rate
   - Active users

2. **Business Metrics**
   - Transactions per hour
   - Inventory levels
   - Invoice processing time
   - Cost calculation accuracy

3. **System Resources**
   - CPU usage
   - Memory consumption
   - Database connections
   - Disk space

### Alert Configuration

```typescript
// Alert thresholds
const ALERT_THRESHOLDS = {
  errorRate: 0.05,          // 5% error rate
  responseTime: 3000,       // 3 seconds
  memoryUsage: 0.85,        // 85% memory
  diskSpace: 0.90,          // 90% disk usage
  queueSize: 1000,          // 1000 pending jobs
};

// Check and alert
async function checkAlerts() {
  const metrics = await collectMetrics();
  
  if (metrics.errorRate > ALERT_THRESHOLDS.errorRate) {
    await sendAlert('High error rate detected', {
      current: metrics.errorRate,
      threshold: ALERT_THRESHOLDS.errorRate
    });
  }
  // ... check other thresholds
}
```

## Security Logging

### Security Events to Log
- Authentication attempts (success/failure)
- Authorization failures
- Suspicious activities
- Data access patterns
- Configuration changes

### Security Log Format
```typescript
logger.security = (event: SecurityEvent) => {
  logger.warn('SECURITY', {
    type: event.type,
    severity: event.severity,
    userId: event.userId,
    ipAddress: event.ipAddress,
    details: event.details,
    timestamp: new Date().toISOString()
  });
};

// Usage
logger.security({
  type: 'AUTH_FAILURE',
  severity: 'HIGH',
  userId: attemptedUsername,
  ipAddress: request.ip,
  details: { reason: 'Invalid password' }
});
```

## Log Retention Policy

| Log Type | Retention Period | Storage Location | Compression |
|----------|-----------------|------------------|-------------|
| Application Logs | 14 days | `/logs/` | After 1 day |
| Error Logs | 30 days | `/logs/errors/` | After 1 day |
| Audit Logs | 1 year | Database | N/A |
| Security Logs | 90 days | `/logs/security/` | After 7 days |
| Performance Logs | 7 days | `/logs/performance/` | After 1 day |

## Troubleshooting Checklist

1. **Application Won't Start**
   - Check log file permissions
   - Verify database connection
   - Review environment variables
   - Check port availability

2. **High Error Rate**
   - Review recent deployments
   - Check external service status
   - Analyze error patterns
   - Verify data integrity

3. **Performance Degradation**
   - Monitor database query times
   - Check memory usage
   - Review recent code changes
   - Analyze request patterns

4. **Data Inconsistencies**
   - Review audit logs
   - Check transaction logs
   - Verify calculation logic
   - Examine race conditions