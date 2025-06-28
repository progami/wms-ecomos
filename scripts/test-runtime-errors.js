const playwright = require('playwright');

const pages = [
  // Test pages
  '/test-minimal',
  '/test-basic', 
  '/test-client',
  
  // Auth pages
  '/auth/login',
  
  // Main pages
  '/',
  '/dashboard',
  
  // Operations pages
  '/operations/receive',
  '/operations/ship',
  '/operations/inventory',
  '/operations/batch-attributes',
  '/operations/shipment-planning',
  
  // Finance pages
  '/finance/reconciliation',
  '/finance/invoices',
  
  // Config pages
  '/config/products',
  
  // Admin pages
  '/admin/settings',
  '/admin/users',
  '/admin/invoices',
  
  // Reports
  '/reports',
];

async function testPageForErrors(page, url) {
  const errors = [];
  const consoleErrors = [];
  
  // Listen for page errors
  page.on('pageerror', error => {
    errors.push({
      type: 'pageerror',
      message: error.message,
      stack: error.stack
    });
  });
  
  // Listen for console errors
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push({
        type: 'console.error',
        text: msg.text(),
        location: msg.location()
      });
    }
  });
  
  // Try to navigate to the page
  try {
    const response = await page.goto(`http://localhost:3002${url}`, {
      waitUntil: 'networkidle',
      timeout: 10000
    });
    
    // Wait a bit for any delayed errors
    await page.waitForTimeout(1000);
    
    return {
      url,
      status: response.status(),
      errors,
      consoleErrors,
      success: errors.length === 0 && consoleErrors.length === 0
    };
  } catch (error) {
    return {
      url,
      status: 0,
      errors: [{
        type: 'navigation',
        message: error.message
      }],
      consoleErrors,
      success: false
    };
  }
}

async function runTests() {
  console.log('Starting runtime error tests with Playwright...\n');
  
  const browser = await playwright.chromium.launch({ 
    headless: true 
  });
  
  const context = await browser.newContext({
    ignoreHTTPSErrors: true
  });
  
  const results = [];
  
  for (const pageUrl of pages) {
    const page = await context.newPage();
    process.stdout.write(`Testing ${pageUrl}... `);
    
    const result = await testPageForErrors(page, pageUrl);
    results.push(result);
    
    if (result.success) {
      console.log(`✅ OK (${result.status})`);
    } else {
      console.log(`❌ ERROR (${result.status})`);
      if (result.errors.length > 0) {
        result.errors.forEach(err => {
          console.log(`  Page Error: ${err.message}`);
        });
      }
      if (result.consoleErrors.length > 0) {
        result.consoleErrors.forEach(err => {
          console.log(`  Console Error: ${err.text}`);
        });
      }
    }
    
    await page.close();
  }
  
  await browser.close();
  
  // Summary
  console.log('\n=== SUMMARY ===');
  const failed = results.filter(r => !r.success);
  console.log(`Total pages tested: ${results.length}`);
  console.log(`Pages with errors: ${failed.length}`);
  
  if (failed.length > 0) {
    console.log('\nFAILED PAGES:');
    failed.forEach(f => {
      console.log(`\n${f.url}:`);
      f.errors.forEach(e => console.log(`  - ${e.type}: ${e.message}`));
      f.consoleErrors.forEach(e => console.log(`  - ${e.type}: ${e.text}`));
    });
  }
  
  process.exit(failed.length > 0 ? 1 : 0);
}

// Run the tests
runTests().catch(console.error);