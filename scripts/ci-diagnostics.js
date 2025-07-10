#!/usr/bin/env node

/**
 * CI Diagnostics Script
 * Helps diagnose common issues in CI environments
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('=== CI Diagnostics ===\n');

// 1. Check environment variables
console.log('1. Environment Variables:');
const requiredEnvVars = [
  'DATABASE_URL',
  'REDIS_URL',
  'NEXTAUTH_URL',
  'NEXTAUTH_SECRET',
  'NODE_ENV',
  'CI',
  'USE_TEST_AUTH'
];

requiredEnvVars.forEach(varName => {
  const value = process.env[varName];
  if (value) {
    console.log(`  ✓ ${varName}: ${varName.includes('SECRET') ? '[SET]' : value}`);
  } else {
    console.log(`  ✗ ${varName}: [NOT SET]`);
  }
});

console.log('\n2. Node.js Information:');
console.log(`  Node version: ${process.version}`);
console.log(`  NPM version: ${execSync('npm --version').toString().trim()}`);
console.log(`  Current directory: ${process.cwd()}`);

console.log('\n3. Build Artifacts:');
const checkPath = (p, description) => {
  const fullPath = path.join(process.cwd(), p);
  const exists = fs.existsSync(fullPath);
  console.log(`  ${exists ? '✓' : '✗'} ${description}: ${p}`);
  if (exists && fs.statSync(fullPath).isDirectory()) {
    const files = fs.readdirSync(fullPath);
    console.log(`    Contains: ${files.length} items`);
    if (files.length < 10) {
      files.forEach(f => console.log(`      - ${f}`));
    }
  }
  return exists;
};

checkPath('.next', '.next directory');
checkPath('.next/server', '.next/server directory');
checkPath('.next/static', '.next/static directory');
checkPath('node_modules/.prisma', 'Prisma client');
checkPath('prisma/schema.prisma', 'Prisma schema');

console.log('\n4. Package.json Scripts:');
try {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const ciScripts = Object.entries(packageJson.scripts)
    .filter(([name]) => name.includes('ci') || name.includes('start') || name.includes('build'))
    .map(([name, script]) => `  - ${name}: ${script.substring(0, 80)}...`);
  console.log(ciScripts.join('\n'));
} catch (err) {
  console.log('  Failed to read package.json');
}

console.log('\n5. Database Connectivity:');
try {
  if (process.env.DATABASE_URL) {
    execSync('npx prisma db execute --stdin <<< "SELECT 1"', { stdio: 'pipe' });
    console.log('  ✓ Database connection successful');
  } else {
    console.log('  ✗ DATABASE_URL not set');
  }
} catch (err) {
  console.log('  ✗ Database connection failed:', err.message);
}

console.log('\n6. Port Availability:');
const checkPort = (port) => {
  try {
    execSync(`lsof -i:${port}`, { stdio: 'pipe' });
    console.log(`  ✗ Port ${port} is already in use`);
    return false;
  } catch {
    console.log(`  ✓ Port ${port} is available`);
    return true;
  }
};
checkPort(3000);

console.log('\n7. Next.js Configuration:');
const configs = ['next.config.js', 'next.config.ci.js'];
configs.forEach(config => {
  if (fs.existsSync(config)) {
    console.log(`  ✓ ${config} exists`);
    const content = fs.readFileSync(config, 'utf8');
    const hasStandalone = content.includes("output: 'standalone'") && !content.includes("// output: 'standalone'");
    console.log(`    Standalone output: ${hasStandalone ? 'Enabled' : 'Disabled'}`);
  } else {
    console.log(`  ✗ ${config} not found`);
  }
});

console.log('\n=== End of Diagnostics ===');