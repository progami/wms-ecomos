import { chromium, Browser, Page, BrowserContext } from 'playwright';

interface NavigationResult {
  from: string;
  to: string;
  success: boolean;
  error?: string;
  loadTime?: number;
}

const routes = [
  // Main Dashboard
  { path: '/dashboard', name: 'Dashboard' },
  
  // Operations
  { path: '/operations/receive', name: 'Receive Inventory' },
  { path: '/operations/ship', name: 'Ship Inventory' },
  { path: '/operations/inventory', name: 'Inventory' },
  { path: '/operations/pallet-variance', name: 'Pallet Variance' },
  { path: '/operations/shipment-planning', name: 'Shipment Planning' },
  { path: '/operations/import-attributes', name: 'Import Attributes' },
  
  // Finance
  { path: '/finance/dashboard', name: 'Finance Dashboard' },
  { path: '/finance/invoices', name: 'Invoices' },
  { path: '/finance/reconciliation', name: 'Reconciliation' },
  { path: '/finance/storage-ledger', name: 'Storage Ledger' },
  { path: '/finance/cost-ledger', name: 'Cost Ledger' },
  { path: '/finance/reports', name: 'Finance Reports' },
  
  // Configuration
  { path: '/config/products', name: 'Products (SKUs)' },
  { path: '/config/locations', name: 'Locations' },
  { path: '/config/rates', name: 'Cost Rates' },
  { path: '/config/warehouse-configs', name: 'Warehouse Configs' },
  { path: '/config/batch-attributes', name: 'Batch Attributes' },
  { path: '/config/invoice-templates', name: 'Invoice Templates' },
  
  // Reports
  { path: '/reports', name: 'Reports' },
  { path: '/analytics', name: 'Analytics' },
  
  // Integrations
  { path: '/integrations/amazon', name: 'Amazon Integration' },
  
  // Admin
  { path: '/admin/dashboard', name: 'Admin Dashboard' },
  { path: '/admin/users', name: 'User Management' },
  { path: '/admin/inventory', name: 'Admin Inventory' },
  { path: '/admin/invoices', name: 'Admin Invoices' },
  { path: '/admin/reports', name: 'Admin Reports' },
  { path: '/admin/import-excel', name: 'Import Excel' },
  { path: '/admin/settings', name: 'Settings' },
];

async function loginAsAdmin(page: Page): Promise<void> {
  await page.goto('http://localhost:3002/auth/login');
  await page.fill('input[name="emailOrUsername"]', 'admin');
  await page.fill('input[name="password"]', 'SecureWarehouse2024!');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard', { timeout: 10000 });
}

async function testNavigation(page: Page, from: string, to: string): Promise<NavigationResult> {
  const startTime = Date.now();
  const result: NavigationResult = { from, to, success: false };
  
  try {
    // Navigate to target route
    await page.goto(`http://localhost:3002${to}`, { 
      waitUntil: 'networkidle',
      timeout: 15000 
    });
    
    // Wait for page to be fully loaded
    await page.waitForLoadState('domcontentloaded');
    
    // Check if we're on the correct page
    const currentUrl = page.url();
    if (currentUrl.includes('/auth/login')) {
      throw new Error('Redirected to login page - authentication issue');
    }
    
    // Check for error messages
    const errorElement = await page.$('text=/error|failed|not found|unauthorized/i');
    if (errorElement) {
      const errorText = await errorElement.textContent();
      throw new Error(`Page contains error: ${errorText}`);
    }
    
    result.success = true;
    result.loadTime = Date.now() - startTime;
    
  } catch (error) {
    result.success = false;
    result.error = error instanceof Error ? error.message : String(error);
  }
  
  return result;
}

