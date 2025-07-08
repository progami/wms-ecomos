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
    
    // Click "Try Demo" button
    console.log('Clicking Try Demo button...');
    await page.click('button:has-text("Try Demo")');
    
    // Wait for demo setup and redirect
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Take dashboard screenshot
    const currentUrl = page.url();
    console.log('Current URL after demo login:', currentUrl);
    
    await page.screenshot({ path: 'wms-dashboard-demo.png', fullPage: true });
    console.log('Dashboard screenshot saved');
    
    // If we're still on login, try going directly to dashboard
    if (currentUrl.includes('login')) {
      console.log('Still on login, navigating directly to dashboard...');
      await page.goto('http://44.198.217.24:3000/dashboard', { 
        waitUntil: 'networkidle2',
        timeout: 15000 
      });
      await new Promise(resolve => setTimeout(resolve, 3000));
      await page.screenshot({ path: 'wms-dashboard-direct.png', fullPage: true });
      console.log('Direct dashboard screenshot saved');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
    await page.screenshot({ path: 'wms-error-demo.png' });
  }
  
  await browser.close();
})();