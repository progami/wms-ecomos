#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Find all test files
const testFiles = glob.sync('tests/e2e/**/*.spec.ts', {
  cwd: process.cwd()
});

// Helper function template to ensure demo is set up
const demoSetupHelper = `
// Helper to ensure demo is set up before login
async function ensureDemoSetup(page: any) {
  // Check if demo is already set up
  const response = await page.request.get('http://localhost:3000/api/demo/status');
  const status = await response.json();
  
  if (!status.isDemoMode) {
    // Setup demo if not already done
    await page.request.post('http://localhost:3000/api/demo/setup');
    // Wait for demo setup to complete
    await page.waitForTimeout(2000);
  }
}

// Helper to setup demo and login
async function setupDemoAndLogin(page: any) {
  await ensureDemoSetup(page);
  
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
}
`;

let totalFixed = 0;

console.log('Fixing E2E tests to ensure demo setup before login...\n');

testFiles.forEach(file => {
  const filePath = path.join(process.cwd(), file);
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  
  // Skip test files that already have proper demo setup
  if (content.includes('ensureDemoSetup') || file.includes('demo-functionality.spec.ts')) {
    return;
  }
  
  // Check if file has a setupAndLogin function
  if (content.includes('setupAndLogin')) {
    // Replace existing setupAndLogin with our version
    const setupRegex = /\/\/ Helper to setup demo and login[\s\S]*?^}/gm;
    const oldSetupRegex = /async function setupAndLogin[\s\S]*?^}/gm;
    
    if (setupRegex.test(content) || oldSetupRegex.test(content)) {
      content = content.replace(setupRegex, '');
      content = content.replace(oldSetupRegex, '');
      modified = true;
    }
  }
  
  // Check if file needs login setup
  if (content.includes('test.beforeEach') && content.includes('login')) {
    // Add helper functions after imports
    const importMatch = content.match(/(import[\s\S]*?)\n\n/);
    if (importMatch) {
      const afterImports = importMatch[0] + demoSetupHelper + '\n';
      content = content.replace(importMatch[0], afterImports);
      modified = true;
    }
    
    // Replace direct login attempts with setupDemoAndLogin
    content = content.replace(
      /await page\.goto\(['"`].*?\/auth\/login['"`]\);?\s*\n\s*await page\.fill\(['"`]#emailOrUsername['"`],.*?\);?\s*\n\s*await page\.fill\(['"`]#password['"`],.*?\);?\s*\n\s*await page\.click\(['"`]button\[type="submit"\]['"`]\);?/g,
      'await setupDemoAndLogin(page);'
    );
    
    // Replace setupAndLogin calls with setupDemoAndLogin
    content = content.replace(/await setupAndLogin\(page\)/g, 'await setupDemoAndLogin(page)');
    
    modified = true;
  }
  
  if (modified) {
    fs.writeFileSync(filePath, content);
    console.log(`✅ Fixed ${file}`);
    totalFixed++;
  }
});

console.log(`\n✅ Fixed ${totalFixed} test files to ensure demo setup before login.`);