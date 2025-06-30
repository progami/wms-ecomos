#!/usr/bin/env tsx

import fs from 'fs';
import path from 'path';

const logDir = process.env.LOG_DIR || './logs';
const devLogPath = path.join('./logs', 'dev.log');

console.log('Setting up logging system...');

// Create logs directory if it doesn't exist
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
  console.log(`Created log directory: ${logDir}`);
} else {
  console.log(`Log directory already exists: ${logDir}`);
}

// Create subdirectories for archived logs
const archiveDir = path.join(logDir, 'archived');
if (!fs.existsSync(archiveDir)) {
  fs.mkdirSync(archiveDir, { recursive: true });
  console.log(`Created archive directory: ${archiveDir}`);
}

// Create initial log files with proper permissions
const logFiles = [
  'app.log',
  'error.log',
  'api.log',
  'auth.log',
  'perf.log',
];

logFiles.forEach(file => {
  const filePath = path.join(logDir, file);
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, '');
    // Set permissions to be readable/writable by owner
    fs.chmodSync(filePath, 0o644);
    console.log(`Created log file: ${filePath}`);
  }
});

// Create or clear logs/dev.log
if (process.env.NODE_ENV !== 'production') {
  fs.writeFileSync(devLogPath, `WMS Development Log - Started at ${new Date().toISOString()}\n`);
  console.log(`Initialized logs/dev.log at: ${devLogPath}`);
}

console.log('\nLogging system setup completed successfully!');
console.log(`\nLog directory: ${logDir}`);
console.log(`Archive directory: ${archiveDir}`);
console.log(`Dev log: ${devLogPath}`);
console.log('\nTo start the server with logging:');
console.log('  npm run dev:logged');
console.log('\nTo view logs:');
console.log('  tail -f logs/dev.log');
console.log(`  tail -f ${path.join(logDir, 'app-*.log')}`);

process.exit(0);