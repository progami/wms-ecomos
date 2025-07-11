#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Find all test files
const testFiles = glob.sync('tests/e2e/**/*.spec.ts', {
  cwd: process.cwd()
});

// Simplified helper function that doesn't check status first
const simpleSetupHelper = `// Helper to setup demo and login
async function setupDemoAndLogin(page: any) {
  // Always try to setup demo first (it will check internally if already exists)
  await page.request.post('http://localhost:3000/api/demo/setup');
  
  // Wait for demo setup to complete
  await page.waitForTimeout(2000);
  
  // Navigate to login page
  await page.goto('http://localhost:3000/auth/login');
  
  // Login with demo credentials
  await page.fill('#emailOrUsername', 'demo-admin');
  await page.fill('#password', 'SecureWarehouse2024!');
  await page.click('button[type="submit"]');
  
  // Wait for navigation to dashboard
  await page.waitForURL('**/dashboard', { timeout: 30000 });
  
  // Handle welcome modal if present
  const welcomeModal = page.locator('dialog:has-text("Welcome to WMS Demo!")');
  if (await welcomeModal.isVisible({ timeout: 1000 }).catch(() => false)) {
    const startBtn = page.locator('button:has-text("Start Exploring")');
    if (await startBtn.isVisible()) {
      await startBtn.click();
      await welcomeModal.waitFor({ state: 'hidden', timeout: 5000 });
    }
  }
}`;

let totalFixed = 0;

console.log('Simplifying demo setup in E2E tests...\n');

testFiles.forEach(file => {
  const filePath = path.join(process.cwd(), file);
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  
  // Skip demo-functionality test
  if (file.includes('demo-functionality.spec.ts')) {
    return;
  }
  
  // Remove old helper functions
  const patterns = [
    /\/\/ Helper to ensure demo is set up before login[\s\S]*?^}/gm,
    /async function ensureDemoSetup[\s\S]*?^}/gm,
    /\/\/ Helper to setup demo and login[\s\S]*?^async function setupDemoAndLogin[\s\S]*?^\s*}\s*}/gm
  ];
  
  patterns.forEach(pattern => {
    content = content.replace(pattern, '');
  });
  
  // Check if file needs the helper
  if (content.includes('setupDemoAndLogin') && !content.includes('async function setupDemoAndLogin')) {
    // Add helper after imports
    const importMatch = content.match(/(import[\s\S]*?)\n\n/);
    if (importMatch) {
      const afterImports = importMatch[0] + simpleSetupHelper + '\n\n';
      content = content.replace(importMatch[0], afterImports);
      modified = true;
    } else {
      // If no clear import section, add after first line
      const lines = content.split('\n');
      lines.splice(1, 0, '', simpleSetupHelper, '');
      content = lines.join('\n');
      modified = true;
    }
  }
  
  if (modified) {
    fs.writeFileSync(filePath, content);
    console.log(`✅ Fixed ${file}`);
    totalFixed++;
  }
});

console.log(`\n✅ Simplified demo setup in ${totalFixed} test files.`);