#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Find all E2E test files
const testFiles = glob.sync('tests/e2e/**/*.spec.ts');

const replacements = [
  // Fix demo admin credentials
  {
    pattern: /demo-admin/g,
    replacement: 'test@example.com'
  },
  {
    pattern: /SecureWarehouse2024!/g,
    replacement: 'test123'
  },
  // Fix Try Demo button references
  {
    pattern: /await page\.click\('button:has-text\("Try Demo"\)'\)/g,
    replacement: `await page.fill('input[name="emailOrUsername"]', 'test@example.com')
    await page.fill('input[name="password"]', 'test123')
    await page.click('button[type="submit"]')`
  },
  // Fix relative URLs
  {
    pattern: /await page\.goto\('\/'/g,
    replacement: "await page.goto('http://localhost:3000/'"
  },
  {
    pattern: /await page\.goto\("\/"(?!\w)/g,
    replacement: 'await page.goto("http://localhost:3000/"'
  },
  // Fix BASE_URL + path
  {
    pattern: /\$\{BASE_URL\}\/auth\/login/g,
    replacement: '${BASE_URL}/auth/login'
  }
];

let totalReplacements = 0;

testFiles.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let modified = false;
  
  replacements.forEach(({ pattern, replacement }) => {
    const matches = content.match(pattern);
    if (matches) {
      content = content.replace(pattern, replacement);
      modified = true;
      totalReplacements += matches.length;
      console.log(`Fixed ${matches.length} occurrences in ${path.basename(file)}`);
    }
  });
  
  if (modified) {
    fs.writeFileSync(file, content);
  }
});

console.log(`\nTotal replacements made: ${totalReplacements}`);