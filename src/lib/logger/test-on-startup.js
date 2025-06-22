// This module tests logging on server startup
const fs = require('fs');
const path = require('path');

function testLoggingOnStartup() {
  console.log('\n=== LOGGING SYSTEM TEST START ===');
  console.log('Testing console override functionality...');
  
  // Test all console methods
  console.log('TEST LOG: Basic console.log message');
  console.info('TEST INFO: Information message');
  console.warn('TEST WARN: Warning message');
  console.error('TEST ERROR: Error message (not a real error)');
  console.debug('TEST DEBUG: Debug message');
  
  // Test with objects
  console.log('TEST OBJECT:', {
    timestamp: new Date().toISOString(),
    data: {
      nested: true,
      value: 42,
      array: ['a', 'b', 'c']
    }
  });
  
  // Test with multiple arguments
  console.log('TEST MULTI:', 'arg1', 'arg2', { key: 'value' }, [1, 2, 3]);
  
  // Test process.stdout.write
  process.stdout.write('TEST STDOUT: Direct stdout write\n');
  
  // Test process.stderr.write
  process.stderr.write('TEST STDERR: Direct stderr write\n');
  
  console.log('=== LOGGING SYSTEM TEST END ===\n');
  
  // Verify logs/dev.log exists and has content
  setTimeout(() => {
    const devLogPath = path.join(process.cwd(), 'logs', 'dev.log');
    if (fs.existsSync(devLogPath)) {
      const stats = fs.statSync(devLogPath);
      console.log(`✓ logs/dev.log exists (size: ${stats.size} bytes)`);
    } else {
      console.error('✗ logs/dev.log not found!');
    }
  }, 100);
}

module.exports = { testLoggingOnStartup };