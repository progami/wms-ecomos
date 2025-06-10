import { chromium } from 'playwright';

async function testBreadcrumbNavigation() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    console.log('🧪 Breadcrumb Navigation Test\n');
    
    // Login
    console.log('1. Logging in...');
    await page.goto('http://localhost:3002/auth/login');
    await page.fill('input[name="emailOrUsername"]', 'admin');
    await page.fill('input[name="password"]', 'SecureWarehouse2024!');
    await Promise.all([
      page.waitForURL('**/*dashboard*', { timeout: 10000 }),
      page.click('button[type="submit"]')
    ]);
    console.log('   ✓ Logged in successfully');
    
    // Test 1: Navigate to operations/inventory
    console.log('\n2. Testing /operations/inventory breadcrumb...');
    await page.goto('http://localhost:3002/operations/inventory');
    await page.waitForLoadState('networkidle');
    
    // Check breadcrumb structure - look for the specific breadcrumb nav, not the main nav
    const breadcrumbNav = await page.$('nav.flex.items-center.space-x-1.text-sm');
    if (!breadcrumbNav) {
      console.log('   ✗ Breadcrumb navigation not found');
      return;
    }
    
    const breadcrumbItems = await breadcrumbNav.$$('a, span');
    console.log('   Breadcrumb items found:', breadcrumbItems.length);
    
    // Get breadcrumb text
    const breadcrumbTexts = await Promise.all(
      breadcrumbItems.map(async (item) => {
        const text = await item.textContent();
        const tagName = await item.evaluate(el => el.tagName.toLowerCase());
        const href = tagName === 'a' ? await item.getAttribute('href') : null;
        return { text: text?.trim(), href, tagName };
      })
    );
    
    console.log('   Breadcrumb structure:');
    breadcrumbTexts.forEach(({ text, href, tagName }) => {
      if (href) {
        console.log(`     - "${text}" → ${href} (clickable)`);
      } else if (tagName === 'span') {
        console.log(`     - "${text}" (current page)`);
      }
    });
    
    // Test 2: Navigate to a transaction detail page
    console.log('\n3. Testing /operations/transactions/[id] breadcrumb...');
    await page.goto('http://localhost:3002/operations/transactions/TRX-FMC-1234567890-0');
    await page.waitForLoadState('networkidle');
    
    // Find "Operations" breadcrumb link in the breadcrumb nav specifically
    const breadcrumbNav2 = await page.$('nav.flex.items-center.space-x-1.text-sm');
    const operationsBreadcrumb = breadcrumbNav2 ? await breadcrumbNav2.$('a:has-text("Operations")') : null;
    if (operationsBreadcrumb) {
      console.log('   ✓ Found "Operations" breadcrumb link');
      
      // Click it
      await operationsBreadcrumb.click();
      await page.waitForLoadState('networkidle');
      const afterClickUrl = page.url();
      console.log(`   ✓ Clicked "Operations", navigated to: ${afterClickUrl}`);
      
      // Verify we're at /operations
      if (afterClickUrl === 'http://localhost:3002/operations') {
        console.log('   ✓ Successfully navigated to /operations');
      } else {
        console.log('   ⚠️  Did not navigate to expected /operations URL');
      }
    } else {
      console.log('   ✗ "Operations" breadcrumb not found');
    }
    
    // Test 3: Browser back button from transaction page
    console.log('\n4. Testing browser back from transaction page...');
    await page.goto('http://localhost:3002/operations/inventory');
    await page.waitForLoadState('networkidle');
    console.log('   At: /operations/inventory');
    
    await page.goto('http://localhost:3002/operations/transactions/test-123');
    await page.waitForLoadState('networkidle');
    console.log('   Navigated to: /operations/transactions/test-123');
    
    await page.goBack();
    await page.waitForLoadState('networkidle');
    const afterBackUrl = page.url();
    console.log(`   ✓ Back button pressed, now at: ${afterBackUrl}`);
    
    if (afterBackUrl.includes('/operations/inventory')) {
      console.log('   ✓ Successfully returned to inventory page');
    } else {
      console.log('   ⚠️  Did not return to inventory page');
    }
    
    // Test 4: Test nested navigation
    console.log('\n5. Testing nested breadcrumb navigation...');
    const testPaths = [
      '/operations',
      '/operations/receive',
      '/operations/inventory',
      '/operations/transactions/123',
      '/finance',
      '/finance/invoices',
      '/finance/invoices/456',
      '/config',
      '/config/products',
      '/config/products/789/edit'
    ];
    
    for (const path of testPaths) {
      await page.goto(`http://localhost:3002${path}`);
      await page.waitForLoadState('networkidle');
      
      const breadcrumbNavTest = await page.$('nav.flex.items-center.space-x-1.text-sm');
      if (breadcrumbNavTest) {
        const breadcrumbText = await breadcrumbNavTest.textContent();
        console.log(`   ${path}: ${breadcrumbText?.trim()}`);
      } else {
        console.log(`   ${path}: No breadcrumb found`);
      }
    }
    
    console.log('\n✅ Breadcrumb navigation test completed!');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error);
  } finally {
    await browser.close();
  }
}

testBreadcrumbNavigation();