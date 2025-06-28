const puppeteer = require('puppeteer');

const pages = [
  '/',
  '/dashboard',
  '/operations/inventory',
  '/operations/receive',
  '/operations/shipment-planning',
  '/finance/reconciliation',
  '/config/products'
];

async function testPages() {
  console.log('Starting client-side error testing...\n');
  
  const browser = await puppeteer.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  let hasErrors = false;

  for (const page of pages) {
    console.log(`\n=== Testing ${page} ===`);
    
    const browserPage = await browser.newPage();
    
    // Collect console errors
    const errors = [];
    const warnings = [];
    const logs = [];
    
    browserPage.on('console', (msg) => {
      const type = msg.type();
      const text = msg.text();
      
      if (type === 'error') {
        errors.push(text);
      } else if (type === 'warning') {
        warnings.push(text);
      } else {
        logs.push({ type, text });
      }
    });
    
    // Catch page errors
    browserPage.on('pageerror', (error) => {
      errors.push(`Page error: ${error.message}`);
    });
    
    // Catch request failures
    browserPage.on('requestfailed', (request) => {
      errors.push(`Request failed: ${request.url()} - ${request.failure().errorText}`);
    });
    
    try {
      // Navigate to page
      const response = await browserPage.goto(`http://localhost:3002${page}`, {
        waitUntil: 'networkidle2',
        timeout: 30000
      });
      
      console.log(`Status: ${response.status()}`);
      
      // Wait a bit for any async errors
      await browserPage.waitForTimeout(2000);
      
      // Check if page has content
      const content = await browserPage.content();
      const hasContent = content.includes('body') && content.length > 500;
      console.log(`Has content: ${hasContent}`);
      
      // Report errors
      if (errors.length > 0) {
        hasErrors = true;
        console.log('\n❌ ERRORS:');
        errors.forEach(err => console.log(`  - ${err}`));
      }
      
      if (warnings.length > 0) {
        console.log('\n⚠️  WARNINGS:');
        warnings.forEach(warn => console.log(`  - ${warn}`));
      }
      
      // Take screenshot if errors
      if (errors.length > 0) {
        const screenshotPath = `/tmp/error-${page.replace(/\//g, '-')}.png`;
        await browserPage.screenshot({ path: screenshotPath, fullPage: true });
        console.log(`\nScreenshot saved: ${screenshotPath}`);
      }
      
    } catch (error) {
      hasErrors = true;
      console.log(`\n❌ Navigation error: ${error.message}`);
    }
    
    await browserPage.close();
  }
  
  await browser.close();
  
  console.log('\n\n=== SUMMARY ===');
  if (hasErrors) {
    console.log('❌ Errors found in one or more pages');
    process.exit(1);
  } else {
    console.log('✅ All pages loaded without client-side errors');
  }
}

testPages().catch(console.error);