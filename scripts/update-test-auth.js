const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Find all test files in the integration API directory
const testFiles = glob.sync('tests/integration/api/*.test.ts', {
  cwd: path.join(__dirname, '..'),
  absolute: true
});

console.log(`Found ${testFiles.length} test files to update`);

let updatedCount = 0;

testFiles.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let updated = false;
  
  // Skip if already updated
  if (content.includes('test-auth-setup')) {
    console.log(`⏭️  Skipping (already updated): ${path.basename(file)}`);
    return;
  }
  
  // Replace imports
  if (content.includes("jest.mock('next-auth'")) {
    // Remove mock
    content = content.replace(/\/\/ Mock next-auth.*?\n.*?jest\.mock\('next-auth'.*?\}\)\)/s, '');
    updated = true;
  }
  
  // Update imports
  if (content.includes('import request from \'supertest\'')) {
    content = content.replace(
      'import request from \'supertest\'',
      ''
    );
    updated = true;
  }
  
  if (content.includes('createTestSession')) {
    // Add new imports after other imports from test-db
    content = content.replace(
      /import {([^}]+)} from '\.\/setup\/test-db'/,
      (match, imports) => {
        const cleanedImports = imports.split(',')
          .map(i => i.trim())
          .filter(i => i !== 'createTestSession')
          .join(', ');
        return `import { ${cleanedImports} } from './setup/test-db'\nimport { createAuthenticatedRequest, setupTestAuth } from './setup/test-auth-setup'`;
      }
    );
    updated = true;
  }
  
  // Add setup call
  if (!content.includes('setupTestAuth()')) {
    const describeMatch = content.match(/describe\(/);
    if (describeMatch) {
      const insertPos = content.lastIndexOf('\n', describeMatch.index);
      content = content.slice(0, insertPos) + '\n\n// Setup test authentication\nsetupTestAuth()' + content.slice(insertPos);
      updated = true;
    }
  }
  
  // Update describe block
  content = content.replace(
    /let adminSession: any\s*\n\s*let userSession: any/g,
    'let request: ReturnType<typeof createAuthenticatedRequest>'
  );
  
  // Update beforeAll
  content = content.replace(
    /\/\/ Create sessions[\s\S]*?userSession = await createTestSession\([^)]+\)/g,
    '// Create authenticated request helper\n    request = createAuthenticatedRequest(process.env.TEST_SERVER_URL || \'http://localhost:3000\')'
  );
  
  // Remove beforeEach with jest.clearAllMocks if it's the only thing
  content = content.replace(
    /beforeEach\(\(\) => {\s*jest\.clearAllMocks\(\)\s*}\)/g,
    ''
  );
  
  // Update test requests
  content = content.replace(
    /mockGetServerSession\.mockResolvedValue\([^)]+\)\s*\n\s*const response = await request\([^)]+\)\s*\.([a-z]+)\(([^)]+)\)\s*\.set\('Cookie'[^)]+\)/g,
    (match, method, url) => {
      const roleMatch = match.match(/mockResolvedValue\((\w+)Session\)/);
      const role = roleMatch && roleMatch[1] === 'admin' ? 'admin' : 'staff';
      const userId = roleMatch && roleMatch[1] === 'admin' ? 'adminUser.id' : 'regularUser.id';
      return `const response = await request\n        .${method}(${url})\n        .withAuth('${role}', ${userId})`;
    }
  );
  
  if (updated) {
    fs.writeFileSync(file, content);
    updatedCount++;
    console.log(`✅ Updated: ${path.basename(file)}`);
  }
});

console.log(`\nUpdated ${updatedCount} files`);