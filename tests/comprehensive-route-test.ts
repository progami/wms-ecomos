import { chromium, Browser, Page, BrowserContext } from 'playwright';

interface RouteTest {
  path: string;
  expectedStatus: 'success' | '404' | 'redirect';
  redirectTo?: string;
  description: string;
}

const routes: RouteTest[] = [
  // Dashboard Routes
  { path: '/dashboard', expectedStatus: 'success', description: 'Staff Dashboard' },
  { path: '/admin/dashboard', expectedStatus: 'success', description: 'Admin Dashboard' },
  
  // Operations Routes
  { path: '/operations', expectedStatus: 'success', description: 'Operations Landing' },
  { path: '/operations/shipment-planning', expectedStatus: 'success', description: 'Shipment Planning' },
  { path: '/operations/inventory', expectedStatus: 'success', description: 'Inventory Ledger' },
  { path: '/operations/receive', expectedStatus: 'success', description: 'Receive Goods' },
  { path: '/operations/ship', expectedStatus: 'success', description: 'Ship Goods' },
  { path: '/operations/import-attributes', expectedStatus: 'success', description: 'Import Attributes' },
  { path: '/operations/pallet-variance', expectedStatus: 'success', description: 'Pallet Variance' },
  { path: '/operations/transactions', expectedStatus: '404', description: 'Transactions Index (should 404)' },
  { path: '/operations/transactions/TRX-FMC-1748563200000-173', expectedStatus: 'success', description: 'Transaction Detail (valid)' },
  { path: '/operations/transactions/invalid-id', expectedStatus: 'redirect', redirectTo: '/operations/inventory', description: 'Transaction Detail (invalid)' },
  
  // Finance Routes
  { path: '/finance', expectedStatus: 'success', description: 'Finance Landing' },
  { path: '/finance/dashboard', expectedStatus: 'success', description: 'Finance Dashboard' },
  { path: '/finance/invoices', expectedStatus: 'success', description: 'Invoices List' },
  { path: '/finance/invoices/new', expectedStatus: 'success', description: 'New Invoice' },
  { path: '/finance/invoices/123', expectedStatus: 'success', description: 'Invoice Detail' },
  { path: '/finance/invoices/123/edit', expectedStatus: '404', description: 'Invoice Edit (should 404)' },
  { path: '/finance/reconciliation', expectedStatus: 'success', description: 'Reconciliation' },
  { path: '/finance/storage-ledger', expectedStatus: 'success', description: 'Storage Ledger' },
  { path: '/finance/cost-ledger', expectedStatus: 'success', description: 'Cost Ledger' },
  { path: '/finance/reports', expectedStatus: 'success', description: 'Finance Reports' },
  
  // Configuration Routes
  { path: '/config', expectedStatus: 'success', description: 'Configuration Landing' },
  { path: '/config/products', expectedStatus: 'success', description: 'Products List' },
  { path: '/config/products/new', expectedStatus: 'success', description: 'New Product' },
  { path: '/config/products/123/edit', expectedStatus: 'success', description: 'Edit Product' },
  { path: '/config/batch-attributes', expectedStatus: 'success', description: 'Batch Attributes' },
  { path: '/config/locations', expectedStatus: 'success', description: 'Locations' },
  { path: '/config/locations/new', expectedStatus: 'success', description: 'New Location' },
  { path: '/config/locations/123/edit', expectedStatus: 'success', description: 'Edit Location' },
  { path: '/config/rates', expectedStatus: 'success', description: 'Cost Rates' },
  { path: '/config/rates/new', expectedStatus: 'success', description: 'New Rate' },
  { path: '/config/rates/123/edit', expectedStatus: 'success', description: 'Edit Rate' },
  { path: '/config/invoice-templates', expectedStatus: 'success', description: 'Invoice Templates' },
  { path: '/config/warehouse-configs', expectedStatus: 'success', description: 'Warehouse Configs' },
  { path: '/config/warehouse-configs/new', expectedStatus: 'success', description: 'New Warehouse Config' },
  { path: '/config/warehouse-configs/123/edit', expectedStatus: 'success', description: 'Edit Warehouse Config' },
  
  // Analytics Routes
  { path: '/reports', expectedStatus: 'success', description: 'Reports' },
  { path: '/analytics', expectedStatus: 'success', description: 'Analytics' },
  { path: '/integrations/amazon', expectedStatus: 'success', description: 'Amazon Integration' },
  
  // Admin Routes
  { path: '/admin/users', expectedStatus: 'success', description: 'User Management' },
  { path: '/admin/settings', expectedStatus: 'success', description: 'Admin Settings' },
  { path: '/admin/settings/general', expectedStatus: 'success', description: 'General Settings' },
  { path: '/admin/settings/notifications', expectedStatus: 'success', description: 'Notification Settings' },
  { path: '/admin/settings/security', expectedStatus: 'success', description: 'Security Settings' },
  { path: '/admin/settings/database', expectedStatus: 'success', description: 'Database Settings' },
  { path: '/admin/settings/warehouses', expectedStatus: 'success', description: 'Warehouse Settings (API route)' },
  { path: '/admin/inventory', expectedStatus: 'success', description: 'Admin Inventory' },
  { path: '/admin/inventory/new', expectedStatus: 'success', description: 'Admin New Inventory' },
  { path: '/admin/invoices', expectedStatus: 'success', description: 'Admin Invoices' },
  { path: '/admin/reports', expectedStatus: 'success', description: 'Admin Reports' },
  { path: '/admin/import-excel', expectedStatus: 'success', description: 'Import Excel' },
  
  // Root and Auth
  { path: '/', expectedStatus: 'redirect', redirectTo: '/admin/dashboard', description: 'Root (admin redirect)' },
  { path: '/auth/login', expectedStatus: 'redirect', redirectTo: '/admin/dashboard', description: 'Login (when authenticated)' },
  
  // Invalid/404 Routes
  { path: '/invalid-route', expectedStatus: '404', description: 'Invalid Route' },
  { path: '/operations/invalid', expectedStatus: '404', description: 'Invalid Operations Route' },
  { path: '/finance/invalid', expectedStatus: '404', description: 'Invalid Finance Route' },
];

