#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('Setting up comprehensive logging for WMS...\n');

// Ensure logs directory exists
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
  console.log('✓ Created logs directory');
}

// Ensure logs/dev.log exists
const devLogPath = path.join(process.cwd(), 'logs', 'dev.log');
if (!fs.existsSync(devLogPath)) {
  fs.writeFileSync(devLogPath, `WMS Development Log - Started at ${new Date().toISOString()}\n\n`);
  console.log('✓ Created logs/dev.log file');
} else {
  console.log('✓ logs/dev.log file already exists');
}

// Create a test API route with comprehensive logging
const testApiRoute = `import { NextRequest, NextResponse } from 'next/server';
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
`;

const testApiDir = path.join(process.cwd(), 'src', 'app', 'api', 'test', 'logging');
fs.mkdirSync(testApiDir, { recursive: true });
fs.writeFileSync(path.join(testApiDir, 'route.ts'), testApiRoute);
console.log('✓ Created test logging API route at /api/test/logging');

// Create environment variable recommendations
const envExample = `
# Logging Configuration
LOG_LEVEL=debug
LOG_DIR=./logs
ENABLE_CONSOLE_LOGS=true
ENABLE_FILE_LOGS=true
LOG_DATE_PATTERN=YYYY-MM-DD
LOG_MAX_SIZE=20m
LOG_MAX_FILES=14d
`;

console.log('\n📝 Recommended environment variables for logging:');
console.log(envExample);

console.log('\n✅ Comprehensive logging setup complete!');
console.log('\nTo test the logging:');
console.log('1. Start the server with: npm run dev:logged');
console.log('2. Visit http://localhost:3000/api/test/logging');
console.log('3. Check the logs/dev.log file for all captured logs');
console.log('\nAll console output from the server will be captured in logs/dev.log');