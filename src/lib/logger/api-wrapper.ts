import { NextRequest, NextResponse } from 'next/server';
import { apiLogger, perfLogger } from './index';

// Wrapper function for API routes to ensure logging
export function withApiLogging<T extends (...args: any[]) => any>(
  handler: T,
  routeName?: string
): T {
  return (async (...args: Parameters<T>) => {
    const startTime = Date.now();
    const requestId = crypto.randomUUID();
    
    // Try to extract request information
    let method = 'UNKNOWN';
    let path = routeName || 'unknown';
    let body = null;
    
    // Check if first argument is NextRequest
    if (args[0] instanceof NextRequest) {
      const request = args[0] as NextRequest;
      method = request.method;
      path = request.nextUrl.pathname;
      
      try {
        const clonedRequest = request.clone();
        body = await clonedRequest.json().catch(() => null);
      } catch (e) {
        // Ignore body parsing errors
      }
    }
    // Check if it's a traditional req object
    else if (args[0]?.method) {
      const req = args[0] as any;
      method = req.method;
      path = req.url || path;
      body = req.body;
    }
    
    // Log API request
    apiLogger.info(`API Request: ${method} ${path}`, {
      requestId,
      method,
      path,
      body,
      timestamp: new Date().toISOString(),
    });
    
    try {
      // Call the actual handler
      const result = await handler(...args);
      
      const duration = Date.now() - startTime;
      
      // Log successful response
      apiLogger.info(`API Response: ${method} ${path}`, {
        requestId,
        method,
        path,
        duration,
        status: result?.status || 200,
        timestamp: new Date().toISOString(),
      });
      
      // Log slow requests
      perfLogger.slow(`API: ${method} ${path}`, duration, 1000, {
        requestId,
        method,
        path,
      });
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      // Log error
      apiLogger.error(`API Error: ${method} ${path}`, {
        requestId,
        method,
        path,
        duration,
        error: error instanceof Error ? {
          message: error.message,
          stack: error.stack,
          name: error.name,
        } : String(error),
        timestamp: new Date().toISOString(),
      });
      
      // Re-throw the error
      throw error;
    }
  }) as T;
}

// Simple console log wrapper for debugging
export function logApiCall(context: string, data?: any) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [API] [${context}]`, data ? JSON.stringify(data, null, 2) : '');
}