const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 900 });
  
  try {
    console.log('Navigating to login page...');
    await page.goto('http://44.198.217.24:3000/auth/login', { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });
    
    // Fill in demo login form
    console.log('Filling demo login form...');
    await page.type('input[name="emailOrUsername"]', 'demo-admin', { delay: 50 });
    await page.type('input[name="password"]', 'SecureWarehouse2024!', { delay: 50 });
    
    // Submit the form
    console.log('Submitting login...');
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }),
      page.click('button[type="submit"]')
    ]);
    
    // Wait for dashboard to load
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Take dashboard screenshot
    const currentUrl = page.url();
    console.log('Current URL after login:', currentUrl);
    
    await page.screenshot({ path: 'wms-dashboard.png', fullPage: true });
    console.log('Dashboard screenshot saved as wms-dashboard.png');
    
    // Navigate to inventory
    await page.goto('http://44.198.217.24:3000/inventory', { 
      waitUntil: 'networkidle2',
      timeout: 15000 
    });
    await new Promise(resolve => setTimeout(resolve, 2000));
    await page.screenshot({ path: 'wms-inventory.png', fullPage: true });
    console.log('Inventory screenshot saved');
    
    // Navigate to customers
    await page.goto('http://44.198.217.24:3000/customers', { 
      waitUntil: 'networkidle2',
      timeout: 15000 
    });
    await new Promise(resolve => setTimeout(resolve, 2000));
    await page.screenshot({ path: 'wms-customers.png', fullPage: true });
    console.log('Customers screenshot saved');
    
  } catch (error) {
    console.error('Error:', error.message);
    await page.screenshot({ path: 'wms-error.png' });
  }
  
  await browser.close();
})();