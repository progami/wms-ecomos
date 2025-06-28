const puppeteer = require('puppeteer');

// All pages from the file system scan
const pages = [
  // Root pages
  { path: '/', name: 'Home Page' },
  { path: '/dashboard', name: 'Dashboard' },
  { path: '/reports', name: 'Reports' },
  { path: '/unauthorized', name: 'Unauthorized' },
  
  // Test pages
  { path: '/test', name: 'Test' },
  { path: '/test-basic', name: 'Test Basic' },
  { path: '/test-client', name: 'Test Client' },
  { path: '/test-error', name: 'Test Error' },
  { path: '/test-minimal', name: 'Test Minimal' },
  
  // Auth pages
  { path: '/auth/login', name: 'Login' },
  { path: '/auth/error', name: 'Auth Error' },
  
  // Admin pages
  { path: '/admin/dashboard', name: 'Admin Dashboard' },
  { path: '/admin/inventory', name: 'Admin Inventory' },
  { path: '/admin/inventory/new', name: 'Admin New Inventory' },
  { path: '/admin/invoices', name: 'Admin Invoices' },
  { path: '/admin/reports', name: 'Admin Reports' },
  { path: '/admin/settings', name: 'Admin Settings' },
  { path: '/admin/settings/general', name: 'Admin General Settings' },
  { path: '/admin/settings/database', name: 'Admin Database Settings' },
  { path: '/admin/settings/notifications', name: 'Admin Notifications Settings' },
  { path: '/admin/settings/security', name: 'Admin Security Settings' },
  { path: '/admin/users', name: 'Admin Users' },
  
  // Analytics
  { path: '/analytics', name: 'Analytics' },
  
  // Config pages
  { path: '/config', name: 'Config' },
  { path: '/config/products', name: 'Products Config' },
  { path: '/config/products/new', name: 'New Product' },
  { path: '/config/products/1/edit', name: 'Edit Product' },
  { path: '/config/locations', name: 'Locations Config' },
  { path: '/config/locations/new', name: 'New Location' },
  { path: '/config/locations/1/edit', name: 'Edit Location' },
  { path: '/config/rates', name: 'Rates Config' },
  { path: '/config/rates/new', name: 'New Rate' },
  { path: '/config/rates/1/edit', name: 'Edit Rate' },
  { path: '/config/warehouse-configs', name: 'Warehouse Configs' },
  { path: '/config/warehouse-configs/new', name: 'New Warehouse Config' },
  { path: '/config/warehouse-configs/1/edit', name: 'Edit Warehouse Config' },
  { path: '/config/invoice-templates', name: 'Invoice Templates' },
  
  // Finance pages
  { path: '/finance', name: 'Finance' },
  { path: '/finance/dashboard', name: 'Finance Dashboard' },
  { path: '/finance/cost-ledger', name: 'Cost Ledger' },
  { path: '/finance/storage-ledger', name: 'Storage Ledger' },
  { path: '/finance/invoices', name: 'Invoices' },
  { path: '/finance/invoices/new', name: 'New Invoice' },
  { path: '/finance/invoices/1', name: 'View Invoice' },
  { path: '/finance/invoices/1/edit', name: 'Edit Invoice' },
  { path: '/finance/reconciliation', name: 'Reconciliation' },
  { path: '/finance/reports', name: 'Finance Reports' },
  
  // Operations pages
  { path: '/operations', name: 'Operations' },
  { path: '/operations/inventory', name: 'Inventory' },
  { path: '/operations/receive', name: 'Receive' },
  { path: '/operations/ship', name: 'Ship' },
  { path: '/operations/shipment-planning', name: 'Shipment Planning' },
  { path: '/operations/transactions', name: 'Transactions' },
  { path: '/operations/transactions/1', name: 'Transaction Detail' },
  { path: '/operations/pallet-variance', name: 'Pallet Variance' },
  { path: '/operations/batch-attributes', name: 'Batch Attributes' },
  
  // Integrations
  { path: '/integrations/amazon', name: 'Amazon Integration' }
];

async function checkEveryRoute() {
  console.log('=== CHECKING ALL ROUTES ===\n');
  console.log(`Total routes to check: ${pages.length}\n`);
  
  const browser = await puppeteer.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const results = [];
  
  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    process.stdout.write(`[${i + 1}/${pages.length}] Checking ${page.name} (${page.path})...`);
    
    const browserPage = await browser.newPage();
    
    // Collect console messages
    const errors = [];
    const warnings = [];
    
    browserPage.on('console', (msg) => {
      const type = msg.type();
      const text = msg.text();
      
      if (type === 'error' && 
          !text.includes('Failed to load resource: the server responded with a status of 401') &&
          !text.includes('Failed to load resource: the server responded with a status of 404')) {
        errors.push(text);
      } else if (type === 'warning') {
        warnings.push(text);
      }
    });
    
    browserPage.on('pageerror', (error) => {
      errors.push(`Page error: ${error.message}`);
    });
    
    try {
      const response = await browserPage.goto(`http://localhost:3002${page.path}`, {
        waitUntil: 'domcontentloaded',
        timeout: 10000
      });
      
      // Wait for any async errors
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const status = response.status();
      const hasErrors = errors.length > 0;
      
      if (hasErrors) {
        process.stdout.write(` ❌ ERRORS\n`);
        errors.forEach(err => console.log(`    ERROR: ${err}`));
      } else if (status >= 400 && status < 600) {
        process.stdout.write(` ⚠️  HTTP ${status}\n`);
      } else {
        process.stdout.write(` ✅ CHECKED\n`);
      }
      
      results.push({
        path: page.path,
        name: page.name,
        status,
        errors,
        checked: true
      });
      
    } catch (error) {
      process.stdout.write(` ❌ FAILED\n`);
      console.log(`    ERROR: ${error.message}`);
      
      results.push({
        path: page.path,
        name: page.name,
        error: error.message,
        checked: false
      });
    }
    
    await browserPage.close();
  }
  
  await browser.close();
  
  // Summary
  console.log('\n\n=== SUMMARY ===\n');
  
  const successful = results.filter(r => r.checked && r.errors.length === 0);
  const withErrors = results.filter(r => r.errors && r.errors.length > 0);
  const failed = results.filter(r => !r.checked);
  
  console.log(`Total routes: ${results.length}`);
  console.log(`✅ Successful: ${successful.length}`);
  console.log(`❌ With errors: ${withErrors.length}`);
  console.log(`❌ Failed to load: ${failed.length}`);
  
  if (withErrors.length > 0) {
    console.log('\n\nRoutes with errors:');
    withErrors.forEach(r => {
      console.log(`- ${r.name} (${r.path})`);
      r.errors.forEach(err => console.log(`  ${err}`));
    });
  }
  
  if (failed.length > 0) {
    console.log('\n\nFailed routes:');
    failed.forEach(r => {
      console.log(`- ${r.name} (${r.path}): ${r.error}`);
    });
  }
}

checkEveryRoute().catch(console.error);