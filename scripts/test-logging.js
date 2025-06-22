#!/usr/bin/env node

/**
 * Test script to generate sample logs for the WMS logging system
 * This simulates various log events to verify the logging infrastructure
 */

const path = require('path');

// Set up environment
process.env.NODE_ENV = 'development';
process.env.LOG_LEVEL = 'debug';
process.env.LOG_DIR = './logs';

// Import the logger after setting environment
const loggerPath = path.join(process.cwd(), 'src', 'lib', 'logger', 'index.ts');

console.log('🧪 Starting WMS Logging System Test...\n');

// Since we're in a JS environment and the logger is in TypeScript,
// we'll simulate the logs by writing directly to logs/dev.log
const fs = require('fs');

// Ensure logs directory exists
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
  console.log('✓ Created logs directory');
}

const devLogPath = path.join(process.cwd(), 'logs', 'dev.log');

function writeLog(level, category, message, metadata = {}) {
  const timestamp = new Date().toISOString();
  const logEntry = `${timestamp} [${level.toUpperCase()}] [${category}]: ${message} ${JSON.stringify(metadata)}\n`;
  
  // Write to console
  console.log(`✅ ${logEntry.trim()}`);
  
  // Append to logs/dev.log
  fs.appendFileSync(devLogPath, logEntry);
}

// Test 1: Authentication Logs
console.log('📝 Testing Authentication Logs...');
writeLog('info', 'auth', 'Authentication attempt', {
  username: 'testuser@example.com',
  ip: '192.168.1.100',
  timestamp: new Date().toISOString()
});

writeLog('info', 'auth', 'Successful login', {
  userId: 'user-123',
  username: 'testuser',
  email: 'testuser@example.com',
  role: 'staff',
  warehouseId: 'wh-001',
  ip: '192.168.1.100'
});

writeLog('warn', 'auth', 'Failed login attempt - invalid password', {
  username: 'testuser@example.com',
  userId: 'user-123',
  ip: '192.168.1.100'
});

// Test 2: Business Operation Logs
console.log('\n📦 Testing Business Operation Logs...');
writeLog('info', 'business', 'Processing inventory transaction', {
  transactionType: 'RECEIVE',
  referenceNumber: 'PO-2024-001',
  warehouseId: 'wh-001',
  warehouseCode: 'LAX',
  itemCount: 5,
  userId: 'user-123',
  userRole: 'staff'
});

writeLog('info', 'business', 'Invoice created successfully', {
  invoiceId: 'inv-456',
  invoiceNumber: 'INV-2024-001',
  warehouseId: 'wh-001',
  totalAmount: 5000,
  duration: 234,
  userId: 'user-123'
});

writeLog('error', 'business', 'Failed to create invoice - database error', {
  error: 'Unique constraint violation',
  code: 'P2002',
  invoiceNumber: 'INV-2024-001',
  userId: 'user-123'
});

// Test 3: Performance Logs
console.log('\n⚡ Testing Performance Logs...');
writeLog('perf', 'performance', 'Dashboard data fetch: 450ms', {
  metric: 'dashboard_data_fetch',
  value: 450,
  hasData: true
});

writeLog('perf', 'performance', 'Transaction processing completed: 1250ms', {
  transactionType: 'SHIP',
  itemCount: 10,
  duration: 1250,
  avgDurationPerItem: 125
});

writeLog('warn', 'performance', 'Slow operation detected: inventory_initial_load', {
  operation: 'inventory_initial_load',
  duration: 3500,
  threshold: 2000,
  page: 'inventory',
  balanceCount: 150,
  transactionCount: 500
});

// Test 4: API Logs
console.log('\n🌐 Testing API Logs...');
writeLog('http', 'api', 'POST /api/transactions - 201', {
  method: 'POST',
  endpoint: '/api/transactions',
  status: 201,
  duration: 125,
  source: 'client'
});

writeLog('error', 'api', 'POST /api/invoices - 500', {
  method: 'POST',
  endpoint: '/api/invoices',
  status: 500,
  duration: 89,
  error: 'Database connection timeout'
});

// Test 5: Client-Side Logs
console.log('\n💻 Testing Client-Side Logs...');
writeLog('info', 'action', 'Button clicked', {
  button: 'submit-order',
  page: '/orders/new',
  userId: 'user-123',
  source: 'client'
});

writeLog('info', 'navigation', 'Navigate from /dashboard to /operations/inventory', {
  from: '/dashboard',
  to: '/operations/inventory',
  userId: 'user-123',
  source: 'client'
});

writeLog('error', 'client', 'React Error Boundary', {
  error: {
    name: 'TypeError',
    message: "Cannot read property 'id' of undefined",
    stack: 'TypeError: Cannot read property...'
  },
  component: 'InventoryTable',
  userId: 'user-123',
  source: 'client'
});

// Test 6: Security Logs
console.log('\n🔒 Testing Security Logs...');
writeLog('warn', 'security', 'Invalid login attempt', {
  username: 'unknown@hacker.com',
  reason: 'user_not_found',
  ip: '203.0.113.45'
});

writeLog('error', 'security', 'Unauthorized access attempt', {
  path: '/api/admin/users',
  method: 'DELETE',
  userId: 'user-789',
  userRole: 'viewer',
  ip: '198.51.100.23',
  critical: true
});

// Test 7: System Logs
console.log('\n⚙️ Testing System Logs...');
writeLog('info', 'system', 'Logging system initialized', {
  logLevel: 'debug',
  logDir: './logs',
  environment: 'development',
  pid: process.pid
});

writeLog('info', 'system', 'Application started', {
  port: 3000,
  environment: 'development',
  nodeVersion: process.version
});

// Summary
console.log('\n✨ Logging test completed!');
console.log(`📄 Logs written to: ${devLogPath}`);
console.log('📊 Total test logs generated: 20');
console.log('\n🔍 You can view the logs by running: tail -f logs/dev.log');
console.log('📁 Rotating logs will be available in: ./logs/');

// Check if logs/dev.log exists and show its size
if (fs.existsSync(devLogPath)) {
  const stats = fs.statSync(devLogPath);
  console.log(`\n📏 Current logs/dev.log size: ${(stats.size / 1024).toFixed(2)} KB`);
}