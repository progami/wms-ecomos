import { chromium } from 'playwright';

async function simpleNavTest() {
  const browser = await chromium.launch({ headless: false }); // Show browser
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    // Login
    await page.goto('http://localhost:3002/auth/login');
    await page.fill('input[name="emailOrUsername"]', 'admin');
    await page.fill('input[name="password"]', 'SecureWarehouse2024!');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard*');
    
    console.log('1. Navigate to /operations/inventory');
    await page.goto('http://localhost:3002/operations/inventory');
    await page.waitForLoadState('networkidle');
    
    console.log('2. Navigate to /operations/transactions/test-123');
    await page.goto('http://localhost:3002/operations/transactions/test-123');
    await page.waitForLoadState('networkidle');
    
    console.log('3. Click Operations breadcrumb');
    // Wait a bit to see the page
    await page.waitForTimeout(2000);
    
    // Find and click the Operations breadcrumb
    const breadcrumbNav = await page.$('nav.flex.items-center.space-x-1.text-sm');
    if (breadcrumbNav) {
      const operationsLink = await breadcrumbNav.$('a:has-text("Operations")');
      if (operationsLink) {
        console.log('   Found Operations link, clicking...');
        await operationsLink.click();
        await page.waitForLoadState('networkidle');
        console.log('   Current URL:', page.url());
      }
    }
    
    console.log('4. Test browser back button');
    await page.goBack();
    await page.waitForTimeout(1000);
    console.log('   After back:', page.url());
    
    await page.goBack();
    await page.waitForTimeout(1000);
    console.log('   After back again:', page.url());
    
    // Keep browser open for inspection
    await page.waitForTimeout(5000);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }
}

simpleNavTest();