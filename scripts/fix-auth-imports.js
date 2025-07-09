const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Find all TypeScript files that import from auth-wrapper
const files = glob.sync('src/**/*.{ts,tsx}', {
  cwd: process.cwd()
});

let updatedCount = 0;

files.forEach(file => {
  const filePath = path.join(process.cwd(), file);
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Check if file imports from auth-wrapper
  if (content.includes("from '@/lib/auth-wrapper'") || content.includes('from "@/lib/auth-wrapper"')) {
    // Replace the import
    content = content.replace(
      /import\s*{\s*getServerSession\s*}\s*from\s*['"]@\/lib\/auth-wrapper['"]/g,
      "import { getServerSession } from 'next-auth'"
    );
    
    // Check if file also needs to import authOptions
    if (content.includes('getServerSession(') && !content.includes('authOptions')) {
      // Add authOptions import if not already present
      if (!content.includes("from '@/lib/auth'") && !content.includes('from "@/lib/auth"')) {
        // Find the next-auth import line and add authOptions import after it
        content = content.replace(
          /import\s*{\s*getServerSession\s*}\s*from\s*'next-auth'/,
          "import { getServerSession } from 'next-auth'\nimport { authOptions } from '@/lib/auth'"
        );
      }
    }
    
    // Update getServerSession calls to include authOptions
    // Match patterns like getServerSession() or getServerSession(req, res)
    content = content.replace(
      /getServerSession\(\s*\)/g,
      'getServerSession(authOptions)'
    );
    
    // For cases with req, res parameters
    content = content.replace(
      /getServerSession\(\s*(req|request)\s*,\s*(res|response)\s*\)/g,
      'getServerSession($1, $2, authOptions)'
    );
    
    fs.writeFileSync(filePath, content);
    updatedCount++;
    console.log(`Updated: ${file}`);
  }
});

console.log(`\nTotal files updated: ${updatedCount}`);