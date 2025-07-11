#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Find all test files
const testFiles = glob.sync('tests/e2e/**/*.spec.ts', {
  cwd: process.cwd()
});

let totalFixed = 0;

console.log('Fixing final syntax errors in E2E tests...\n');

// Specific fixes for known issues
const specificFixes = {
  'finance-runtime.spec.ts': (content) => {
    // Remove duplicate setupDemoAndLogin function
    const lines = content.split('\n');
    const functionStarts = [];
    
    lines.forEach((line, index) => {
      if (line.includes('async function setupDemoAndLogin')) {
        functionStarts.push(index);
      }
    });
    
    if (functionStarts.length > 1) {
      // Find the end of the first function
      let braceCount = 0;
      let inFunction = false;
      let endIndex = -1;
      
      for (let i = functionStarts[1] - 2; i < lines.length; i++) {
        const line = lines[i];
        if (line.includes('async function setupDemoAndLogin')) {
          inFunction = true;
        }
        
        if (inFunction) {
          for (const char of line) {
            if (char === '{') braceCount++;
            if (char === '}') braceCount--;
          }
          
          if (braceCount === 0 && line.includes('}')) {
            endIndex = i;
            break;
          }
        }
      }
      
      if (endIndex > 0) {
        // Remove the duplicate function
        lines.splice(functionStarts[1] - 2, endIndex - functionStarts[1] + 3);
      }
    }
    
    return lines.join('\n');
  }
};

testFiles.forEach(file => {
  const filePath = path.join(process.cwd(), file);
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  
  // Apply specific fixes
  const fileName = path.basename(file);
  if (specificFixes[fileName]) {
    content = specificFixes[fileName](content);
    modified = true;
  }
  
  // Count braces to find missing closing braces
  let openBraces = 0;
  let closeBraces = 0;
  const lines = content.split('\n');
  
  lines.forEach(line => {
    // Count opening braces
    openBraces += (line.match(/\{/g) || []).length;
    // Count closing braces  
    closeBraces += (line.match(/\}/g) || []).length;
  });
  
  // If there are more opening than closing braces, add closing braces
  if (openBraces > closeBraces) {
    const missingBraces = openBraces - closeBraces;
    console.log(`${file}: Found ${missingBraces} missing closing braces`);
    
    // Add the missing closing braces at the end
    for (let i = 0; i < missingBraces; i++) {
      content = content.trimEnd() + '\n}';
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

console.log(`\n✅ Fixed final syntax errors in ${totalFixed} test files.`);