async function testRoute(page: Page, route: RouteTest): Promise<{ success: boolean; details: string }> {
  try {
    const response = await page.goto(`http://localhost:3002${route.path}`, {
      waitUntil: 'networkidle',
      timeout: 10000
    });
    
    const status = response?.status() || 0;
    const currentUrl = page.url();
    
    // Check for 404
    if (route.expectedStatus === '404') {
      if (status === 404 || (await page.locator('text=/404|not found/i').count()) > 0) {
        return { success: true, details: 'Got expected 404' };
      } else {
        return { success: false, details: `Expected 404 but got status ${status}` };
      }
    }
    
    // Check for redirect
    if (route.expectedStatus === 'redirect') {
      const expectedUrl = `http://localhost:3002${route.redirectTo}`;
      if (currentUrl === expectedUrl || currentUrl.includes(route.redirectTo!)) {
        return { success: true, details: `Redirected to ${route.redirectTo}` };
      } else {
        return { success: false, details: `Expected redirect to ${route.redirectTo} but at ${currentUrl}` };
      }
    }
    
    // Check for success
    if (route.expectedStatus === 'success') {
      // Check if we're still on the intended page (not redirected to login or error)
      if (currentUrl.includes('/auth/login')) {
        return { success: false, details: 'Redirected to login (auth issue)' };
      }
      
      // Check for error indicators
      const hasError = await page.locator('text=/error|failed|not found|404/i').count() > 0;
      if (hasError) {
        return { success: false, details: 'Page contains error text' };
      }
      
      // Check status code
      if (status >= 200 && status < 400) {
        return { success: true, details: `Status ${status}` };
      } else {
        return { success: false, details: `Unexpected status ${status}` };
      }
    }
    
    return { success: false, details: 'Unknown test condition' };
    
  } catch (error) {
    return { success: false, details: `Error: ${error instanceof Error ? error.message : String(error)}` };
  }
}

async function main() {
  let browser: Browser | null = null;
  let context: BrowserContext | null = null;
  
  try {
    console.log('🚀 Comprehensive Route Testing');
    console.log('================================\n');
    
    browser = await chromium.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    context = await browser.newContext({
      viewport: { width: 1280, height: 720 }
    });
    
    const page = await context.newPage();
    
    // Login as admin
    console.log('🔐 Logging in as admin...');
    await page.goto('http://localhost:3002/auth/login', { waitUntil: 'networkidle' });
    await page.fill('input[name="emailOrUsername"]', 'admin');
    await page.fill('input[name="password"]', 'SecureWarehouse2024!');
    await Promise.all([
      page.waitForURL('**/dashboard*', { timeout: 10000 }),
      page.click('button[type="submit"]')
    ]);
    console.log('✓ Login successful\n');
    
    // Test all routes
    console.log('🧪 Testing all routes...\n');
    
    const results: Array<{ route: RouteTest; success: boolean; details: string }> = [];
    let successCount = 0;
    let failureCount = 0;
    
    for (const route of routes) {
      process.stdout.write(`Testing ${route.description.padEnd(40)} ${route.path.padEnd(50)} `);
      
      const result = await testRoute(page, route);
      results.push({ route, ...result });
      
      if (result.success) {
        console.log(`✅ ${result.details}`);
        successCount++;
      } else {
        console.log(`❌ ${result.details}`);
        failureCount++;
      }
      
      // Small delay between tests
      await page.waitForTimeout(100);
    }
    
    // Summary
    console.log('\n📊 Test Summary');
    console.log('================');
    console.log(`Total routes tested: ${routes.length}`);
    console.log(`✅ Successful: ${successCount}`);
    console.log(`❌ Failed: ${failureCount}`);
    console.log(`Success rate: ${((successCount / routes.length) * 100).toFixed(1)}%`);
    
    // List failures
    if (failureCount > 0) {
      console.log('\n❌ Failed Routes:');
      console.log('==================');
      results
        .filter(r => !r.success)
        .forEach(({ route, details }) => {
          console.log(`- ${route.description} (${route.path})`);
          console.log(`  Expected: ${route.expectedStatus}${route.redirectTo ? ` → ${route.redirectTo}` : ''}`);
          console.log(`  Result: ${details}`);
          console.log('');
        });
    }
    
    // List routes that need fixing
    const needsFix = routes.filter(r => r.expectedStatus === '404');
    if (needsFix.length > 0) {
      console.log('\n🔧 Routes that need fixing:');
      console.log('===========================');
      needsFix.forEach(route => {
        console.log(`- ${route.path} - ${route.description}`);
      });
    }
    
  } catch (error) {
    console.error('\n❌ Test suite failed:', error);
  } finally {
    if (context) await context.close();
    if (browser) await browser.close();
  }
}

// Run the test
main().catch(console.error);