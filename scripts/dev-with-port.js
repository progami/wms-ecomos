#!/usr/bin/env node
const { spawn } = require('child_process');

// Get PORT from environment or use default
const port = process.env.PORT || '3000';

console.log(`Starting Next.js dev server on port ${port}...`);

// Run next dev with the specified port
const child = spawn('npx', ['next', 'dev', '-p', port], {
  stdio: 'inherit',
  shell: true
});

child.on('exit', (code) => {
  process.exit(code);
});