#!/usr/bin/env node

/**
 * CI-specific server for running E2E tests
 * This server is optimized for CI environments with proper error handling
 */

const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const path = require('path');

// Force CI environment settings
process.env.NODE_ENV = 'production';
process.env.USE_TEST_AUTH = 'true';
process.env.CI = 'true';

// Don't load .env files in CI - use environment variables only
console.log('[CI Server] Starting CI server...');
console.log('[CI Server] Environment:', {
  NODE_ENV: process.env.NODE_ENV,
  USE_TEST_AUTH: process.env.USE_TEST_AUTH,
  DATABASE_URL: process.env.DATABASE_URL ? 'Set' : 'Not set',
  REDIS_URL: process.env.REDIS_URL ? 'Set' : 'Not set',
  NEXTAUTH_URL: process.env.NEXTAUTH_URL,
  PORT: process.env.PORT || '3000'
});

const dev = false; // Always production mode in CI
const hostname = '0.0.0.0'; // Listen on all interfaces in CI
const port = parseInt(process.env.PORT || '3000', 10);

// Create Next.js app with CI-specific configuration
const app = next({ 
  dev, 
  hostname, 
  port,
  dir: process.cwd(), // Explicitly set directory
  quiet: false, // Show Next.js logs
  conf: {
    // Override any problematic config for CI
    output: undefined, // Disable standalone in CI
    compress: true,
    poweredByHeader: false,
  }
});

const handle = app.getRequestHandler();

// Error handler
process.on('unhandledRejection', (reason, promise) => {
  console.error('[CI Server] Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('[CI Server] Uncaught Exception:', error);
  process.exit(1);
});

// Prepare the app
console.log('[CI Server] Preparing Next.js app...');
app.prepare()
  .then(() => {
    console.log('[CI Server] Next.js app prepared successfully');
    
    const server = createServer(async (req, res) => {
      try {
        const parsedUrl = parse(req.url, true);
        const { pathname } = parsedUrl;

        // Log requests for debugging
        console.log(`[CI Server] ${req.method} ${req.url}`);

        // Add health check endpoints
        if (pathname === '/api/health' || pathname === '/api/health-ci') {
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ 
            status: 'ok', 
            timestamp: new Date().toISOString(),
            env: 'ci',
            pid: process.pid
          }));
          return;
        }

        // Handle all other requests through Next.js
        await handle(req, res, parsedUrl);
      } catch (err) {
        console.error('[CI Server] Error handling request:', req.url, err);
        res.statusCode = 500;
        res.end('Internal server error');
      }
    });

    // Handle server errors
    server.once('error', (err) => {
      console.error('[CI Server] Server error:', err);
      process.exit(1);
    });

    // Start listening
    server.listen(port, hostname, () => {
      console.log(`[CI Server] Ready on http://${hostname}:${port}`);
      console.log('[CI Server] Health check available at:');
      console.log(`  - http://${hostname}:${port}/api/health`);
      console.log(`  - http://${hostname}:${port}/api/health-ci`);
    });

    // Graceful shutdown
    const shutdown = () => {
      console.log('[CI Server] Shutting down gracefully...');
      server.close(() => {
        console.log('[CI Server] Server closed');
        process.exit(0);
      });
      
      // Force exit after 10 seconds
      setTimeout(() => {
        console.error('[CI Server] Force shutting down');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
  })
  .catch((err) => {
    console.error('[CI Server] Failed to prepare Next.js app:', err);
    process.exit(1);
  });