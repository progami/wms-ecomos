import { NextRequest, NextResponse } from 'next/server';
import { withApiLogging, logApiCall } from '@/lib/logger/api-wrapper';

async function handler(request: NextRequest) {
  logApiCall('test-logging', { message: 'Test logging endpoint accessed' });
  
  // Test different console methods
  console.log('This is a console.log message');
  console.info('This is a console.info message');
  console.warn('This is a console.warn message');
  console.error('This is a console.error message (not a real error)');
  console.debug('This is a console.debug message');
  
  // Test object logging
  console.log('Object logging test:', {
    timestamp: new Date().toISOString(),
    data: {
      nested: {
        value: 'test',
        array: [1, 2, 3]
      }
    }
  });
  
  return NextResponse.json({
    message: 'Logging test completed',
    timestamp: new Date().toISOString(),
    check: 'Check dev.log file for all logged messages'
  });
}

export const GET = withApiLogging(handler, '/api/test/logging');
