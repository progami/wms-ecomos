#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

console.log('Starting WMS application with direct Node.js...');
console.log('Environment variables:');
console.log('- BASE_PATH:', process.env.BASE_PATH || '/WMS');
console.log('- NODE_ENV:', process.env.NODE_ENV || 'production');
console.log('- PORT:', process.env.PORT || '3000');

// Set environment variables
const env = {
  ...process.env,
  BASE_PATH: '/WMS',
  NODE_ENV: 'production',
  PORT: '3000'
};

// Path to the standalone server
const serverPath = path.join('/home/wms/wms-app/.next/standalone/server.js');

console.log('\nAttempting to start server at:', serverPath);

// Start the server
const server = spawn('node', [serverPath], {
  env,
  stdio: 'inherit',
  cwd: '/home/wms/wms-app/.next/standalone'
});

server.on('error', (err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

server.on('exit', (code) => {
  console.log(`Server exited with code ${code}`);
  process.exit(code);
});

// Handle process termination
process.on('SIGINT', () => {
  console.log('\nReceived SIGINT, shutting down gracefully...');
  server.kill('SIGTERM');
});

process.on('SIGTERM', () => {
  console.log('\nReceived SIGTERM, shutting down gracefully...');
  server.kill('SIGTERM');
});