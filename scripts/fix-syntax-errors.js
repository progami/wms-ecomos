#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Find all test files
const testFiles = glob.sync('tests/e2e/**/*.spec.ts', {
  cwd: process.cwd()
});

let totalFixed = 0;

console.log('Fixing syntax errors in E2E tests...\n');

testFiles.forEach(file => {
  const filePath = path.join(process.cwd(), file);
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  
  // Remove extra closing braces after setupDemoAndLogin
  content = content.replace(/}\s*\n\s*}\s*\n\s*\/\/ Test configuration/g, '}\n\n// Test configuration');
  content = content.replace(/}\s*\n\s*}\s*\n\s*test\.describe/g, '}\n\ntest.describe');
  
  // Remove duplicate import in finance-runtime.spec.ts
  if (file.includes('finance-runtime.spec.ts')) {
    content = content.replace(/import { setupDemoAndLogin } from '\.\/utils\/auth-helpers'\n\n/, '');
    modified = true;
  }
  
  // Check if content changed
  if (content !== fs.readFileSync(filePath, 'utf8')) {
    modified = true;
  }
  
  if (modified) {
    fs.writeFileSync(filePath, content);
    console.log(`✅ Fixed ${file}`);
    totalFixed++;
  }
});

console.log(`\n✅ Fixed syntax errors in ${totalFixed} test files.`);