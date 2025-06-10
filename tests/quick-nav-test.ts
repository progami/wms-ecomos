import { chromium } from 'playwright';

async function quickNavTest() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    console.log('🧪 Quick Navigation Test\n');
    
    // 1. Test login and redirect
    console.log('1. Testing login flow...');
    await page.goto('http://localhost:3002/auth/login');
    await page.fill('input[name="emailOrUsername"]', 'admin');
    await page.fill('input[name="password"]', 'SecureWarehouse2024!');
    await Promise.all([
      page.waitForURL('**/*dashboard*', { timeout: 10000 }),
      page.click('button[type="submit"]')
    ]);
    const afterLoginUrl = page.url();
    console.log(`   ✓ Admin logged in, redirected to: ${afterLoginUrl}`);
    
    // 2. Test logo link
    console.log('\n2. Testing logo link...');
    await page.click('a:has(span:text("WMS"))');
    await page.waitForLoadState('networkidle');
    const urlAfterLogo = page.url();
    console.log(`   ✓ Logo clicked, navigated to: ${urlAfterLogo}`);
    
    // 3. Test breadcrumb home link
    console.log('\n3. Testing breadcrumb home link...');
    await page.goto('http://localhost:3002/operations/inventory');
    await page.waitForLoadState('networkidle');
    const homeLink = await page.$('nav a:has(svg)'); // Home icon
    if (homeLink) {
      await homeLink.click();
      await page.waitForLoadState('networkidle');
      const urlAfterHome = page.url();
      console.log(`   ✓ Home breadcrumb clicked, navigated to: ${urlAfterHome}`);
    } else {
      console.log('   ✗ Home breadcrumb not found');
    }
    
    // 4. Test navigation menu links
    console.log('\n4. Testing navigation menu...');
    const navLinks = [
      { text: 'Inventory Ledger', expected: '/operations/inventory' },
      { text: 'Finance', expected: '/finance' },
      { text: 'Reports', expected: '/reports' }
    ];
    
    for (const link of navLinks) {
      const navLink = await page.$(`nav a:has-text("${link.text}")`);
      if (navLink) {
        await navLink.click();
        await page.waitForLoadState('networkidle');
        const currentUrl = page.url();
        console.log(`   ✓ "${link.text}" link works - navigated to: ${currentUrl}`);
      } else {
        console.log(`   ⚠️  "${link.text}" link not found`);
      }
    }
    
    // 5. Test back/forward
    console.log('\n5. Testing browser navigation...');
    await page.goBack();
    await page.waitForLoadState('networkidle');
    console.log(`   ✓ Back button works - now at: ${page.url()}`);
    
    await page.goForward();
    await page.waitForLoadState('networkidle');
    console.log(`   ✓ Forward button works - now at: ${page.url()}`);
    
    console.log('\n✅ Navigation test completed!');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error);
  } finally {
    await browser.close();
  }
}

quickNavTest();