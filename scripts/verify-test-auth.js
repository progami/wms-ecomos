#!/usr/bin/env node

/**
 * Script to verify test authentication is working correctly
 */

const http = require('http');
const { spawn } = require('child_process');
const path = require('path');

// Set test environment
process.env.USE_TEST_AUTH = 'true';
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://test:test@localhost:5432/test';
process.env.NEXTAUTH_URL = 'http://localhost:3001';
process.env.NEXTAUTH_SECRET = 'test-secret';
process.env.PORT = '3001';

console.log('🔍 Verifying test authentication setup...');
console.log('Environment:', {
  USE_TEST_AUTH: process.env.USE_TEST_AUTH,
  NODE_ENV: process.env.NODE_ENV,
  PORT: process.env.PORT
});

// Start the server
const server = spawn('npm', ['run', 'start'], {
  env: process.env,
  stdio: 'pipe'
});

let serverStarted = false;
let testResult = null;

server.stdout.on('data', (data) => {
  const output = data.toString();
  if (output.includes('Ready') || output.includes('started server')) {
    console.log('✅ Server started successfully');
    serverStarted = true;
    runAuthTest();
  }
});

server.stderr.on('data', (data) => {
  console.error('Server error:', data.toString());
});

function runAuthTest() {
  console.log('\n🧪 Testing authentication...');
  
  // Test 1: Check if login endpoint accepts test credentials
  const postData = JSON.stringify({
    emailOrUsername: 'test@example.com',
    password: 'test123',
    csrfToken: 'test' // NextAuth requires this
  });

  const options = {
    hostname: 'localhost',
    port: 3001,
    path: '/api/auth/callback/credentials',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  const req = http.request(options, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      console.log('Auth response status:', res.statusCode);
      if (res.statusCode < 400) {
        console.log('✅ Test authentication is working!');
        testResult = true;
      } else {
        console.log('❌ Test authentication failed');
        console.log('Response:', data);
        testResult = false;
      }
      cleanup();
    });
  });

  req.on('error', (err) => {
    console.error('❌ Failed to connect to server:', err.message);
    testResult = false;
    cleanup();
  });

  req.write(postData);
  req.end();
}

function cleanup() {
  console.log('\n🧹 Cleaning up...');
  server.kill();
  process.exit(testResult ? 0 : 1);
}

// Timeout after 30 seconds
setTimeout(() => {
  if (!serverStarted) {
    console.error('❌ Server failed to start within 30 seconds');
    cleanup();
  }
}, 30000);

// Handle script termination
process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);