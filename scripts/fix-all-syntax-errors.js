#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Find all test files
const testFiles = glob.sync('tests/e2e/**/*.spec.ts', {
  cwd: process.cwd()
});

let totalFixed = 0;

console.log('Fixing all syntax errors in E2E tests...\n');

testFiles.forEach(file => {
  const filePath = path.join(process.cwd(), file);
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  
  // Special handling for finance-runtime.spec.ts - remove duplicate function
  if (file.includes('finance-runtime.spec.ts')) {
    // Count occurrences of setupDemoAndLogin
    const matches = content.match(/async function setupDemoAndLogin/g);
    if (matches && matches.length > 1) {
      // Keep only the first occurrence
      let firstFound = false;
      content = content.replace(/\/\/ Helper to setup demo and login\s*\n\s*async function setupDemoAndLogin[\s\S]*?\n}\n/g, (match) => {
        if (!firstFound) {
          firstFound = true;
          return match;
        }
        return '';
      });
      modified = true;
    }
  }
  
  // Check if file has unclosed test.describe blocks
  const describeCount = (content.match(/test\.describe\(/g) || []).length;
  const closingBraceCount = (content.match(/^\}\)/gm) || []).length;
  
  if (describeCount > closingBraceCount) {
    // Add missing closing braces at the end of file
    const missingBraces = describeCount - closingBraceCount;
    for (let i = 0; i < missingBraces; i++) {
      content = content.trimEnd() + '\n})';
    }
    modified = true;
  }
  
  // Ensure file ends with newline
  if (!content.endsWith('\n')) {
    content += '\n';
    modified = true;
  }
  
  if (modified) {
    fs.writeFileSync(filePath, content);
    console.log(`✅ Fixed ${file}`);
    totalFixed++;
  }
});

console.log(`\n✅ Fixed syntax errors in ${totalFixed} test files.`);