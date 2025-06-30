#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔍 Verifying production build...\n');

let hasErrors = false;

// Check if .next directory exists
const nextDir = path.join(process.cwd(), '.next');
if (!fs.existsSync(nextDir)) {
  console.error('❌ Build directory .next not found');
  hasErrors = true;
} else {
  console.log('✅ Build directory .next exists');
}

// Check for standalone output
const standaloneDir = path.join(nextDir, 'standalone');
if (!fs.existsSync(standaloneDir)) {
  console.error('❌ Standalone output not found');
  hasErrors = true;
} else {
  console.log('✅ Standalone output exists');
}

// Check for static files
const staticDir = path.join(nextDir, 'static');
if (!fs.existsSync(staticDir)) {
  console.error('❌ Static files directory not found');
  hasErrors = true;
} else {
  console.log('✅ Static files directory exists');
  
  // Check for CSS files
  const cssFiles = fs.readdirSync(staticDir).filter(f => f.includes('css'));
  if (cssFiles.length === 0) {
    console.error('❌ No CSS files found in static directory');
    hasErrors = true;
  } else {
    console.log(`✅ Found ${cssFiles.length} CSS directories`);
  }
}

// Check build manifest
const buildManifest = path.join(nextDir, 'build-manifest.json');
if (!fs.existsSync(buildManifest)) {
  console.error('❌ build-manifest.json not found');
  hasErrors = true;
} else {
  console.log('✅ build-manifest.json exists');
  
  // Verify manifest structure
  try {
    const manifest = JSON.parse(fs.readFileSync(buildManifest, 'utf8'));
    
    // Check for key pages
    const requiredPages = ['/', '/auth/login', '/dashboard'];
    const missingPages = requiredPages.filter(page => !manifest.pages || !manifest.pages[page]);
    
    if (missingPages.length > 0) {
      console.error(`❌ Missing pages in build manifest: ${missingPages.join(', ')}`);
      hasErrors = true;
    } else {
      console.log('✅ All required pages found in build manifest');
    }
    
    // Check bundle sizes
    console.log('\n📊 Bundle Analysis:');
    let totalSize = 0;
    
    for (const [page, assets] of Object.entries(manifest.pages || {})) {
      const jsFiles = assets.filter(asset => asset.endsWith('.js'));
      console.log(`  ${page}: ${jsFiles.length} JS files`);
    }
    
  } catch (error) {
    console.error('❌ Failed to parse build-manifest.json:', error.message);
    hasErrors = true;
  }
}

// Check routes manifest
const routesManifest = path.join(nextDir, 'routes-manifest.json');
if (!fs.existsSync(routesManifest)) {
  console.error('❌ routes-manifest.json not found');
  hasErrors = true;
} else {
  console.log('✅ routes-manifest.json exists');
}

// Check server files
const serverDir = path.join(nextDir, 'server');
if (!fs.existsSync(serverDir)) {
  console.error('❌ Server directory not found');
  hasErrors = true;
} else {
  console.log('✅ Server directory exists');
  
  // Check for pages
  const pagesDir = path.join(serverDir, 'pages');
  if (fs.existsSync(pagesDir)) {
    const pageFiles = fs.readdirSync(pagesDir);
    console.log(`✅ Found ${pageFiles.length} server page files`);
  }
  
  // Check for app directory (App Router)
  const appDir = path.join(serverDir, 'app');
  if (fs.existsSync(appDir)) {
    console.log('✅ App Router directory exists');
  }
}

// Check for required environment files
console.log('\n🔧 Checking configuration:');

const requiredFiles = [
  'package.json',
  'next.config.js',
  'tsconfig.json',
  '.env.production'
];

for (const file of requiredFiles) {
  const filePath = path.join(process.cwd(), file);
  if (!fs.existsSync(filePath)) {
    if (file === '.env.production') {
      console.warn(`⚠️  ${file} not found (optional but recommended)`);
    } else {
      console.error(`❌ ${file} not found`);
      hasErrors = true;
    }
  } else {
    console.log(`✅ ${file} exists`);
  }
}

// Check package.json scripts
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const requiredScripts = ['build', 'start'];
const missingScripts = requiredScripts.filter(script => !packageJson.scripts[script]);

if (missingScripts.length > 0) {
  console.error(`❌ Missing scripts in package.json: ${missingScripts.join(', ')}`);
  hasErrors = true;
} else {
  console.log('✅ All required scripts found in package.json');
}

// Summary
console.log('\n📋 Build Verification Summary:');
if (hasErrors) {
  console.error('❌ Build verification failed. Please fix the errors above.');
  process.exit(1);
} else {
  console.log('✅ Build verification passed! Ready for production deployment.');
  
  // Print build size summary
  try {
    const nextBuildSize = path.join(nextDir, '.next-size.json');
    if (fs.existsSync(nextBuildSize)) {
      const sizeData = JSON.parse(fs.readFileSync(nextBuildSize, 'utf8'));
      console.log('\n📦 Build Size Summary:');
      console.log(`  Total Size: ${(sizeData.totalSize / 1024 / 1024).toFixed(2)} MB`);
    }
  } catch (error) {
    // Size file might not exist, that's ok
  }
}