#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Find all test files
const testFiles = glob.sync('tests/e2e/**/*.spec.ts', {
  cwd: process.cwd()
});

const replacements = [
  // Replace test credentials with demo credentials
  {
    pattern: /test@example\.com/g,
    replacement: 'demo-admin'
  },
  {
    pattern: /test123/g,
    replacement: 'SecureWarehouse2024!'
  },
  // Update setupAndLogin functions to use demo setup properly
  {
    pattern: /await page\.fill\('#emailOrUsername', 'demo-admin'\)/g,
    replacement: `await page.fill('#emailOrUsername', 'demo-admin')`
  },
  {
    pattern: /await page\.fill\('#password', 'SecureWarehouse2024!'\)/g,
    replacement: `await page.fill('#password', 'SecureWarehouse2024!')`
  },
  // Update auth helpers
  {
    pattern: /await emailInput\.fill\('test@example\.com'\)/g,
    replacement: `await emailInput.fill('demo-admin')`
  },
  {
    pattern: /await passwordInput\.fill\('test123'\)/g,
    replacement: `await passwordInput.fill('SecureWarehouse2024!')`
  }
];

let totalFixed = 0;

console.log('Updating test credentials to use demo user...\n');

testFiles.forEach(file => {
  const filePath = path.join(process.cwd(), file);
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  
  replacements.forEach(({ pattern, replacement }) => {
    const before = content;
    content = content.replace(pattern, replacement);
    if (before !== content) {
      modified = true;
    }
  });
  
  if (modified) {
    fs.writeFileSync(filePath, content);
    console.log(`✅ Updated ${file}`);
    totalFixed++;
  }
});

console.log(`\n✅ Updated ${totalFixed} files with correct demo credentials.`);
console.log('\nNote: Demo user credentials:');
console.log('- Username: demo-admin');
console.log('- Password: SecureWarehouse2024!');