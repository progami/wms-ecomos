import { NextRequest, NextResponse } from 'next/server';
import { withLogging } from '@/lib/logger/middleware';
import { apiLogger, businessLogger, perfLogger } from '@/lib/logger';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

// Example of a fully logged API route
export const GET = withLogging(async (request: NextRequest) => {
  const startTime = Date.now();
  
  try {
    // Log authentication check
    const session = await getServerSession(authOptions);
    if (!session) {
      apiLogger.warn('Unauthenticated API access attempt', {
        path: request.nextUrl.pathname,
        ip: request.headers.get('x-forwarded-for') || 'unknown',
      });
      
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Log business operation start
    businessLogger.info('Starting example operation', {
      userId: session.user.id,
      userRole: session.user.role,
    });

    // Simulate some work
    await new Promise(resolve => setTimeout(resolve, 100));

    // Log successful completion
    businessLogger.info('Example operation completed successfully', {
      userId: session.user.id,
      duration: Date.now() - startTime,
    });

    // Log performance metrics
    perfLogger.log('API operation completed', {
      operation: 'example-get',
      duration: Date.now() - startTime,
    });

    return NextResponse.json({
      success: true,
      message: 'This is a logged API example',
      user: session.user.email,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    // Log error with context
    apiLogger.error('Example API operation failed', {
      error: error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: error.stack,
      } : String(error),
      duration: Date.now() - startTime,
    });

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});

export const POST = withLogging(async (request: NextRequest) => {
  try {
    const body = await request.json();
    
    // Log incoming data (with sensitive fields redacted)
    apiLogger.info('Received POST data', {
      dataKeys: Object.keys(body),
      hasEmail: !!body.email,
      hasPassword: !!body.password, // Never log actual passwords
    });

    // Validate and process...
    
    return NextResponse.json({ success: true });
  } catch (error) {
    apiLogger.error('POST request failed', { error });
    return NextResponse.json(
      { error: 'Bad request' },
      { status: 400 }
    );
  }
});