async function testBackForwardNavigation(page: Page): Promise<void> {
  console.log('\\n🔄 Testing Back/Forward Navigation...');
  
  // Navigate through a sequence of pages
  const sequence = [
    '/dashboard',
    '/operations/inventory',
    '/finance/invoices',
    '/config/products',
    '/reports'
  ];
  
  // Navigate forward through sequence
  for (const path of sequence) {
    await page.goto(`http://localhost:3002${path}`);
    await page.waitForLoadState('networkidle');
    console.log(`  ✓ Navigated to ${path}`);
  }
  
  // Test browser back button
  console.log('\\n  Testing browser back button...');
  for (let i = sequence.length - 2; i >= 0; i--) {
    await page.goBack();
    await page.waitForLoadState('networkidle');
    const currentUrl = page.url();
    const expectedPath = sequence[i];
    if (currentUrl.includes(expectedPath)) {
      console.log(`  ✓ Back navigation to ${expectedPath} successful`);
    } else {
      console.log(`  ✗ Back navigation failed. Expected ${expectedPath}, got ${currentUrl}`);
    }
  }
  
  // Test browser forward button
  console.log('\\n  Testing browser forward button...');
  for (let i = 1; i < sequence.length; i++) {
    await page.goForward();
    await page.waitForLoadState('networkidle');
    const currentUrl = page.url();
    const expectedPath = sequence[i];
    if (currentUrl.includes(expectedPath)) {
      console.log(`  ✓ Forward navigation to ${expectedPath} successful`);
    } else {
      console.log(`  ✗ Forward navigation failed. Expected ${expectedPath}, got ${currentUrl}`);
    }
  }
}

async function main() {
  let browser: Browser | null = null;
  let context: BrowserContext | null = null;
  
  try {
    console.log('🚀 Starting Navigation Test...');
    console.log('📍 Testing on: http://localhost:3002');
    console.log('👤 Using admin credentials\\n');
    
    browser = await chromium.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    context = await browser.newContext({
      viewport: { width: 1280, height: 720 }
    });
    
    const page = await context.newPage();
    
    // Login
    console.log('🔐 Logging in as admin...');
    await loginAsAdmin(page);
    console.log('✓ Login successful\\n');
    
    // Test all routes
    console.log('🧭 Testing all routes...');
    const results: NavigationResult[] = [];
    
    for (let i = 0; i < routes.length; i++) {
      const route = routes[i];
      const fromRoute = i === 0 ? '/dashboard' : routes[i - 1].path;
      
      process.stdout.write(`Testing ${route.name} (${route.path})... `);
      const result = await testNavigation(page, fromRoute, route.path);
      results.push(result);
      
      if (result.success) {
        console.log(`✓ (${result.loadTime}ms)`);
      } else {
        console.log(`✗ ${result.error}`);
      }
      
      // Small delay between navigations
      await page.waitForTimeout(500);
    }
    
    // Test back/forward navigation
    await testBackForwardNavigation(page);
    
    // Summary
    console.log('\\n📊 Navigation Test Summary:');
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    
    console.log(`  ✓ Successful: ${successful}/${routes.length}`);
    console.log(`  ✗ Failed: ${failed}/${routes.length}`);
    
    if (failed > 0) {
      console.log('\\n❌ Failed Routes:');
      results.filter(r => !r.success).forEach(r => {
        const route = routes.find(route => route.path === r.to);
        console.log(`  - ${route?.name} (${r.to}): ${r.error}`);
      });
    }
    
    // Test navigation menu links
    console.log('\\n🔗 Testing Navigation Menu Links...');
    await page.goto('http://localhost:3002/dashboard');
    
    // Check if navigation menu exists
    const navMenu = await page.$('nav');
    if (navMenu) {
      const links = await page.$$('nav a');
      console.log(`  Found ${links.length} navigation links`);
      
      // Test a few key navigation links
      const testLinks = [
        { text: 'Dashboard', expectedUrl: '/dashboard' },
        { text: 'Inventory', expectedUrl: '/operations/inventory' },
        { text: 'Invoices', expectedUrl: '/finance/invoices' },
        { text: 'Reports', expectedUrl: '/reports' }
      ];
      
      for (const testLink of testLinks) {
        const link = await page.$(`nav a:has-text("${testLink.text}")`);
        if (link) {
          await link.click();
          await page.waitForLoadState('networkidle');
          const currentUrl = page.url();
          if (currentUrl.includes(testLink.expectedUrl)) {
            console.log(`  ✓ Navigation link "${testLink.text}" works correctly`);
          } else {
            console.log(`  ✗ Navigation link "${testLink.text}" failed - expected ${testLink.expectedUrl}`);
          }
        } else {
          console.log(`  ⚠️  Navigation link "${testLink.text}" not found`);
        }
      }
    } else {
      console.log('  ⚠️  Navigation menu not found');
    }
    
  } catch (error) {
    console.error('\\n❌ Test failed with error:', error);
  } finally {
    if (context) await context.close();
    if (browser) await browser.close();
  }
}

// Run the test
main().catch(console.error);