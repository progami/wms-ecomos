// Client-side logger for browser environments
export interface ClientLogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  category: string;
  message: string;
  metadata?: any;
  url?: string;
  userAgent?: string;
  userId?: string;
}

class ClientLogger {
  private buffer: ClientLogEntry[] = [];
  private flushInterval: number = 5000; // 5 seconds
  private maxBufferSize: number = 50;
  private flushTimer: NodeJS.Timeout | null = null;
  private endpoint: string = process.env.NODE_ENV === 'production' ? '/WMS/api/logs/client' : '/api/logs/client';

  constructor() {
    // Start flush timer
    this.startFlushTimer();

    // Flush on page unload
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        this.flush();
      });

      // Capture unhandled errors
      window.addEventListener('error', (event) => {
        this.error('Unhandled error', {
          message: event.message,
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          error: event.error ? {
            name: event.error.name,
            message: event.error.message,
            stack: event.error.stack,
          } : null,
        });
      });

      // Capture unhandled promise rejections
      window.addEventListener('unhandledrejection', (event) => {
        this.error('Unhandled promise rejection', {
          reason: event.reason,
          promise: event.promise,
        });
      });
    }
  }

  private startFlushTimer() {
    if (typeof window === 'undefined') return;
    
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }

    this.flushTimer = setInterval(() => {
      if (this.buffer.length > 0) {
        this.flush();
      }
    }, this.flushInterval);
  }

  private createEntry(
    level: ClientLogEntry['level'],
    category: string,
    message: string,
    metadata?: any
  ): ClientLogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      category,
      message,
      metadata: this.sanitizeMetadata(metadata),
      url: typeof window !== 'undefined' ? window.location.href : undefined,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
      userId: this.getUserId(),
    };
  }

  private sanitizeMetadata(metadata: any): any {
    if (!metadata) return metadata;

    // Remove sensitive data
    const sensitiveKeys = ['password', 'token', 'apiKey', 'creditCard', 'ssn'];
    
    if (typeof metadata === 'object' && !Array.isArray(metadata)) {
      const sanitized = { ...metadata };
      Object.keys(sanitized).forEach((key) => {
        if (sensitiveKeys.some((sensitive) => key.toLowerCase().includes(sensitive))) {
          sanitized[key] = '[REDACTED]';
        }
      });
      return sanitized;
    }

    return metadata;
  }

  private getUserId(): string | undefined {
    // Try to get user ID from various sources
    if (typeof window !== 'undefined') {
      // Check localStorage
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        try {
          const user = JSON.parse(storedUser);
          return user.id || user.userId;
        } catch {}
      }

      // Check session storage
      const sessionUser = sessionStorage.getItem('user');
      if (sessionUser) {
        try {
          const user = JSON.parse(sessionUser);
          return user.id || user.userId;
        } catch {}
      }
    }

    return undefined;
  }

  private addToBuffer(entry: ClientLogEntry) {
    this.buffer.push(entry);

    // Flush if buffer is full
    if (this.buffer.length >= this.maxBufferSize) {
      this.flush();
    }

    // Also log to console in development
    if (process.env.NODE_ENV === 'development') {
      const consoleMethod = entry.level === 'error' ? 'error' : 
                          entry.level === 'warn' ? 'warn' : 
                          entry.level === 'debug' ? 'debug' : 'log';
      
      console[consoleMethod](
        `[${entry.category}] ${entry.message}`,
        entry.metadata || ''
      );
    }
  }

  async flush() {
    if (this.buffer.length === 0) return;

    const logs = [...this.buffer];
    this.buffer = [];

    try {
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ logs }),
      });

      if (!response.ok) {
        // Put logs back in buffer if send failed
        this.buffer.unshift(...logs);
      }
    } catch (error) {
      // Put logs back in buffer if send failed
      this.buffer.unshift(...logs);
      console.error('Failed to send logs to server:', error);
    }
  }

  // Logging methods
  info(message: string, metadata?: any) {
    this.addToBuffer(this.createEntry('info', 'client', message, metadata));
  }

  warn(message: string, metadata?: any) {
    this.addToBuffer(this.createEntry('warn', 'client', message, metadata));
  }

  error(message: string, metadata?: any) {
    this.addToBuffer(this.createEntry('error', 'client', message, metadata));
  }

  debug(message: string, metadata?: any) {
    this.addToBuffer(this.createEntry('debug', 'client', message, metadata));
  }

  // Specialized logging methods
  action(action: string, metadata?: any) {
    this.addToBuffer(this.createEntry('info', 'action', action, metadata));
  }

  navigation(from: string, to: string, metadata?: any) {
    this.addToBuffer(
      this.createEntry('info', 'navigation', `Navigate from ${from} to ${to}`, {
        from,
        to,
        ...metadata,
      })
    );
  }

  performance(metric: string, value: number, metadata?: any) {
    this.addToBuffer(
      this.createEntry('info', 'performance', `${metric}: ${value}ms`, {
        metric,
        value,
        ...metadata,
      })
    );
  }

  api(method: string, endpoint: string, status: number, duration: number, metadata?: any) {
    const level = status >= 400 ? 'error' : 'info';
    this.addToBuffer(
      this.createEntry(level, 'api', `${method} ${endpoint} - ${status}`, {
        method,
        endpoint,
        status,
        duration,
        ...metadata,
      })
    );
  }
}

