import { chromium } from 'playwright';

async function testTransactionNavigation() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    console.log('🧪 Transaction Navigation Test\n');
    
    // Login first
    console.log('1. Logging in...');
    await page.goto('http://localhost:3002/auth/login');
    await page.fill('input[name="emailOrUsername"]', 'admin');
    await page.fill('input[name="password"]', 'SecureWarehouse2024!');
    await Promise.all([
      page.waitForURL('**/*dashboard*', { timeout: 10000 }),
      page.click('button[type="submit"]')
    ]);
    console.log('   ✓ Logged in successfully');
    
    // Navigate to operations/inventory
    console.log('\n2. Navigating to Inventory...');
    await page.goto('http://localhost:3002/operations/inventory');
    await page.waitForLoadState('networkidle');
    console.log('   ✓ At inventory page: ' + page.url());
    
    // Try to find a transaction link and click it
    console.log('\n3. Looking for transaction links...');
    const transactionLink = await page.$('a[href*="/operations/transactions/"]');
    
    if (transactionLink) {
      await transactionLink.click();
      await page.waitForLoadState('networkidle');
      const transactionUrl = page.url();
      console.log('   ✓ Clicked transaction, now at: ' + transactionUrl);
      
      // Test browser back button
      console.log('\n4. Testing browser back button...');
      await page.goBack();
      await page.waitForLoadState('networkidle');
      const afterBackUrl = page.url();
      console.log('   ✓ Back button pressed, now at: ' + afterBackUrl);
      
      // Verify we're back at inventory
      if (afterBackUrl.includes('/operations/inventory')) {
        console.log('   ✓ Successfully returned to inventory page');
      } else {
        console.log('   ✗ Did not return to inventory page');
      }
      
      // Test forward button
      console.log('\n5. Testing browser forward button...');
      await page.goForward();
      await page.waitForLoadState('networkidle');
      const afterForwardUrl = page.url();
      console.log('   ✓ Forward button pressed, now at: ' + afterForwardUrl);
      
    } else {
      console.log('   ⚠️  No transaction links found on inventory page');
      
      // Manually navigate to a transaction page
      console.log('\n   Manually navigating to a transaction page...');
      await page.goto('http://localhost:3002/operations/transactions/test-id');
      await page.waitForLoadState('networkidle');
      const manualTransactionUrl = page.url();
      console.log('   Current URL: ' + manualTransactionUrl);
      
      // Test back button
      console.log('\n4. Testing browser back button from manual navigation...');
      await page.goBack();
      await page.waitForLoadState('networkidle');
      const afterManualBackUrl = page.url();
      console.log('   ✓ Back button pressed, now at: ' + afterManualBackUrl);
    }
    
    // Test breadcrumb navigation
    console.log('\n6. Testing breadcrumb navigation...');
    await page.goto('http://localhost:3002/operations/transactions/test-id');
    await page.waitForLoadState('networkidle');
    
    // Look for "Operations" in breadcrumb
    const operationsBreadcrumb = await page.$('nav a:has-text("Operations")');
    if (operationsBreadcrumb) {
      await operationsBreadcrumb.click();
      await page.waitForLoadState('networkidle');
      console.log('   ✓ Clicked "Operations" breadcrumb, now at: ' + page.url());
    } else {
      console.log('   ⚠️  "Operations" breadcrumb not found');
    }
    
    // Test navigation menu structure
    console.log('\n7. Testing navigation menu "Operations" section...');
    const operationsSection = await page.$('text=Operations');
    if (operationsSection) {
      console.log('   ✓ Found "Operations" section in navigation');
      
      // Look for sub-items
      const inventoryLink = await page.$('nav a:has-text("Inventory Ledger")');
      const receiveLink = await page.$('nav a:has-text("Receive Goods")');
      const shipLink = await page.$('nav a:has-text("Ship Goods")');
      
      console.log(`   ${inventoryLink ? '✓' : '✗'} Inventory Ledger link found`);
      console.log(`   ${receiveLink ? '✓' : '✗'} Receive Goods link found`);
      console.log(`   ${shipLink ? '✓' : '✗'} Ship Goods link found`);
    }
    
    console.log('\n✅ Transaction navigation test completed!');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error);
  } finally {
    await browser.close();
  }
}

testTransactionNavigation();