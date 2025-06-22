import NextAuth from 'next-auth'
import { authOptions } from '@/lib/auth'
import { NextRequest } from 'next/server'
import { checkAuthRateLimit, recordFailedLoginAttempt, recordSuccessfulLogin } from '@/lib/security/auth-rate-limiter'
import { authLogger } from '@/lib/logger'

async function authHandler(req: NextRequest, context: any) {
  const startTime = Date.now();
  
  // Log auth request
  authLogger.info('Auth endpoint accessed', {
    method: req.method,
    url: req.url,
    userAgent: req.headers.get('user-agent'),
    ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
  });
  
  // Apply rate limiting to signin/callback POST requests
  if (req.method === 'POST' && (req.url.includes('signin') || req.url.includes('callback'))) {
    // Try to extract username from request
    let username: string | undefined;
    try {
      const body = await req.clone().text();
      const params = new URLSearchParams(body);
      username = params.get('username') || params.get('email') || params.get('emailOrUsername') || undefined;
    } catch {
      // Ignore body parsing errors
    }
    
    const rateLimitResponse = await checkAuthRateLimit(req, username);
    if (rateLimitResponse) {
      authLogger.warn('Rate limit exceeded', {
        ip: req.headers.get('x-forwarded-for') || 'unknown',
        userAgent: req.headers.get('user-agent'),
        username
      });
      return rateLimitResponse;
    }
  }
  
  try {
    // Create a modified authOptions to handle login tracking
    const modifiedAuthOptions = {
      ...authOptions,
      events: {
        ...authOptions.events,
        signIn: async (message: any) => {
          // Record successful login
          if (message.user?.email || message.user?.name) {
            recordSuccessfulLogin(req, message.user.email || message.user.name);
          }
          
          // Call original signIn event if it exists
          if (authOptions.events?.signIn) {
            await authOptions.events.signIn(message);
          }
        }
      },
      callbacks: {
        ...authOptions.callbacks,
        signIn: async (params: any) => {
          try {
            // Call the original signIn callback if it exists
            const result = authOptions.callbacks?.signIn 
              ? await authOptions.callbacks.signIn(params)
              : true;
            
            return result;
          } catch (error) {
            // Record failed attempt
            const username = params.credentials?.emailOrUsername || params.credentials?.email;
            if (username) {
              recordFailedLoginAttempt(req, username);
            }
            throw error;
          }
        }
      }
    };
    
    // NextAuth handler
    const handler = NextAuth(modifiedAuthOptions);
    const response = await handler(req, context);
    
    // Log successful auth response
    const duration = Date.now() - startTime;
    authLogger.info('Auth request completed', {
      method: req.method,
      duration,
      status: 'success'
    });
    
    return response;
  } catch (error) {
    // Log auth errors
    const duration = Date.now() - startTime;
    authLogger.error('Auth request failed', {
      method: req.method,
      duration,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    
    // Record failed attempt if it's a credentials error
    if (req.method === 'POST' && error instanceof Error && error.message.includes('Invalid credentials')) {
      try {
        const body = await req.clone().text();
        const params = new URLSearchParams(body);
        const username = params.get('username') || params.get('email') || params.get('emailOrUsername');
        if (username) {
          recordFailedLoginAttempt(req, username);
        }
      } catch {
        // Ignore body parsing errors
      }
    }
    
    throw error;
  }
}

export { authHandler as GET, authHandler as POST }