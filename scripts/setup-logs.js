#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Log file path
const logFilePath = path.join(process.cwd(), 'logs', 'dev.log');

// Ensure logs directory exists
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
  console.log('✅ Created logs directory');
} else {
  console.log('✅ logs directory exists');
}

// Ensure logs/dev.log exists and is writable
try {
  // Check if file exists
  if (!fs.existsSync(logFilePath)) {
    // Create the file
    fs.writeFileSync(logFilePath, `# WMS Development Logs\n# Created: ${new Date().toISOString()}\n\n`);
    console.log('✅ Created logs/dev.log file');
  } else {
    console.log('✅ logs/dev.log file already exists');
  }

  // Check if file is writable
  fs.accessSync(logFilePath, fs.constants.W_OK);
  console.log('✅ logs/dev.log is writable');

  // Set proper permissions (read/write for owner, read for group and others)
  fs.chmodSync(logFilePath, '644');
  console.log('✅ Set proper permissions for logs/dev.log');

  console.log('\n📝 Logging system is ready!');
  console.log(`   - Development logs: ${logFilePath}`);
  console.log(`   - Rotating logs: ${logsDir}/`);

} catch (error) {
  console.error('❌ Error setting up logs:', error.message);
  
  if (error.code === 'EACCES') {
    console.error('\n⚠️  Permission denied. Try running with sudo or check file permissions.');
  }
  
  process.exit(1);
}