const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Find all route.ts files in the api directory
const apiRouteFiles = glob.sync('src/app/api/**/route.ts', {
  cwd: path.join(__dirname, '..'),
  absolute: true
});

console.log(`Found ${apiRouteFiles.length} API route files to update`);

let updatedCount = 0;

apiRouteFiles.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let updated = false;
  
  // Check if file imports getServerSession from next-auth
  if (content.includes("import { getServerSession } from 'next-auth'")) {
    // Replace the import
    content = content.replace(
      "import { getServerSession } from 'next-auth'",
      "import { getServerSession } from '@/lib/auth-wrapper'"
    );
    updated = true;
  }
  
  // Also check for combined imports
  if (content.includes('next-auth') && content.includes('getServerSession')) {
    const regex = /import\s*{\s*([^}]*)\s*}\s*from\s*['"]next-auth['"]/g;
    const match = regex.exec(content);
    if (match) {
      const imports = match[1].split(',').map(i => i.trim());
      const otherImports = imports.filter(i => i !== 'getServerSession');
      
      if (otherImports.length > 0) {
        // Keep other imports from next-auth
        content = content.replace(
          match[0],
          `import { ${otherImports.join(', ')} } from 'next-auth'\nimport { getServerSession } from '@/lib/auth-wrapper'`
        );
      } else {
        // Replace entirely
        content = content.replace(
          match[0],
          "import { getServerSession } from '@/lib/auth-wrapper'"
        );
      }
      updated = true;
    }
  }
  
  if (updated) {
    fs.writeFileSync(file, content);
    updatedCount++;
    console.log(`✅ Updated: ${path.relative(process.cwd(), file)}`);
  }
});

console.log(`\nUpdated ${updatedCount} files`);