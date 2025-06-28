const puppeteer = require('puppeteer');

const pages = [
  '/',
  '/dashboard',
  '/operations/inventory',
  '/operations/receive',
  '/operations/shipment-planning',
  '/operations/transactions',
  '/finance/reconciliation',
  '/finance/cost-ledger',
  '/finance/invoices',
  '/config/products',
  '/config/warehouses',
  '/config/cost-settings',
  '/admin/users',
  '/admin/settings',
  '/reports'
];

async function checkAllPages() {
  const browser = await puppeteer.launch({ 
    headless: false,
    devtools: true
  });
  
  for (const pagePath of pages) {
    console.log(`\n\n========== CHECKING ${pagePath} ==========`);
    
    const page = await browser.newPage();
    
    // Collect all console messages
    const consoleLogs = [];
    
    page.on('console', (msg) => {
      const type = msg.type();
      const text = msg.text();
      consoleLogs.push({ type, text });
    });
    
    page.on('pageerror', (error) => {
      consoleLogs.push({ type: 'pageerror', text: error.message });
    });
    
    try {
      await page.goto(`http://localhost:3002${pagePath}`, {
        waitUntil: 'domcontentloaded',
        timeout: 10000
      });
      
      // Wait a bit for any async errors
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Print all console logs
      console.log('\nCONSOLE LOGS:');
      if (consoleLogs.length === 0) {
        console.log('  No console logs');
      } else {
        consoleLogs.forEach(log => {
          console.log(`  [${log.type}] ${log.text}`);
        });
      }
      
    } catch (error) {
      console.log(`  ERROR: ${error.message}`);
    }
    
    await page.close();
  }
  
  await browser.close();
}

checkAllPages().catch(console.error);