// Create singleton instance with lazy initialization
let _clientLogger: ClientLogger | null = null;

export const clientLogger = {
  info: (message: string, metadata?: any) => {
    if (typeof window !== 'undefined') {
      if (!_clientLogger) _clientLogger = new ClientLogger();
      _clientLogger.info(message, metadata);
    }
  },
  warn: (message: string, metadata?: any) => {
    if (typeof window !== 'undefined') {
      if (!_clientLogger) _clientLogger = new ClientLogger();
      _clientLogger.warn(message, metadata);
    }
  },
  error: (message: string, metadata?: any) => {
    if (typeof window !== 'undefined') {
      if (!_clientLogger) _clientLogger = new ClientLogger();
      _clientLogger.error(message, metadata);
    }
  },
  debug: (message: string, metadata?: any) => {
    if (typeof window !== 'undefined') {
      if (!_clientLogger) _clientLogger = new ClientLogger();
      _clientLogger.debug(message, metadata);
    }
  },
  action: (action: string, metadata?: any) => {
    if (typeof window !== 'undefined') {
      if (!_clientLogger) _clientLogger = new ClientLogger();
      _clientLogger.action(action, metadata);
    }
  },
  navigation: (from: string, to: string, metadata?: any) => {
    if (typeof window !== 'undefined') {
      if (!_clientLogger) _clientLogger = new ClientLogger();
      _clientLogger.navigation(from, to, metadata);
    }
  },
  performance: (metric: string, value: number, metadata?: any) => {
    if (typeof window !== 'undefined') {
      if (!_clientLogger) _clientLogger = new ClientLogger();
      _clientLogger.performance(metric, value, metadata);
    }
  },
  api: (method: string, endpoint: string, status: number, duration: number, metadata?: any) => {
    if (typeof window !== 'undefined') {
      if (!_clientLogger) _clientLogger = new ClientLogger();
      _clientLogger.api(method, endpoint, status, duration, metadata);
    }
  },
};

// Performance monitoring utilities
export function measurePerformance(name: string, fn: () => void | Promise<void>) {
  const start = performance.now();
  
  const result = fn();
  
  if (result instanceof Promise) {
    return result.finally(() => {
      const duration = performance.now() - start;
      clientLogger?.performance(name, duration);
    });
  } else {
    const duration = performance.now() - start;
    clientLogger?.performance(name, duration);
    return result;
  }
}

// React Error Boundary logger
export function logErrorToService(error: Error, errorInfo: any) {
  clientLogger?.error('React Error Boundary', {
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack,
    },
    errorInfo,
    component: errorInfo.componentStack,
  });
}