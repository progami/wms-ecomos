#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('Testing comprehensive logging setup...\n');

// Ensure logs directory exists
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
  console.log('✓ Created logs directory');
}

const devLogPath = path.join(process.cwd(), 'logs', 'dev.log');

// Clear existing logs/dev.log
fs.writeFileSync(devLogPath, `WMS Development Log - Test started at ${new Date().toISOString()}\n\n`);
console.log('✓ Cleared logs/dev.log for fresh test');

// Test different log levels
console.log('\n📝 Writing test logs...');
console.log('TEST: This is a console.log message');
console.info('TEST: This is a console.info message');
console.warn('TEST: This is a console.warn message');
console.error('TEST: This is a console.error message (not a real error)');
console.debug('TEST: This is a console.debug message');

// Test object logging
console.log('TEST: Object logging', {
  timestamp: new Date().toISOString(),
  nested: {
    data: 'test value',
    array: [1, 2, 3]
  }
});

// Test error with stack trace
const testError = new Error('Test error with stack trace');
console.error('TEST: Error object', testError);

// Wait a moment for logs to be written
setTimeout(() => {
  // Read and display the logs/dev.log contents
  console.log('\n📄 Current logs/dev.log contents:');
  console.log('─'.repeat(80));
  const logContents = fs.readFileSync(devLogPath, 'utf8');
  console.log(logContents);
  console.log('─'.repeat(80));
  
  console.log('\n✅ Logging test complete!');
  console.log('\nTo test server logging:');
  console.log('1. Start the server with: npm run dev:logged');
  console.log('2. Make some requests to the application');
  console.log('3. Monitor logs/dev.log with: tail -f logs/dev.log');
}, 1000);