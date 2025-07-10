#!/usr/bin/env node

/**
 * CI-specific build script
 * Uses a modified Next.js config that doesn't output standalone
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('[Build CI] Starting CI build process...');

// Backup original next.config.js
const configPath = path.join(process.cwd(), 'next.config.js');
const configBackupPath = path.join(process.cwd(), 'next.config.js.backup');
const ciConfigPath = path.join(process.cwd(), 'next.config.ci.js');

try {
  // Backup original config
  console.log('[Build CI] Backing up original next.config.js...');
  fs.copyFileSync(configPath, configBackupPath);
  
  // Use CI config
  console.log('[Build CI] Using CI-specific configuration...');
  fs.copyFileSync(ciConfigPath, configPath);
  
  // Run the build
  console.log('[Build CI] Running Next.js build...');
  execSync('npm run build', { 
    stdio: 'inherit',
    env: {
      ...process.env,
      CI: 'true',
      NODE_ENV: 'production'
    }
  });
  
  console.log('[Build CI] Build completed successfully!');
  
} catch (error) {
  console.error('[Build CI] Build failed:', error.message);
  process.exit(1);
} finally {
  // Always restore original config
  if (fs.existsSync(configBackupPath)) {
    console.log('[Build CI] Restoring original next.config.js...');
    fs.copyFileSync(configBackupPath, configPath);
    fs.unlinkSync(configBackupPath);
  }
}

// Verify build output
const nextDir = path.join(process.cwd(), '.next');
if (!fs.existsSync(nextDir)) {
  console.error('[Build CI] ERROR: .next directory not found after build!');
  process.exit(1);
}

console.log('[Build CI] Build artifacts verified successfully');