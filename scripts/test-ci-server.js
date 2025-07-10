#!/usr/bin/env node

/**
 * Test script to verify CI server works correctly
 */

const http = require('http');
const { spawn } = require('child_process');
const path = require('path');

// Set environment variables
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.NEXTAUTH_URL = 'http://localhost:3000';
process.env.NEXTAUTH_SECRET = 'test-secret';
process.env.USE_TEST_AUTH = 'true';
process.env.CI = 'true';
process.env.NODE_ENV = 'production';

console.log('[Test CI Server] Starting test...');

// Start the CI server
const serverPath = path.join(__dirname, 'ci-server.js');
const server = spawn('node', [serverPath], {
  env: process.env,
  stdio: 'inherit'
});

let serverStarted = false;

// Wait for server to start
const checkServer = () => {
  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/health-ci',
    method: 'GET'
  };

  const req = http.request(options, (res) => {
    if (res.statusCode === 200) {
      console.log('[Test CI Server] Server is running successfully!');
      serverStarted = true;
      
      // Test the response
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log('[Test CI Server] Health check response:', data);
        
        // Kill the server
        server.kill();
        process.exit(0);
      });
    }
  });

  req.on('error', (err) => {
    // Server not ready yet
  });

  req.end();
};

// Check every 2 seconds
const interval = setInterval(checkServer, 2000);

// Timeout after 30 seconds
setTimeout(() => {
  if (!serverStarted) {
    console.error('[Test CI Server] Server failed to start within 30 seconds');
    server.kill();
    process.exit(1);
  }
}, 30000);

// Handle server exit
server.on('exit', (code) => {
  clearInterval(interval);
  if (!serverStarted) {
    console.error('[Test CI Server] Server exited with code:', code);
    process.exit(1);
  }
});