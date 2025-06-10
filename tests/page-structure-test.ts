import * as fs from 'fs';
import * as path from 'path';

const appDir = path.join(process.cwd(), 'src/app');

function findPages(dir: string, basePath: string = ''): string[] {
  const pages: string[] = [];
  
  try {
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        // Recurse into all directories
        const subPages = findPages(fullPath, path.join(basePath, item));
        pages.push(...subPages);
      } else if (item === 'page.tsx' || item === 'page.ts' || item === 'route.ts' || item === 'route.tsx') {
        const routePath = basePath || '/';
        const isApiRoute = item.includes('route.');
        pages.push(isApiRoute ? `${routePath} (API)` : routePath);
      }
    }
  } catch (error) {
    console.error(`Error reading directory ${dir}:`, error);
  }
  
  return pages;
}

console.log('📁 Page Structure Analysis');
console.log('==========================\n');

const pages = findPages(appDir).sort();

console.log('Found pages:');
pages.forEach(page => {
  // Check if it's a dynamic route
  const isDynamic = page.includes('[');
  const marker = isDynamic ? '🔄' : '📄';
  console.log(`${marker} ${page}`);
});

console.log(`\nTotal: ${pages.length} pages`);

// Check for missing index pages
console.log('\n🔍 Checking for missing index pages...\n');

const directories = new Set<string>();
pages.forEach(page => {
  const parts = page.split('/').filter(Boolean);
  for (let i = 0; i < parts.length; i++) {
    if (!parts[i].includes('[')) {
      const dir = '/' + parts.slice(0, i + 1).join('/');
      directories.add(dir);
    }
  }
});

const missingIndexPages: string[] = [];
directories.forEach(dir => {
  if (dir !== '/' && !pages.includes(dir)) {
    missingIndexPages.push(dir);
  }
});

if (missingIndexPages.length > 0) {
  console.log('Missing index pages (might cause 404s):');
  missingIndexPages.forEach(page => {
    console.log(`❌ ${page}/page.tsx`);
  });
} else {
  console.log('✅ All directories have index pages');
}

// Check for API routes
console.log('\n📡 API Routes:');
const apiDir = path.join(appDir, 'api');
const apiRoutes = findPages(apiDir, '/api').filter(r => r !== '/api');
console.log(`Found ${apiRoutes.length} API routes`);

// List dynamic routes
console.log('\n🔄 Dynamic Routes:');
const dynamicRoutes = pages.filter(p => p.includes('['));
dynamicRoutes.forEach(route => {
  console.log(`- ${route}`);
});